import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Scans all products with `actual_data: true` and logs any items missing an image URL
 * into the `missingImageProducts` table in Convex.
 */
export const syncMissingImageProducts = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch all store-facing products
    const products = await ctx.db
      .query("products")
      .withIndex("by_actual_data", (q) => q.eq("actual_data", true))
      .collect();

    // 2. Clear existing entries in missingImageProducts table
    const existingEntries = await ctx.db.query("missingImageProducts").collect();
    for (const doc of existingEntries) {
      await ctx.db.delete(doc._id);
    }

    const now = Date.now();
    const insertedIds = [];

    // 3. Identify products missing image URLs
    for (const p of products) {
      const primaryUrl = p.image || (p.images && p.images[0]);
      if (!primaryUrl || primaryUrl.trim() === "") {
        const id = await ctx.db.insert("missingImageProducts", {
          productId: p._id,
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          barcode: p.barcode,
          category: p.category,
          price: p.price,
          actual_data: p.actual_data ?? true,
          loggedAt: now,
        });
        insertedIds.push(id);
      }
    }

    console.log(`[convex/missingImages.ts] Synced ${insertedIds.length} missing image products to database.`);
    return {
      success: true,
      totalMissingCount: insertedIds.length,
      loggedAt: now,
    };
  },
});

/**
 * Returns all products recorded as missing image URLs.
 */
export const getMissingImageProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("missingImageProducts").collect();
  },
});
