import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { slugify } from "./products";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";

/**
 * Lists all known brand names for the admin product create/edit brand
 * combobox. Unbounded collect is safe here — this table only ever holds a
 * small, admin-curated set of names (seeded with ~21, growing only via
 * explicit "+ Add new brand" actions), nowhere near products-table scale.
 */
export const listProductBrandNames = trackedQuery("productBrandNames.listProductBrandNames", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);
    return await ctx.db.query("productBrandNames").withIndex("by_name").take(500);
  },
});

export const createProductBrandName = trackedMutation("productBrandNames.createProductBrandName", {
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);

    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Brand name is required.");
    }

    const existing = await ctx.db
      .query("productBrandNames")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .unique();
    if (existing) {
      return { brandId: existing._id, name: existing.name, alreadyExisted: true };
    }

    const baseSlug = slugify(trimmed);
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

    const brandId = await ctx.db.insert("productBrandNames", { name: trimmed, slug });
    return { brandId, name: trimmed, alreadyExisted: false };
  },
});
