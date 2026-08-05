import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { verifyStaffSession } from "./staffAuth";
import { applyStockCounterDelta } from "./stockCounters";
import { recordStockHistory } from "./stockHistory";
import { allocateNextBarcode } from "./barcodeCounters";
import { parseDateStrToMs } from "./orders";
import { trackedQuery, todayStr } from "./lib/ioTracking";
import type { Id } from "./_generated/dataModel";

// Reusable product field validators matching the products schema
const productFieldsValidator = {
  name: v.string(),
  old_name: v.optional(v.string()),
  brand: v.optional(v.string()),
  size: v.optional(v.string()),
  color: v.optional(v.string()),
  slug: v.optional(v.string()),
  sku: v.optional(v.string()),
  barcode: v.string(), // Strictly required for any new incoming ERP products!
  weightGrams: v.optional(v.number()),
  dimensions: v.optional(
    v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      unit: v.string(),
    })
  ),
  price: v.optional(v.number()),
  wasPrice: v.optional(v.number()),
  originalPrice: v.number(),
  discountPrice: v.optional(v.number()),
  discountExpiry: v.optional(v.union(v.number(), v.string())),
  image: v.optional(v.string()),
  images: v.optional(v.array(v.string())),
  stage: v.optional(
    v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid"))
  ),
  tier: v.optional(
    v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries"))
  ),
  category: v.optional(v.string()),
  subCategory: v.optional(v.string()),
  targetGender: v.optional(
    v.union(v.literal("boy"), v.literal("girl"), v.literal("unisex"))
  ),
  material: v.optional(v.string()),
  pattern: v.optional(v.string()),
  isCurated: v.optional(v.boolean()),
  isMostLoved: v.optional(v.boolean()),
  isEssentials: v.optional(v.boolean()),
  isMustHave: v.optional(v.boolean()),
  isLuxury: v.optional(v.boolean()),
  isCuratedForYou: v.optional(v.boolean()),
  minMonth: v.optional(v.number()),
  maxMonth: v.optional(v.number()),
  minWeek: v.optional(v.number()),
  maxWeek: v.optional(v.number()),
  description: v.optional(v.string()),
  tags: v.optional(
    v.array(
      v.object({
        type: v.string(),
        text: v.string(),
      })
    )
  ),
  specifications: v.optional(
    v.array(
      v.object({
        label: v.string(),
        value: v.string(),
      })
    )
  ),
  isActive: v.optional(v.boolean()),
  inventory: v.optional(v.number()),
  unitsSold: v.optional(v.number()),
  actual_data: v.optional(v.boolean()),
};

/**
 * Idempotent upsert for a single product received from the ERP webhook.
 * Deduplicates using the unique `slug` field.
 */
export const upsertFromWebhook = internalMutation({
  args: productFieldsValidator,
  handler: async (ctx, args) => {
    return await upsertSingleProduct(ctx, args);
  },
});

/**
 * Idempotent batch upsert for an array of products received from the ERP webhook.
 * Processes everything within a single transaction for maximum performance and atomic updates.
 */
export const upsertBatchFromWebhook = internalMutation({
  args: {
    products: v.array(v.object(productFieldsValidator)),
  },
  handler: async (ctx, args) => {
    const results = [];
    for (const product of args.products) {
      const res = await upsertSingleProduct(ctx, product);
      results.push(res);
    }
    return results;
  },
});

// Helper function to convert product name to lowercase, URL-safe slug base
export function slugify(name: string): string {
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word characters except hyphens
    .replace(/\-\-+/g, "-")         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "")             // Trim hyphens from start
    .replace(/-+$/, "");            // Trim hyphens from end
}

// Helper function to handle individual product upsert logic
async function upsertSingleProduct(ctx: any, fields: any) {
  // 1. Check for duplicates by slug (if provided) or by barcode (strictly required for Phase 3)
  let existing = null;
  if (fields.slug) {
    existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q: any) => q.eq("slug", fields.slug))
      .unique();
  } else if (fields.barcode) {
    existing = await ctx.db
      .query("products")
      .withIndex("by_barcode", (q: any) => q.eq("barcode", fields.barcode))
      .unique();
  }

  // 2. Determine unique slug (Strategy B)
  let slug = "";
  if (existing) {
    // Keep existing slug for updates to preserve URLs/SEO
    slug = existing.slug;
  } else if (fields.slug) {
    slug = fields.slug;
  } else {
    // Generate clean base slug from name
    const baseSlug = slugify(fields.name);
    slug = baseSlug;
    let counter = 1;
    while (true) {
      const conflicting = await ctx.db
        .query("products")
        .withIndex("by_slug", (q: any) => q.eq("slug", slug))
        .unique();
      if (!conflicting) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Extract or parse discountExpiry
  let discountExpiryMs = undefined;
  if (fields.discountExpiry !== undefined) {
    if (typeof fields.discountExpiry === "number") {
      discountExpiryMs = fields.discountExpiry;
    } else if (typeof fields.discountExpiry === "string") {
      const parsed = Date.parse(fields.discountExpiry);
      if (!isNaN(parsed)) {
        discountExpiryMs = parsed;
      }
    }
  }

  const originalPrice = fields.originalPrice;

  // Infer price and wasPrice at write-time based on active discount status
  const hasExpiry = discountExpiryMs !== undefined && discountExpiryMs !== null;
  const isExpired = hasExpiry && discountExpiryMs <= Date.now();
  const isDiscountActive = fields.discountPrice !== undefined && !isExpired;

  const inferredPrice = isDiscountActive ? fields.discountPrice : originalPrice;
  const inferredWasPrice = isDiscountActive ? originalPrice : undefined;

  // 3. Map payload with safe defaults for missing optional fields matching the schema
  const brand = fields.brand ?? "Generic";
  const productFields = {
    name: fields.name,
    old_name: fields.old_name,
    brand,
    brandSlug: slugify(brand),
    size: fields.size,
    color: fields.color ?? "Default",
    slug,
    sku: fields.sku,
    barcode: fields.barcode, // REQUIRED
    weightGrams: fields.weightGrams,
    dimensions: fields.dimensions,
    price: inferredPrice,
    wasPrice: inferredWasPrice,
    originalPrice,
    discountPrice: fields.discountPrice,
    discountExpiry: discountExpiryMs,
    image: fields.image,
    images: fields.images,
    stage: fields.stage,
    tier: fields.tier,
    category: fields.category ?? "Feeding/Nursing Essentials",
    subCategory: fields.subCategory,
    targetGender: fields.targetGender,
    material: fields.material,
    pattern: fields.pattern,
    isCurated: fields.isCurated,
    isMostLoved: fields.isMostLoved,
    isEssentials: fields.isEssentials,
    isMustHave: fields.isMustHave,
    isLuxury: fields.isLuxury,
    isCuratedForYou: fields.isCuratedForYou,
    minMonth: fields.minMonth,
    maxMonth: fields.maxMonth,
    minWeek: fields.minWeek,
    maxWeek: fields.maxWeek,
    description: fields.description ?? "",
    tags: fields.tags ?? [],
    specifications: fields.specifications ?? [],
    isActive: fields.isActive ?? true,
    inventory: fields.inventory,
    unitsSold: fields.unitsSold,
    actual_data: fields.actual_data ?? true, // DEFAULTS TO TRUE FOR WEBHOOK UPLOADS
    updatedAt: Date.now(),
    searchText: computeSearchText({
      name: fields.name,
      brand,
      category: fields.category ?? "Feeding/Nursing Essentials",
      subCategory: fields.subCategory,
      description: fields.description ?? "",
      tags: fields.tags ?? [],
    }),
  };

  if (existing) {
    // 3. Update existing product
    await ctx.db.patch(existing._id, productFields);
    await applyStockCounterDelta(
      ctx,
      { inventory: existing.inventory, reorderPoint: existing.reorderPoint },
      { inventory: productFields.inventory ?? existing.inventory, reorderPoint: existing.reorderPoint },
      existing._id
    );
    console.log(`[convex/products.ts] Batch Product updated: ${slug} (${existing._id})`);
    return { id: existing._id, status: "updated", slug };
  } else {
    // 4. Create new product
    const newId = await ctx.db.insert("products", productFields);
    await applyStockCounterDelta(ctx, null, {
      inventory: productFields.inventory,
      reorderPoint: undefined,
    });
    console.log(`[convex/products.ts] Batch Product created: ${slug} (${newId})`);
    return { id: newId, status: "created", slug };
  }
}

export const ONLY_FETCH_ACTUAL_DATA = true;

export function computeSearchText(fields: {
  name?: string;
  brand?: string;
  category?: string;
  subCategory?: string;
  description?: string;
  tags?: Array<{ text?: string; type?: string }>;
}): string {
  const parts = [
    fields.name || "",
    fields.brand || "",
    fields.category || "",
    fields.subCategory || "",
    fields.description || "",
    fields.tags?.map((t) => t?.text || "").join(" ") || "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function shouldKeepProduct(product: any, includeStoreOnly: boolean = false): boolean {
  if (!product) return false;
  if (ONLY_FETCH_ACTUAL_DATA && product.actual_data !== true) {
    return false;
  }
  if (!includeStoreOnly) {
    const isStoreOnly = product.specifications?.some(
      (spec: any) => spec.label === "for-store-only" && spec.value === "true"
    );
    if (isStoreOnly) {
      return false;
    }
  }
  return true;
}

// Centrally resolves active product selling price at runtime
export function normalizeProductPrice(product: any): any {
  if (!product) return product;
  const now = Date.now();
  const hasExpiry = product.discountExpiry !== undefined && product.discountExpiry !== null;
  const isExpired = hasExpiry && product.discountExpiry <= now;

  const prices = [product.price, product.wasPrice, product.originalPrice, product.discountPrice].filter(
    (v): v is number => typeof v === "number" && v > 0
  );

  if (prices.length === 0) return product;

  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);

  if (lowestPrice < highestPrice && !isExpired) {
    return {
      ...product,
      price: lowestPrice,
      wasPrice: highestPrice,
    };
  }
  return {
    ...product,
    price: highestPrice,
    wasPrice: undefined,
  };
}

export const getProductReviews = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("productReviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    return reviews.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const addReview = mutation({
  args: {
    productId: v.id("products"),
    author: v.string(),
    rating: v.number(),
    childAge: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    if (!args.author.trim()) {
      throw new Error("Author name is required");
    }
    if (!args.text.trim()) {
      throw new Error("Review text is required");
    }

    const reviewId = await ctx.db.insert("productReviews", {
      productId: args.productId,
      author: args.author.trim(),
      rating: args.rating,
      childAge: args.childAge?.trim() || undefined,
      text: args.text.trim(),
    });

    return { success: true, reviewId };
  },
});

// Paginated: the catalog is large enough (5000+ rows) that a single
// .collect() over the whole table exceeds Convex's per-execution read
// limit. Callers (useOfflineProducts.js) loop pages until isDone.
export const getProductsForPOS = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const result = await ctx.db
      .query("products")
      .paginate(args.paginationOpts);

    return {
      ...result,
      // Return only active and kept products
      page: result.page
        .filter((p) => p.isActive && shouldKeepProduct(p, true))
        .map(normalizeProductPrice),
    };
  },
});

/**
 * Incremental sync for the offline POS product cache. The full catalog is
 * only ever pulled once per device via getProductsForPOS (a one-time
 * bootstrap) - every sync after that asks for changes only, so payload size
 * scales with how much actually changed, not with catalog size. Paginated
 * for the same per-execution read-limit reason as getProductsForPOS -
 * callers loop pages until isDone.
 *
 * Each row is tagged `keep: false` when it should be evicted from the local
 * cache (inactive/filtered out) rather than upserted, so the client doesn't
 * need to duplicate shouldKeepProduct's filtering logic.
 */
export const getProductsUpdatedSince = query({
  args: {
    token: v.string(),
    since: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const result = await ctx.db
      .query("products")
      .withIndex("by_updatedAt", (q) => q.gt("updatedAt", args.since))
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((p) => ({
        ...normalizeProductPrice(p),
        keep: p.isActive && shouldKeepProduct(p, true),
      })),
    };
  },
});

/**
 * Paginated product listing for a single brand, driving BrandPage.jsx's grid.
 * Uses by_brand_and_category when a category filter is given (indexed, no
 * scan) or plain by_brand otherwise. Tier has only 3 possible values so it's
 * filtered in-memory on the already-bounded page rather than via its own
 * compound index.
 */
export const getProductsByBrand = query({
  args: {
    brand: v.string(),
    category: v.optional(v.string()),
    tier: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = args.category
      ? await ctx.db
          .query("products")
          .withIndex("by_brand_and_category", (q) =>
            q.eq("brand", args.brand).eq("category", args.category as any)
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("products")
          .withIndex("by_brand", (q) => q.eq("brand", args.brand))
          .paginate(args.paginationOpts);

    let page = result.page.filter((p) => p.isActive !== false && shouldKeepProduct(p));
    if (args.tier) {
      page = page.filter((p) => p.tier === args.tier);
    }

    return {
      ...result,
      page: page.map(normalizeProductPrice),
    };
  },
});

function toStockRow(p: any, isProductEditor = false) {
  if (isProductEditor) {
    return {
      id: p._id,
      name: p.name,
      old_name: p.old_name,
      sku: p.sku,
      barcode: p.barcode,
      price: p.price ?? 0,
      costPrice: p.costPrice ?? 0,
      category: p.category,
      brand: p.brand,
      isActive: p.isActive,
    };
  }
  return {
    id: p._id,
    name: p.name,
    old_name: p.old_name,
    sku: p.sku,
    barcode: p.barcode,
    price: p.price ?? 0,
    inventory: p.inventory ?? 0,
    unitsSold: p.unitsSold ?? 0,
    costPrice: p.costPrice ?? 0,
    reorderPoint: p.reorderPoint ?? 0,
  };
}

/**
 * Browse-mode stock listing — a bounded page at a time, never the full
 * ~4000-row products table in one call.
 */
export const getStockList = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);
    const isProductEditor = user.accountRole === "productEditor";

    const result = await ctx.db
      .query("products")
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.filter((p) => shouldKeepProduct(p, true)).map((p) => toStockRow(p, isProductEditor)),
    };
  },
});

/**
 * Search-mode stock listing — merges bounded results from the name search
 * index plus prefix-range lookups on barcode/sku, capped at SEARCH_CAP total.
 * Not paginated (small capped result set), used only when a search term is
 * present; browse mode above is used otherwise.
 */
export const searchStockList = query({
  args: {
    token: v.string(),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);
    const isProductEditor = user.accountRole === "productEditor";

    const term = args.searchTerm.trim();
    if (!term) return [];

    const SEARCH_CAP = 100;
    const upperBound = term + "\uFFFF";

    const [byName, byBarcode, bySku] = await Promise.all([
      ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", term))
        .take(SEARCH_CAP),
      ctx.db
        .query("products")
        .withIndex("by_barcode", (q) => q.gte("barcode", term).lt("barcode", upperBound))
        .take(SEARCH_CAP),
      ctx.db
        .query("products")
        .withIndex("by_sku", (q) => q.gte("sku", term).lt("sku", upperBound))
        .take(SEARCH_CAP),
    ]);

    const merged = new Map<string, any>();
    for (const p of [...byName, ...byBarcode, ...bySku]) {
      if (shouldKeepProduct(p, true)) merged.set(p._id.toString(), p);
    }

    return Array.from(merged.values()).slice(0, SEARCH_CAP).map((p) => toStockRow(p, isProductEditor));
  },
});

// Order statuses counted as completed sales for period-based reporting.
const SALES_COMPLETED_STATUSES = ["delivered", "returned", "partially_returned"];
// Hard cap on orders scanned per date-range aggregation, matching the CSV export's cap.
const SALES_RANGE_ORDER_CAP = 2000;

/**
 * Scans orders in [rangeStartMs, rangeEndMs) (capped) and aggregates completed
 * order-item quantities per product. Shared by getProductSalesInRange and
 * getProductSalesRangeSummary so both stay consistent.
 */
async function aggregateProductSalesInRange(ctx: any, rangeStartMs: number, rangeEndMs: number) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_createdAt", (q: any) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
    .order("desc")
    .take(SALES_RANGE_ORDER_CAP + 1);

  const truncated = orders.length > SALES_RANGE_ORDER_CAP;
  const ordersToScan = truncated ? orders.slice(0, SALES_RANGE_ORDER_CAP) : orders;
  const completedOrders = ordersToScan.filter((o: any) => SALES_COMPLETED_STATUSES.includes(o.status));

  const quantityByProduct = new Map<string, number>();
  for (const order of completedOrders) {
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q: any) => q.eq("orderId", order._id))
      .collect();
    for (const item of items) {
      const key = item.productId.toString();
      quantityByProduct.set(key, (quantityByProduct.get(key) ?? 0) + item.quantity);
    }
  }

  const sortedAgg = Array.from(quantityByProduct.entries())
    .map(([productId, quantitySoldInRange]) => ({ productId, quantitySoldInRange }))
    .sort((a, b) => b.quantitySoldInRange - a.quantitySoldInRange || a.productId.localeCompare(b.productId));

  return { truncated, cap: SALES_RANGE_ORDER_CAP, sortedAgg };
}

function dateRangeToMs(startDate: string, endDate: string) {
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeStartMs = parseDateStrToMs(startDate);
  const rangeEndMs = parseDateStrToMs(endDate) + dayMs;
  return { rangeStartMs, rangeEndMs };
}

/**
 * Paginated report of products sold within a date range, with units sold in
 * range and current (live) inventory remaining. Aggregates in-memory (order
 * scan is capped) then manually paginates the sorted result using a
 * stringified offset cursor, matching Convex's {page, isDone, continueCursor}
 * pagination contract so usePaginatedQuery works unmodified.
 */
export const getProductSalesInRange = query({
  args: {
    token: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    // Stock Managers only ever see today's sales, regardless of what range
    // the client requests — enforced here, not just hidden in the UI.
    const today = todayStr();
    const startDate = user.accountRole === "stockManager" ? today : args.startDate;
    const endDate = user.accountRole === "stockManager" ? today : args.endDate;

    const { rangeStartMs, rangeEndMs } = dateRangeToMs(startDate, endDate);
    const { sortedAgg } = await aggregateProductSalesInRange(ctx, rangeStartMs, rangeEndMs);

    const offset = args.paginationOpts.cursor ? parseInt(args.paginationOpts.cursor, 10) : 0;
    const pageSlice = sortedAgg.slice(offset, offset + args.paginationOpts.numItems);
    const nextOffset = offset + pageSlice.length;
    const isDone = nextOffset >= sortedAgg.length;

    const page = await Promise.all(
      pageSlice.map(async (row) => {
        const product = await ctx.db.get(row.productId as any);
        return {
          productId: row.productId,
          name: product?.name ?? "Unknown Product",
          sku: product?.sku,
          barcode: product?.barcode,
          inventory: product?.inventory ?? 0,
          quantitySoldInRange: row.quantitySoldInRange,
        };
      })
    );

    return {
      page,
      isDone,
      continueCursor: String(nextOffset),
    };
  },
});

/**
 * Summary stats (total products/units sold + truncation warning) for the
 * same date range as getProductSalesInRange, queried separately so the
 * paginated query's response shape stays a plain Convex pagination result.
 */
export const getProductSalesRangeSummary = query({
  args: {
    token: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    // Stock Managers only ever see today's sales, regardless of what range
    // the client requests — enforced here, not just hidden in the UI.
    const today = todayStr();
    const startDate = user.accountRole === "stockManager" ? today : args.startDate;
    const endDate = user.accountRole === "stockManager" ? today : args.endDate;

    const { rangeStartMs, rangeEndMs } = dateRangeToMs(startDate, endDate);
    const { truncated, cap, sortedAgg } = await aggregateProductSalesInRange(ctx, rangeStartMs, rangeEndMs);

    return {
      truncated,
      cap,
      productCount: sortedAgg.length,
      totalUnitsSold: sortedAgg.reduce((sum, r) => sum + r.quantitySoldInRange, 0),
    };
  },
});

/**
 * Drill-down query for the Stock Report modal: given a specific productId and
 * the same date range used by the report, returns the individual completed
 * orders that contain that product, together with customer name, channel,
 * grand total and quantity of that product purchased.
 *
 * Gated with "skip" on the client so it only fires when a row is clicked —
 * zero cost unless the user actively drills into a product.
 */
export const getProductOrdersInRange = query({
  args: {
    token: v.string(),
    productId: v.id("products"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    // Enforce the same date-range restrictions as the parent report.
    const today = todayStr();
    const startDate = user.accountRole === "stockManager" ? today : args.startDate;
    const endDate   = user.accountRole === "stockManager" ? today : args.endDate;

    const { rangeStartMs, rangeEndMs } = dateRangeToMs(startDate, endDate);

    // Walk orders in date range using the existing by_createdAt index.
    // Cap matches SALES_RANGE_ORDER_CAP so results are consistent with the report.
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs)
      )
      .order("desc")
      .take(SALES_RANGE_ORDER_CAP);

    const completedOrders = orders.filter((o: any) =>
      SALES_COMPLETED_STATUSES.includes(o.status)
    );

    const distinctUserIds = Array.from(
      new Set(completedOrders.map((o: any) => o.userId).filter(Boolean))
    );
    const users = await Promise.all(distinctUserIds.map((id: any) => ctx.db.get(id)));
    const nameByUserId = new Map<string, string>();
    distinctUserIds.forEach((id: any, idx: number) => {
      const u = users[idx] as any;
      if (u?.name) nameByUserId.set(id.toString(), u.name);
    });

    const rows: Array<{
      orderId: string;
      customerName: string;
      channel: string;
      status: string;
      grandTotal: number;
      createdAt: number;
      quantityOfProduct: number;
    }> = [];

    for (const order of completedOrders) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q: any) => q.eq("orderId", order._id))
        .collect();

      const matchingItems = items.filter(
        (i: any) => i.productId.toString() === args.productId.toString()
      );
      if (matchingItems.length === 0) continue;

      const customerName =
        order.deliveryAddress?.name ||
        (order.userId ? nameByUserId.get(order.userId.toString()) : null) ||
        "Walk-in Customer";

      const qty = matchingItems.reduce((s: number, i: any) => s + i.quantity, 0);
      rows.push({
        orderId: order._id.toString(),
        customerName,
        channel: order.channel ?? "walk_in",
        status: order.status,
        grandTotal: order.grandTotal,
        createdAt: order.createdAt,
        quantityOfProduct: qty,
      });
    }

    // Already desc-sorted by createdAt from the DB query above.
    return rows;
  },
});

/**
 * Core inventory-mutation logic shared by `adjustStock` (direct admin/stock-
 * manager increases, and admin decreases) and `stockRequests.approveStockRequestItem`
 * (applying a stock manager's admin-approved decrease). Propagates the delta
 * to every product sharing the same barcode and keeps stock counters in sync.
 */
export async function applyInventoryDelta(
  ctx: MutationCtx,
  productId: Id<"products">,
  delta: number,
  actor?: {
    actorId?: Id<"users">;
    actorName: string;
    source: StockHistorySource;
    note?: string;
    reasonCode?: string;
  }
) {
  const product = await ctx.db.get(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const currentInventory = product.inventory ?? 0;
  const newInventory = currentInventory + delta;
  if (newInventory < 0) {
    throw new Error(`Inventory cannot be negative (current: ${currentInventory}, delta: ${delta})`);
  }

  const productsToUpdate = [product];
  if (product.barcode) {
    const matchingProducts = await ctx.db
      .query("products")
      .withIndex("by_barcode", (q: any) => q.eq("barcode", product.barcode))
      .collect();
    const seenIds = new Set([product._id]);
    for (const p of matchingProducts) {
      if (!seenIds.has(p._id)) {
        seenIds.add(p._id);
        productsToUpdate.push(p);
      }
    }
  }

  for (const pToUpdate of productsToUpdate) {
    const currentInv = pToUpdate.inventory ?? 0;
    const newInv = Math.max(0, currentInv + delta);
    await ctx.db.patch(pToUpdate._id, {
      inventory: newInv,
      updatedAt: Date.now(),
    });
    await applyStockCounterDelta(
      ctx,
      { inventory: currentInv, reorderPoint: pToUpdate.reorderPoint },
      { inventory: newInv, reorderPoint: pToUpdate.reorderPoint },
      pToUpdate._id
    );
    if (actor) {
      await recordStockHistory(ctx, {
        productId: pToUpdate._id,
        productName: pToUpdate.name,
        barcode: pToUpdate.barcode,
        before: currentInv,
        after: newInv,
        source: actor.source,
        reasonCode: actor.reasonCode,
        actorId: actor.actorId,
        actorName: actor.actorName,
        note: actor.note,
      });
    }
  }

  return { success: true, newInventory: Math.max(0, newInventory) };
}

export const adjustStock = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    delta: v.number(),
    reasonCode: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    if (args.delta < 0 && user.accountRole !== "admin") {
      throw new Error(
        "Inventory decreases by Stock Managers require admin approval. Use the staged-decrease flow instead."
      );
    }

    return applyInventoryDelta(ctx, args.productId, args.delta, {
      actorId: user._id,
      actorName: user.name,
      source: "manual_adjust",
      reasonCode: args.reasonCode,
      note: args.note,
    });
  },
});


export const setDiscount = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    discountPrice: v.number(),
    discountExpiry: v.number(), // Unix timestamp (ms)
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const originalPrice = product.originalPrice ?? product.price;
    const now = Date.now();
    const isDiscountActive = args.discountPrice > 0 && args.discountExpiry > now;
    const price = isDiscountActive ? args.discountPrice : originalPrice;
    const wasPrice = isDiscountActive ? originalPrice : undefined;

    await ctx.db.patch(args.productId, {
      discountPrice: args.discountPrice,
      discountExpiry: args.discountExpiry,
      price,
      wasPrice,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getDiscountList = trackedQuery("products.getDiscountList", {
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    // Indexed range query on discountPrice > 0 instead of a full table scan
    // -- skips every non-discounted product index-side.
    const products = await ctx.db
      .query("products")
      .withIndex("by_discountPrice", (q) => q.gt("discountPrice", 0))
      .collect();

    // Filter to keep only those with an active or pending discount
    const now = Date.now();
    return products
      .filter((p) => shouldKeepProduct(p, true))
      .filter(
        (p) =>
          p.discountPrice !== undefined &&
          p.discountPrice > 0 &&
          (p.discountExpiry === undefined || p.discountExpiry > now)
      );
  },
});

// ─── Admin Product Editing ─────────────────────────────────────────────────

declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Generates a Cloudinary signed-upload payload so the browser can upload
 * an image directly to Cloudinary without the API secret ever leaving the server.
 */
export const generateCloudinarySignature = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!apiSecret || !apiKey || !cloudName) {
      throw new Error("Cloudinary is not configured on the server.");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `timestamp=${timestamp}`;
    const msgBuffer = new TextEncoder().encode(paramsToSign + apiSecret);
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return { signature, timestamp, apiKey, cloudName };
  },
});

/**
 * Returns the full product document for the admin "Edit Product" page.
 */
export const getProductDetail = query({
  args: {
    token: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    if (user.accountRole === "productEditor") {
      const { inventory, storeStock, warehouseStock, reorderPoint, ...rest } = product as any;
      return rest;
    }
    return product;
  },
});

/**
 * Patches editable product details from the admin "Edit Product" page.
 * `barcode` is intentionally not accepted here - it is locked and can never
 * be changed through this mutation.
 */
export const updateProduct = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    originalPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    category: v.optional(
      v.union(
        v.literal("Expectant and New Mom Essentials"),
        v.literal("Newborn Essentials & Kids Apparel/Footwear"),
        v.literal("Nursery and Furnishing"),
        v.literal("Feeding/Nursing Essentials"),
        v.literal("Bathing and Changing"),
        v.literal("Baby Play and Safety Gear"),
        v.literal("Travel Must-Haves")
      )
    ),
    subCategory: v.optional(v.string()),
    stage: v.optional(v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid"))),
    tier: v.optional(v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries"))),
    size: v.optional(v.string()),
    color: v.optional(v.string()),
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),
    targetGender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unisex"))),
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isStoreOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);

    const { token, productId, isStoreOnly, ...fields } = args;
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (user.accountRole === "stockManager" && fields.name !== undefined && fields.name !== product.name) {
      throw new Error(
        "Stock managers cannot rename an existing product directly. Submit a name change request for admin approval instead."
      );
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    if ("brand" in patch) {
      patch.brandSlug = slugify(patch.brand as string);
    }

    let currentSpecs = product.specifications || [];
    if (isStoreOnly !== undefined) {
      if (isStoreOnly) {
        if (!currentSpecs.some((s) => s.label === "for-store-only" && s.value === "true")) {
          currentSpecs = [...currentSpecs, { label: "for-store-only", value: "true" }];
        }
      } else {
        currentSpecs = currentSpecs.filter((s) => !(s.label === "for-store-only" && s.value === "true"));
      }
      patch.specifications = currentSpecs;
    }

    const resultingIsStoreOnly = isStoreOnly !== undefined
      ? isStoreOnly
      : currentSpecs.some((s) => s.label === "for-store-only" && s.value === "true");

    const resultingImage = "image" in patch ? (patch.image as string | undefined) : product.image;
    if (!resultingIsStoreOnly && !resultingImage) {
      throw new Error("Customer-facing products require a primary image before they can be made customer-facing.");
    }

    const resultingIsActive = "isActive" in patch ? (patch.isActive as boolean) : product.isActive;
    if (resultingIsActive && !resultingIsStoreOnly && !resultingImage) {
      throw new Error("Customer-facing products require a primary image before they can be made active.");
    }

    const beforeInv = product.inventory ?? 0;
    const afterInv = "inventory" in patch ? (patch.inventory as number) : beforeInv;

    await ctx.db.patch(productId, { ...patch, updatedAt: Date.now() });

    if ("inventory" in patch || "reorderPoint" in patch) {
      await applyStockCounterDelta(
        ctx,
        { inventory: beforeInv, reorderPoint: product.reorderPoint },
        { inventory: afterInv, reorderPoint: ("reorderPoint" in patch ? patch.reorderPoint : product.reorderPoint) as number | undefined },
        productId
      );
    }

    if ("inventory" in patch && beforeInv !== afterInv) {
      await recordStockHistory(ctx, {
        productId,
        productName: (patch.name as string) || product.name,
        barcode: product.barcode,
        before: beforeInv,
        after: afterInv,
        source: "direct_admin_edit",
        reasonCode: "DIRECT_ADMIN_EDIT",
        actorId: user._id,
        actorName: user.name || "Admin",
        unitCost: (patch.costPrice as number | undefined) ?? product.costPrice,
        note: "Direct inventory patch via admin product editor",
      });
    }

    return { success: true };
  },
});

/**
 * Creates a brand new product from the admin "Create Product" page.
 * Unlike updateProduct, barcode is required here and checked for uniqueness -
 * this is the primary manual-entry path, so duplicate barcodes are rejected
 * outright rather than tolerated the way ERP ingestion tolerates them.
 */
export async function executeCreateProduct(ctx: any, args: {
  name: string;
  brand?: string;
  description?: string;
  originalPrice: number;
  price?: number;
  category?: "Expectant and New Mom Essentials" | "Newborn Essentials & Kids Apparel/Footwear" | "Nursery and Furnishing" | "Feeding/Nursing Essentials" | "Bathing and Changing" | "Baby Play and Safety Gear" | "Travel Must-Haves";
  stage?: "mother" | "newborn" | "kid";
  tier?: "essentials" | "musthaves" | "luxuries";
  targetGender?: "boy" | "girl" | "unisex";
  subCategory?: string;
  size?: string;
  color?: string;
  material?: string;
  pattern?: string;
  costPrice?: number;
  reorderPoint?: number;
  image?: string;
  images?: string[];
  minMonth?: number;
  maxMonth?: number;
  isActive: boolean;
  isStoreOnly: boolean;
  initialInventory?: number;
}) {
  if (args.isActive && !args.isStoreOnly && !args.image) {
    throw new Error("Customer-facing products require a primary image before they can be made active.");
  }
  if (args.isActive && !args.isStoreOnly && !args.description?.trim()) {
    throw new Error("Customer-facing products require a description before they can be made active.");
  }

  const baseSlug = slugify(args.name);
  let slug = baseSlug;
  let counter = 1;
  while (
    await ctx.db
      .query("products")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .unique()
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const specifications = args.isStoreOnly
    ? [{ label: "for-store-only", value: "true" }]
    : [];

  let barcode = await allocateNextBarcode(ctx);
  while (
    await ctx.db
      .query("products")
      .withIndex("by_barcode", (q: any) => q.eq("barcode", barcode))
      .unique()
  ) {
    barcode = await allocateNextBarcode(ctx);
  }

  const brand = args.brand?.trim() || "no-brand";
  const initialInventory = Math.max(0, args.initialInventory ?? 0);
  const productId = await ctx.db.insert("products", {
    name: args.name,
    brand,
    brandSlug: slugify(brand),
    barcode,
    slug,
    description: args.description?.trim() || "no-description",
    originalPrice: args.originalPrice,
    price: args.price ?? args.originalPrice,
    category: args.category,
    stage: args.stage,
    tier: args.tier,
    targetGender: args.targetGender,
    subCategory: args.subCategory,
    size: args.size,
    color: args.color,
    material: args.material,
    pattern: args.pattern,
    costPrice: args.costPrice,
    reorderPoint: args.reorderPoint,
    image: args.image,
    images: args.images ?? [],
    minMonth: args.minMonth,
    maxMonth: args.maxMonth,
    isActive: args.isActive,
    actual_data: true,
    tags: [],
    specifications,
    inventory: initialInventory,
    unitsSold: 0,
    updatedAt: Date.now(),
  });

  await applyStockCounterDelta(ctx, null, { inventory: initialInventory, reorderPoint: args.reorderPoint });

  return { success: true, productId, barcode };
}

export async function executeBulkCreateStoreOnlyProducts(
  ctx: any,
  rows: Array<{
    name: string;
    brand?: string;
    color?: string;
    quantity?: number;
    price: number;
    costPrice?: number;
    barcode?: string;
    category?: string;
    stage?: string;
    tier?: string;
    description?: string;
    image?: string;
  }>,
  actor?: { actorId?: Id<"users">; actorName: string }
) {
  const results: Array<{
    row: number;
    success: boolean;
    outcome: "created" | "updated" | "rejected_would_reduce" | "error";
    productId?: string;
    barcode?: string;
    name?: string;
    price?: number;
    error?: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.name?.trim()) throw new Error("Name is required");
      if (!(row.price > 0)) throw new Error("Price must be greater than 0");
      if (row.quantity !== undefined && row.quantity < 0) {
        throw new Error("Quantity cannot be negative");
      }
      if (row.costPrice !== undefined && row.costPrice >= row.price) {
        throw new Error("Cost price must be less than price");
      }

      const trimmedBarcode = row.barcode?.trim();
      const existing = trimmedBarcode
        ? await ctx.db
            .query("products")
            .withIndex("by_barcode", (q: any) => q.eq("barcode", trimmedBarcode))
            .unique()
        : null;

      if (existing) {
        const existingInventory = existing.inventory ?? 0;
        if (row.quantity !== undefined && row.quantity < existingInventory) {
          results.push({
            row: i,
            success: false,
            outcome: "rejected_would_reduce",
            barcode: trimmedBarcode,
            name: row.name.trim(),
            error: `Row quantity (${row.quantity}) is less than current inventory (${existingInventory}) for barcode ${trimmedBarcode} — decreases are not allowed via bulk import.`,
          });
          continue;
        }

        const newInventory = row.quantity !== undefined ? row.quantity : existingInventory;
        const brand = row.brand?.trim() || existing.brand;
        await ctx.db.patch(existing._id, {
          price: row.price,
          originalPrice: row.price,
          costPrice: row.costPrice ?? existing.costPrice,
          color: row.color?.trim() || existing.color,
          brand,
          brandSlug: slugify(brand),
          inventory: newInventory,
          category: row.category?.trim() || existing.category,
          stage: row.stage?.trim() || existing.stage,
          tier: row.tier?.trim() || existing.tier,
          description: row.description?.trim() || existing.description,
          image: row.image?.trim() || existing.image,
          updatedAt: Date.now(),
        });
        await applyStockCounterDelta(
          ctx,
          { inventory: existingInventory, reorderPoint: existing.reorderPoint },
          { inventory: newInventory, reorderPoint: existing.reorderPoint },
          existing._id
        );
        if (actor) {
          await recordStockHistory(ctx, {
            productId: existing._id,
            productName: row.name.trim(),
            barcode: trimmedBarcode,
            before: existingInventory,
            after: newInventory,
            source: "bulk_upload",
            actorId: actor.actorId,
            actorName: actor.actorName,
          });
        }

        results.push({
          row: i,
          success: true,
          outcome: "updated",
          productId: existing._id,
          barcode: trimmedBarcode,
          name: row.name.trim(),
          price: row.price,
        });
        continue;
      }

      const baseSlug = slugify(row.name);
      let slug = baseSlug;
      let slugCounter = 1;
      while (
        await ctx.db
          .query("products")
          .withIndex("by_slug", (q: any) => q.eq("slug", slug))
          .unique()
      ) {
        slug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
      }

      let barcode = trimmedBarcode;
      if (!barcode) {
        barcode = await allocateNextBarcode(ctx);
        while (
          await ctx.db
            .query("products")
            .withIndex("by_barcode", (q: any) => q.eq("barcode", barcode!))
            .unique()
        ) {
          barcode = await allocateNextBarcode(ctx);
        }
      }

      const hasAllRequiredCreationFields = Boolean(
        row.name?.trim() &&
        row.price > 0 &&
        row.category?.trim() &&
        row.stage?.trim() &&
        row.tier?.trim() &&
        row.description?.trim() &&
        row.image?.trim()
      );

      const specifications = hasAllRequiredCreationFields
        ? []
        : [{ label: "for-store-only", value: "true" }];

      const inventory = Math.max(0, row.quantity ?? 0);
      const brand = row.brand?.trim() || "no-brand";
      const productId = await ctx.db.insert("products", {
        name: row.name.trim(),
        brand,
        brandSlug: slugify(brand),
        barcode,
        slug,
        description: row.description?.trim() || "no-description",
        originalPrice: row.price,
        price: row.price,
        costPrice: row.costPrice,
        color: row.color?.trim() || undefined,
        category: row.category?.trim() || undefined,
        stage: row.stage?.trim() as any || undefined,
        tier: row.tier?.trim() as any || undefined,
        image: row.image?.trim() || undefined,
        isActive: true,
        actual_data: true,
        tags: [],
        specifications,
        inventory,
        unitsSold: 0,
        updatedAt: Date.now(),
        searchText: computeSearchText({
          name: row.name.trim(),
          brand,
          category: row.category?.trim(),
          description: row.description?.trim(),
        }),
      });

      await applyStockCounterDelta(ctx, null, { inventory, reorderPoint: undefined });
      if (actor && inventory > 0) {
        await recordStockHistory(ctx, {
          productId,
          productName: row.name.trim(),
          barcode,
          before: 0,
          after: inventory,
          source: "bulk_upload",
          actorId: actor.actorId,
          actorName: actor.actorName,
          note: "New product created via bulk upload",
        });
      }
      results.push({ row: i, success: true, outcome: "created", productId, barcode, name: row.name.trim(), price: row.price });
    } catch (err: any) {
      results.push({ row: i, success: false, outcome: "error", error: err.message });
    }
  }

  return results;
}

/**
 * Creates a product in the catalog. Directly accessible only by admins;
 * stock managers submit create_product requests via stockRequests.
 */
export const createProduct = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    originalPrice: v.number(),
    price: v.optional(v.number()),
    category: v.union(
      v.literal("Expectant and New Mom Essentials"),
      v.literal("Newborn Essentials & Kids Apparel/Footwear"),
      v.literal("Nursery and Furnishing"),
      v.literal("Feeding/Nursing Essentials"),
      v.literal("Bathing and Changing"),
      v.literal("Baby Play and Safety Gear"),
      v.literal("Travel Must-Haves")
    ),
    stage: v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid")),
    tier: v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries")),
    targetGender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unisex"))),
    subCategory: v.optional(v.string()),
    size: v.optional(v.string()),
    color: v.optional(v.string()),
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    isActive: v.boolean(),
    isStoreOnly: v.boolean(),
    initialInventory: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "productEditor"]);
    const createArgs = user.accountRole === "productEditor" ? { ...args, initialInventory: 0 } : args;
    return await executeCreateProduct(ctx, createArgs);
  },
});

/**
 * Bulk-creates "back store" products from an xlsx upload. Directly accessible
 * by admins and product editors.
 */
export const bulkCreateStoreOnlyProducts = mutation({
  args: {
    token: v.string(),
    rows: v.array(
      v.object({
        name: v.string(),
        brand: v.optional(v.string()),
        color: v.optional(v.string()),
        quantity: v.optional(v.number()),
        price: v.number(),
        costPrice: v.optional(v.number()),
        barcode: v.optional(v.string()),
        category: v.optional(v.string()),
        stage: v.optional(v.string()),
        tier: v.optional(v.string()),
        description: v.optional(v.string()),
        image: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "productEditor"]);
    const rows = user.accountRole === "productEditor"
      ? args.rows.map((r) => ({ ...r, quantity: 0 }))
      : args.rows;
    return await executeBulkCreateStoreOnlyProducts(ctx, rows, { actorId: user._id, actorName: user.name });
  },
});
