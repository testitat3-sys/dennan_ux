import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";

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
function slugify(name: string): string {
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
    console.log(`[convex/products.ts] Batch Product updated: ${slug} (${existing._id})`);
    return { id: existing._id, status: "updated", slug };
  } else {
    // 4. Create new product
    const newId = await ctx.db.insert("products", productFields);
    console.log(`[convex/products.ts] Batch Product created: ${slug} (${newId})`);
    return { id: newId, status: "created", slug };
  }
}

export const ONLY_FETCH_ACTUAL_DATA = true;

export function shouldKeepProduct(product: any): boolean {
  if (!product) return false;
  if (ONLY_FETCH_ACTUAL_DATA && product.actual_data !== true) {
    return false;
  }
  return true;
}

// Centrally resolves active product selling price at runtime
export function normalizeProductPrice(product: any): any {
  if (!product) return product;
  const now = Date.now();
  const hasExpiry = product.discountExpiry !== undefined && product.discountExpiry !== null;
  const isExpired = hasExpiry && product.discountExpiry <= now;

  if (product.discountPrice !== undefined && !isExpired) {
    return {
      ...product,
      price: product.discountPrice,
      wasPrice: product.originalPrice ?? product.price,
    };
  }
  return {
    ...product,
    price: product.originalPrice ?? product.price,
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
    return products.filter((p) => p.isActive && shouldKeepProduct(p));
  },
});

export const getStockList = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const products = await ctx.db
      .query("products")
      .collect();

    // Filter to keep only actual data and return inventory details
    return products
      .filter(shouldKeepProduct)
      .map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        inventory: p.inventory ?? 0,
        costPrice: p.costPrice ?? 0,
        reorderPoint: p.reorderPoint ?? 0,
      }));
  },
});

export const adjustStock = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const currentInventory = product.inventory ?? 0;
    const newInventory = currentInventory + args.delta;
    if (newInventory < 0) {
      throw new Error(`Inventory cannot be negative (current: ${currentInventory}, delta: ${args.delta})`);
    }

    await ctx.db.patch(args.productId, {
      inventory: newInventory,
    });

    return { success: true, newInventory };
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
    await verifyStaffSession(ctx, args.token, ["admin"]);

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
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const products = await ctx.db
      .query("products")
      .collect();

    // Filter to keep only those with an active or pending discount
    const now = Date.now();
    return products
      .filter(shouldKeepProduct)
      .filter(
        (p) =>
          p.discountPrice !== undefined &&
          p.discountPrice > 0 &&
          (p.discountExpiry === undefined || p.discountExpiry > now)
      );
  },
});
