import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { applyStockCounterDelta } from "./stockCounters";

export const upsertProductsBatch = internalMutation({
  args: {
    products: v.array(
      v.object({
        name: v.string(),
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
        // updatedAt must be stamped on every write here - getProductsUpdatedSince
        // (the offline POS delta sync) is an indexed range query on updatedAt, so
        // a product whose updatedAt is left undefined is permanently invisible to
        // it even after a full resync.
        await ctx.db.patch(existing._id, {
          inventory: p.inventory,
          actual_data: true,
          isActive: true,
          updatedAt: Date.now(),
        });
        await applyStockCounterDelta(
          ctx,
          { inventory: existing.inventory, reorderPoint: existing.reorderPoint },
          { inventory: p.inventory, reorderPoint: existing.reorderPoint },
          existing._id
        );
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
