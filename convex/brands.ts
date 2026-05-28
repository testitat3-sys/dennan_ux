import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { normalizeProductPrice } from "./products";

/**
 * Fetch a specific brand by its slug, along with all of its associated products.
 * Uses index lookups for optimal performance and adheres to Convex best practices.
 */
export const getBrandBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // 1. Fetch the brand metadata by slug
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!brand) {
      return null;
    }

    // 2. Fetch products associated with this brand
    // Products have a 'brand' string field which matches brand.name
    const products = await ctx.db
      .query("products")
      .withIndex("by_brand", (q) => q.eq("brand", brand.name))
      .collect();

    // 3. Filter out inactive products in memory to avoid un-indexed database filtering
    const activeProducts = products
      .filter((p) => p.isActive !== false)
      .map(normalizeProductPrice);

    return {
      ...brand,
      products: activeProducts,
    };
  },
});

/**
 * List all registered brands with their basic metadata.
 * Suitable for navigation menus and directory components.
 */
export const listAllBrands = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brands").order("asc").collect();
  },
});
