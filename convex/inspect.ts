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
