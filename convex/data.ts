import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizeProductPrice, shouldKeepProduct } from "./products";

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
    
    // Only return products matching the central filter
    results = results.filter((p) => shouldKeepProduct(p));
    
    if (args.category) {
      results = results.filter(p => p.category === args.category);
    }
    if (args.tier) {
      results = results.filter(p => p.tier && p.tier.toLowerCase() === args.tier?.toLowerCase());
    }
    if (args.stage) {
      results = results.filter(p => p.stage === args.stage);
    }
    
    return results.map(normalizeProductPrice);
  },
});

export const getProductById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Note: In a real app we might use Convex IDs, but for migration 
    // we might still be looking for the original numeric/string IDs
    const product = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("name"), args.id)) // Placeholder, should be mapped to actual ID field if available
      .first();
    
    if (!product || !shouldKeepProduct(product)) {
      return null;
    }
    return normalizeProductPrice(product);
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

export const getDashboardConfig = query({
  args: {},
  handler: async (ctx) => {
    const milestones = await ctx.db.query("dashboardMilestones").collect();
    const badges = await ctx.db.query("dashboardBadges").collect();
    const checklists = await ctx.db.query("dashboardChecklists").collect();
    const editorial = await ctx.db.query("dashboardEditorial").first();
    
    return {
      milestones: {
        expecting: milestones.filter(m => m.stage === "expecting").sort((a, b) => a.order - b.order),
        newborn: milestones.filter(m => m.stage === "newborn").sort((a, b) => a.order - b.order),
      },
      badges: {
        expecting: badges.filter(b => b.stage === "expecting").sort((a, b) => a.order - b.order),
        newborn: badges.filter(b => b.stage === "newborn").sort((a, b) => a.order - b.order),
      },
      nextMilestone: {
        expecting: await ctx.db.query("dashboardItems").withIndex("by_stage_and_order", q => q.eq("stage", "expecting")).collect(),
        newborn: await ctx.db.query("dashboardItems").withIndex("by_stage_and_order", q => q.eq("stage", "newborn")).collect(),
      },
      checklists: {
        expecting: checklists.filter(c => c.stage === "expecting").sort((a, b) => a.order - b.order),
        newborn: checklists.filter(c => c.stage === "newborn").sort((a, b) => a.order - b.order),
      },
      editorial: editorial || null,
    };
  },
});

export const getCheckoutConfig = query({
  args: {},
  handler: async (ctx) => {
    const steps = await ctx.db.query("checkoutSteps").collect();
    const promos = await ctx.db.query("checkoutConfirmationPromos").collect();
    const trackingStages = await ctx.db.query("checkoutTrackingStages").collect();
    const rider = await ctx.db.query("checkoutTrackingRider").first();
    const zones = await ctx.db.query("deliveryZones").collect();
    const landmarks = await ctx.db.query("deliveryLandmarks").collect();
    
    const zonesObj: Record<string, number> = {};
    zones.forEach(z => {
      zonesObj[z.name] = z.timeMinutes;
    });
    
    return {
      steps: steps.sort((a, b) => a.order - b.order),
      confirmation: {
        promos: promos.sort((a, b) => a.order - b.order),
      },
      tracking: {
        stages: trackingStages.sort((a, b) => a.stageId - b.stageId),
        rider: rider || null,
      },
      delivery: {
        zones: zonesObj,
        landmarks: landmarks,
        suggestions: landmarks.slice(0, 3),
      },
    };
  },
});

export const getCollectionsConfig = query({
  args: {},
  handler: async (ctx) => {
    const collections = await ctx.db.query("collections").collect();
    const collectionsObj: Record<string, any> = {};
    collections.forEach(c => {
      collectionsObj[c.collectionId] = {
        id: c.collectionId,
        title: c.title,
        subtext: c.subtext,
        heroImage: c.heroImage,
      };
    });
    return collectionsObj;
  },
});

