import { query } from "./_generated/server";

export const getEnv = query({
  args: {},
  handler: async (ctx) => {
    return {
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
      HAS_JWT_KEY: !!process.env.JWT_PRIVATE_KEY,
    };
  },
});

export const checkProductDataStatus = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let actualCount = 0;
    let legacyCount = 0;
    for (const p of products) {
      if (p.actual_data) {
        actualCount++;
      } else {
        legacyCount++;
      }
    }
    return {
      total: products.length,
      actual_data_true: actualCount,
      actual_data_false: legacyCount,
    };
  },
});

export const checkCollectionCounts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const activeProducts = products.filter(p => p.actual_data === true);
    let essentials = 0;
    let musthaves = 0;
    let luxuries = 0;
    let mostloved = 0;
    let curatedforyou = 0;
    
    for (const p of activeProducts) {
      if (p.isEssentials) essentials++;
      if (p.isMustHave) musthaves++;
      if (p.isLuxury) luxuries++;
      if (p.isMostLoved) mostloved++;
      if (p.isCuratedForYou) curatedforyou++;
    }
    
    return {
      total: products.length,
      activeTotal: activeProducts.length,
      essentials,
      musthaves,
      luxuries,
      mostloved,
      curatedforyou,
    };
  },
});

export const checkProductCostPrices = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let withCostPrice = 0;
    let missingCostPrice = 0;
    let costPriceLowerThanDiscount = 0;
    const samples: any[] = [];
    const missingItems: any[] = [];

    for (const p of products) {
      if (p.costPrice !== undefined && p.costPrice !== null) {
        withCostPrice++;
      } else {
        missingCostPrice++;
        missingItems.push({
          _id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          wasPrice: p.wasPrice,
          discountPrice: p.discountPrice,
          costPrice: p.costPrice,
        });
      }

      const prices = [p.originalPrice, p.wasPrice, p.price, p.discountPrice].filter(
        (v): v is number => typeof v === "number" && v > 0
      );
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const expectedCostPrice = Math.round(maxPrice * 0.60);

      if (p.discountPrice && p.discountPrice < maxPrice) {
        const costBasedOnDiscount = Math.round(p.discountPrice * 0.60);
        if (p.costPrice === costBasedOnDiscount && p.costPrice < expectedCostPrice) {
          costPriceLowerThanDiscount++;
        }
      }

      if (samples.length < 5) {
        samples.push({
          name: p.name,
          originalPrice: p.originalPrice,
          price: p.price,
          discountPrice: p.discountPrice,
          wasPrice: p.wasPrice,
          maxPrice,
          costPrice: p.costPrice,
          expectedCostPrice,
        });
      }
    }

    return {
      totalProducts: products.length,
      withCostPrice,
      missingCostPrice,
      costPriceLowerThanDiscount,
      missingItems,
      samples,
    };
  },
});



