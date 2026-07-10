import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { verifyStaffSession } from "./staffAuth";
import { applyStockCounterDelta } from "./stockCounters";
import { allocateNextBarcode } from "./barcodeCounters";
import { parseDateStrToMs } from "./orders";

// Reusable product field validators matching the products schema
const productFieldsValidator = {
  name: v.string(),
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
  const productFields = {
    name: fields.name,
    brand: fields.brand ?? "Generic",
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
  };

  if (existing) {
    // 3. Update existing product
    await ctx.db.patch(existing._id, productFields);
    await applyStockCounterDelta(
      ctx,
      { inventory: existing.inventory, reorderPoint: existing.reorderPoint },
      { inventory: productFields.inventory ?? existing.inventory, reorderPoint: existing.reorderPoint }
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

export const getProductsForPOS = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const products = await ctx.db
      .query("products")
      .collect();

    // Return only active and kept products
    return products
      .filter((p) => p.isActive && shouldKeepProduct(p, true))
      .map(normalizeProductPrice);
  },
});

function toStockRow(p: any) {
  return {
    id: p._id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
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
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const result = await ctx.db
      .query("products")
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.filter((p) => shouldKeepProduct(p, true)).map(toStockRow),
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
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const term = args.searchTerm.trim();
    if (!term) return [];

    const SEARCH_CAP = 100;
    const upperBound = term + "￿";

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

    return Array.from(merged.values()).slice(0, SEARCH_CAP).map(toStockRow);
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
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const { rangeStartMs, rangeEndMs } = dateRangeToMs(args.startDate, args.endDate);
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
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const { rangeStartMs, rangeEndMs } = dateRangeToMs(args.startDate, args.endDate);
    const { truncated, cap, sortedAgg } = await aggregateProductSalesInRange(ctx, rangeStartMs, rangeEndMs);

    return {
      truncated,
      cap,
      productCount: sortedAgg.length,
      totalUnitsSold: sortedAgg.reduce((sum, r) => sum + r.quantitySoldInRange, 0),
    };
  },
});

export const adjustStock = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const currentInventory = product.inventory ?? 0;
    const newInventory = currentInventory + args.delta;
    if (newInventory < 0) {
      throw new Error(`Inventory cannot be negative (current: ${currentInventory}, delta: ${args.delta})`);
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
      const newInv = Math.max(0, currentInv + args.delta);
      await ctx.db.patch(pToUpdate._id, {
        inventory: newInv,
      });
      await applyStockCounterDelta(
        ctx,
        { inventory: currentInv, reorderPoint: pToUpdate.reorderPoint },
        { inventory: newInv, reorderPoint: pToUpdate.reorderPoint }
      );
    }

    return { success: true, newInventory: Math.max(0, newInventory) };
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
    });

    return { success: true };
  },
});

export const getDiscountList = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const products = await ctx.db
      .query("products")
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
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

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
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
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
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    const { token, productId, ...fields } = args;
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    const resultingIsActive = "isActive" in patch ? (patch.isActive as boolean) : product.isActive;
    if (resultingIsActive) {
      const isStoreOnly = product.specifications?.some(
        (spec) => spec.label === "for-store-only" && spec.value === "true"
      );
      const resultingImage = "image" in patch ? (patch.image as string | undefined) : product.image;
      if (!isStoreOnly && !resultingImage) {
        throw new Error("Customer-facing products require a primary image before they can be made active.");
      }
    }

    await ctx.db.patch(productId, patch);

    if ("reorderPoint" in patch) {
      await applyStockCounterDelta(
        ctx,
        { inventory: product.inventory, reorderPoint: product.reorderPoint },
        { inventory: product.inventory, reorderPoint: patch.reorderPoint as number | undefined }
      );
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
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

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
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const specifications = args.isStoreOnly
      ? [{ label: "for-store-only", value: "true" }]
      : [];

    let barcode = await allocateNextBarcode(ctx);
    // Defensive guard: should never collide since allocateNextBarcode is a
    // monotonic per-year counter, but re-roll rather than fail outright.
    while (
      await ctx.db
        .query("products")
        .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
        .unique()
    ) {
      barcode = await allocateNextBarcode(ctx);
    }

    const productId = await ctx.db.insert("products", {
      name: args.name,
      brand: args.brand || undefined,
      barcode,
      slug,
      description: args.description,
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
      inventory: 0,
      unitsSold: 0,
    });

    await applyStockCounterDelta(ctx, null, { inventory: 0, reorderPoint: args.reorderPoint });

    return { success: true, productId };
  },
});
