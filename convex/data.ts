import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizeProductPrice, shouldKeepProduct } from "./products";
import { trackedQuery } from "./lib/ioTracking";

export const getHero = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hero").first();
  },
});

// Unbounded collect is accepted here — `brands` is a small, admin-curated
// table (same scale as `productBrandNames`, seeded ~dozens of rows), nowhere
// near products-table scale, so an index isn't worth the schema overhead.
export const getBrands = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brands").collect();
  },
});

export const getProducts = trackedQuery("data.getProducts", {
  args: {
    category: v.optional(v.string()),
    tier: v.optional(v.string()),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Narrow by `actual_data` index-side in every branch, since only ~160 of
    // ~5000 rows are real store-facing products - the rest are non-actual_data
    // seed/import rows. Tier still needs a JS pass since the schema's tier
    // literal casing may not match the lowercased arg.
    let results = args.category
      ? await ctx.db
          .query("products")
          .withIndex("by_category_and_actual_data", (q) =>
            q.eq("category", args.category).eq("actual_data", true)
          )
          .collect()
      : args.stage
      ? await ctx.db
          .query("products")
          .withIndex("by_stage_and_actual_data", (q) =>
            q.eq("stage", args.stage as any).eq("actual_data", true)
          )
          .collect()
      : await ctx.db
          .query("products")
          .withIndex("by_actual_data", (q) => q.eq("actual_data", true))
          .collect();

    // Only return products matching the central filter
    results = results.filter((p) => shouldKeepProduct(p));

    if (args.tier) {
      results = results.filter(p => p.tier && p.tier.toLowerCase() === args.tier?.toLowerCase());
    }
    if (args.stage) {
      results = results.filter(p => p.stage === args.stage);
    }

    return results.map(normalizeProductPrice);
  },
});

export const getProductBySlugOrId = query({
  args: {
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const { productId } = args;

    // Slug lookup (the common case from product links) uses the by_slug index.
    let product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", productId))
      .unique();

    // Fall back to a direct _id lookup.
    if (!product) {
      try {
        product = await ctx.db.get(productId);
      } catch {
        // Not a valid Id<"products"> string; ignore and fall through.
      }
    }

    return product ? normalizeProductPrice(product) : null;
  },
});

export const getProductsByStage = query({
  args: {
    stage: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("products")
      .withIndex("by_stage_and_actual_data", (q) =>
        q.eq("stage", args.stage as any).eq("actual_data", true)
      )
      .collect();

    return results
      .filter((p) => shouldKeepProduct(p))
      .slice(0, args.limit)
      .map(normalizeProductPrice);
  },
});

function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  return w;
}

export const searchProducts = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rawQuery = args.query.trim();
    if (!rawQuery) return [];
    const limit = args.limit || 50;
    const stemmedQuery = stemWord(rawQuery);

    // 1. Primary Pass: Storage-pushed Search via `search_text` search index
    let candidates = await ctx.db
      .query("products")
      .withSearchIndex("search_text", (q) =>
        q.search("searchText", rawQuery).eq("actual_data", true)
      )
      .take(limit);

    // Fallback pass with stemmed query if exact query yields no candidates
    if (candidates.length === 0 && stemmedQuery !== rawQuery.toLowerCase()) {
      candidates = await ctx.db
        .query("products")
        .withSearchIndex("search_text", (q) =>
          q.search("searchText", stemmedQuery).eq("actual_data", true)
        )
        .take(limit);
    }

    // Fallback pass via `search_name` if `search_text` index returns 0 results
    if (candidates.length === 0) {
      candidates = await ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", rawQuery))
        .take(limit);
    }

    // 2. Soft Keyword Fallback Pass:
    // If strict full-query search returns 0 results, extract primary tokens and query search_text
    const tokens = rawQuery.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (candidates.length === 0 && tokens.length > 0) {
      const primaryToken = tokens.reduce((a, b) => (a.length >= b.length ? a : b));
      const stemmedPrimary = stemWord(primaryToken);
      candidates = await ctx.db
        .query("products")
        .withSearchIndex("search_text", (q) =>
          q.search("searchText", stemmedPrimary).eq("actual_data", true)
        )
        .take(limit);
    }

    // 3. Central filter for store-active products & deduplication
    const validProducts = candidates.filter((p) => shouldKeepProduct(p));
    const uniqueMap = new Map<string, any>();
    for (const p of validProducts) {
      uniqueMap.set(p._id.toString(), p);
    }
    const uniqueCandidates = Array.from(uniqueMap.values());

    // 4. Weighted Relevance Scoring & Re-ranking
    const scored = uniqueCandidates.map((p) => {
      let score = 0;
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      const subCategory = (p.subCategory || "").toLowerCase();
      const description = (p.description || "").toLowerCase();
      const tags = (p.tags || []).map((t: any) => t.text.toLowerCase()).join(" ");
      const lowQuery = rawQuery.toLowerCase();
      const lowStemmed = stemmedQuery;

      // Huge bonus for exact full phrase match in Title or Brand
      if (name === lowQuery || name === lowStemmed) score += 150;
      else if (name.includes(lowQuery) || name.includes(lowStemmed)) score += 100;
      if (brand.includes(lowQuery) || brand.includes(lowStemmed)) score += 80;
      if (tags.includes(lowQuery) || tags.includes(lowStemmed)) score += 60;
      if (category.includes(lowQuery) || category.includes(lowStemmed)) score += 40;

      // Token match scoring across distinct fields (original token or stemmed variant)
      let matchedTokenCount = 0;
      for (const token of tokens) {
        const stemmed = stemWord(token);
        let matched = false;
        if (name.includes(token) || name.includes(stemmed)) {
          score += 35;
          matched = true;
        }
        if (brand.includes(token) || brand.includes(stemmed)) {
          score += 25;
          matched = true;
        }
        if (category.includes(token) || subCategory.includes(token) || category.includes(stemmed) || subCategory.includes(stemmed)) {
          score += 15;
          matched = true;
        }
        if (tags.includes(token) || tags.includes(stemmed)) {
          score += 15;
          matched = true;
        }
        if (description.includes(token) || description.includes(stemmed)) {
          score += 5;
          matched = true;
        }
        if (matched) matchedTokenCount++;
      }

      // Bonus ratio for matching more of the user's keywords
      const matchRatio = tokens.length > 0 ? matchedTokenCount / tokens.length : 0;
      score += matchRatio * 50;

      return { product: p, score };
    });

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((item) => normalizeProductPrice(item.product));
  },
});

export const getHomeFeaturedProducts = trackedQuery("data.getHomeFeaturedProducts", {
  args: {},
  handler: async (ctx) => {
    // Indexed lookups instead of a full products scan. Buffered above the
    // final 8/4 to absorb rows dropped by shouldKeepProduct.
    const [mostLovedCandidates, curatedCandidates] = await Promise.all([
      ctx.db
        .query("products")
        .withIndex("by_isMostLoved_and_actual_data", (q) => q.eq("isMostLoved", true).eq("actual_data", true))
        .take(20),
      ctx.db
        .query("products")
        .withIndex("by_isCuratedForYou_and_actual_data", (q) => q.eq("isCuratedForYou", true).eq("actual_data", true))
        .take(12),
    ]);

    const mostLoved = mostLovedCandidates
      .filter((p) => shouldKeepProduct(p))
      .slice(0, 8)
      .map(normalizeProductPrice);
    const curated = curatedCandidates
      .filter((p) => shouldKeepProduct(p))
      .slice(0, 4)
      .map(normalizeProductPrice);

    return { mostLoved, curated };
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

