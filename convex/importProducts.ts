import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { applyStockCounterDelta } from "./stockCounters";

export const upsertProductsBatch = internalMutation({
  args: {
    products: v.array(
      v.object({
        name: v.string(),
        old_name: v.optional(v.string()),
        brand: v.string(),
        slug: v.string(),
        barcode: v.string(),
        price: v.number(),
        originalPrice: v.number(),
        wasPrice: v.optional(v.number()),
        discountPrice: v.optional(v.number()),
        image: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        stage: v.optional(v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid"))),
        tier: v.optional(v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries"))),
        category: v.optional(
          v.union(
            v.literal("Expectant and New Mom Essentials"),
            v.literal("Newborn Essentials & Kids Apparel/Footwear"),
            v.literal("Nursery and Furnishing"),
            v.literal("Feeding/Nursing Essentials"),
            v.literal("Bathing and Changing"),
            v.literal("Baby Play and Safety Gear"),
            v.literal("Travel Must-Haves")
          )
        ),
        subCategory: v.optional(v.string()),
        description: v.string(),
        tags: v.array(v.object({ type: v.string(), text: v.string() })),
        specifications: v.array(v.object({ label: v.string(), value: v.string() })),
        isActive: v.boolean(),
        actual_data: v.boolean(),
        inventory: v.optional(v.number()),
        size: v.optional(v.string()),
        color: v.optional(v.string()),
        minMonth: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let added = 0;
    let updated = 0;

    for (const p of args.products) {
      // Find existing product by barcode strictly
      const existing = await ctx.db
        .query("products")
        .withIndex("by_barcode", (q) => q.eq("barcode", p.barcode))
        .unique();

      if (existing) {
        // For products that already exist, simply add/update the old_name and updatedAt.
        await ctx.db.patch(existing._id, {
          old_name: p.old_name,
          updatedAt: Date.now(),
        });
        updated++;
      } else {
        // Insert new product
        await ctx.db.insert("products", {
          ...p,
          actual_data: true,
          isActive: true,
          updatedAt: Date.now(),
        });
        await applyStockCounterDelta(ctx, null, { inventory: p.inventory, reorderPoint: undefined });
        added++;
      }
    }

    return { added, updated };
  },
});
