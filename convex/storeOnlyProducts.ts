import { mutation } from "./_generated/server";
import productsToUpload from "./storeOnlyProductsData.json";

export const upload = mutation({
  args: {},
  handler: async (ctx) => {
    let skipped = 0;
    let added = 0;
    let updated = 0;

    for (const p of productsToUpload) {
      // Check duplicate by barcode first
      const existing = await ctx.db
        .query("products")
        .withIndex("by_barcode", (q) => q.eq("barcode", p.barcode))
        .unique();

      if (existing) {
        // If it is active and actual data, skip it (do not update)
        if (existing.actual_data && existing.isActive) {
          skipped++;
          continue;
        }

        // Otherwise patch it
        await ctx.db.patch(existing._id, { ...p, updatedAt: Date.now() } as any);
        updated++;
      } else {
        // Fallback to checking by slug
        const existingBySlug = await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", p.slug))
          .unique();

        if (existingBySlug) {
          if (existingBySlug.actual_data && existingBySlug.isActive) {
            skipped++;
            continue;
          }
          await ctx.db.patch(existingBySlug._id, { ...p, updatedAt: Date.now() } as any);
          updated++;
        } else {
          await ctx.db.insert("products", { ...p, updatedAt: Date.now() } as any);
          added++;
        }
      }
    }

    console.log(`Finished store-only products upload. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
    return { success: true, added, updated, skipped };
  },
});
