import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { normalizeProductPrice, shouldKeepProduct } from "./products";
import { trackedQuery } from "./lib/ioTracking";

/**
 * Fetch a specific brand by its slug, along with all of its associated products.
 * Uses index lookups for optimal performance and adheres to Convex best practices.
 */
export const getBrandBySlug = trackedQuery("brands.getBrandBySlug", {
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // 1. Fetch the brand metadata by slug
    let brand = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    let brandName = brand ? brand.name : "";
    if (!brand) {
      // No dedicated brands row for this slug -- look up a product carrying
      // the same slugified brand via the indexed brandSlug field instead of
      // scanning every product and normalizing `brand` in JS.
      const matchingProduct = await ctx.db
        .query("products")
        .withIndex("by_brandSlug", (q) => q.eq("brandSlug", args.slug))
        .first();

      if (matchingProduct) {
        brandName = matchingProduct.brand;
        brand = {
          name: brandName,
          slug: args.slug,
          logo: "",
          banner: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200",
          discount: "",
          mission: `Curated safety, comfort and quality essentials from ${brandName}.`,
          certifications: [],
          story: { title: "", content: "" },
        } as any;
      }
    }

    if (!brand) {
      return null;
    }

    // 2. Fetch products associated with this brand
    const products = await ctx.db
      .query("products")
      .withIndex("by_brand", (q) => q.eq("brand", brandName))
      .collect();

    // 3. Filter out inactive/legacy products in memory to avoid un-indexed database filtering
    const activeProducts = products
      .filter((p) => p.isActive !== false && shouldKeepProduct(p))
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
