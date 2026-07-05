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
