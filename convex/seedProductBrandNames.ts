import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { slugify } from "./products";

// Seed list sourced from brand_info.md's Brand Leaderboard.
const KNOWN_BRAND_NAMES = [
  "Chicco",
  "Nutmeg",
  "Tommee Tippee",
  "Vital Baby",
  "Munchkin",
  "Dalin",
  "Nuby",
  "Medela",
  "Cow & Gate",
  "Hipp Organic",
  "Aptamil",
  "Philips Avent",
  "Friendly Organic",
  "Mam",
  "Momcozy",
  "Kiddylicious",
  "Dr Brown's",
  "Kidilo",
  "Lansinoh",
  "Milton",
  "Sunnozy",
];

/**
 * One-time/idempotent seed for productBrandNames. Not called from the app —
 * run manually via `npx convex run seedProductBrandNames:seedProductBrandNames`.
 */
export const seedProductBrandNames = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const name of KNOWN_BRAND_NAMES) {
      const existing = await ctx.db
        .query("productBrandNames")
        .withIndex("by_name", (q) => q.eq("name", name))
        .unique();
      if (existing) {
        skipped++;
        continue;
      }

      const baseSlug = slugify(name);
      let slug = baseSlug;
      let counter = 1;
      while (
        await ctx.db
          .query("productBrandNames")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique()
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      await ctx.db.insert("productBrandNames", { name, slug });
      created++;
    }

    return { created, skipped };
  },
});
