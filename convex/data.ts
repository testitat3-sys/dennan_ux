import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getHero = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hero").first();
  },
});

export const getBrands = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brands").collect();
  },
});

export const getProducts = query({
  args: {
    category: v.optional(v.string()),
    tier: v.optional(v.string()),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let products = ctx.db.query("products");
    
    // Simple filtering logic (can be optimized with indexes later)
    let results = await products.collect();
    
    if (args.category) {
      results = results.filter(p => p.category === args.category);
    }
    if (args.tier) {
      results = results.filter(p => p.tier.toLowerCase() === args.tier?.toLowerCase());
    }
    if (args.stage) {
      results = results.filter(p => p.stage === args.stage);
    }
    
    return results;
  },
});

export const getProductById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Note: In a real app we might use Convex IDs, but for migration 
    // we might still be looking for the original numeric/string IDs
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("name"), args.id)) // Placeholder, should be mapped to actual ID field if available
      .first();
  },
});

export const getStages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stages").collect();
  },
});

export const getTiers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tiers").collect();
  },
});

export const getReels = query({
  args: {},
  handler: async (ctx) => {
    const reels = await ctx.db.query("reels").collect();
    reels.sort((a, b) => (a.order || 0) - (b.order || 0));

    const reelsWithProducts = [];
    for (const reel of reels) {
      const products = await ctx.db
        .query("reelProducts")
        .withIndex("by_reel", (q) => q.eq("reelId", reel._id))
        .collect();
      
      reelsWithProducts.push({
        ...reel,
        products,
      });
    }
    return reelsWithProducts;
  },
});

export const getTrustItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("trustItems").collect();
  },
});

export const seedDatabase = mutation({
  args: {
    hero: v.any(),
    brands: v.array(v.any()),
    products: v.array(v.any()),
    stages: v.array(v.any()),
    tiers: v.array(v.any()),
    reels: v.array(v.any()),
    trustItems: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Clear existing data
    const tables = ["hero", "brands", "products", "stages", "tiers", "reels", "trustItems"] as const;
    for (const table of tables) {
      const existing = await ctx.db.query(table).collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
    }

    // Insert new data
    await ctx.db.insert("hero", args.hero);
    for (const brand of args.brands) await ctx.db.insert("brands", brand);
    for (const product of args.products) await ctx.db.insert("products", product);
    for (const stage of args.stages) await ctx.db.insert("stages", stage);
    for (const tier of args.tiers) await ctx.db.insert("tiers", tier);
    for (const reel of args.reels) await ctx.db.insert("reels", reel);
    for (const item of args.trustItems) await ctx.db.insert("trustItems", item);
  },
});
