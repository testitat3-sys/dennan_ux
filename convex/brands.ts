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
      // Find matching brand from products dynamically
      const allProducts = await ctx.db.query("products").collect();
      const matchingProduct = allProducts.find(p => {
        if (!p.brand) return false;
        const normalized = p.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return normalized === args.slug || (args.slug === "dr-browns" && normalized.startsWith("dr-brown"));
      });

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
