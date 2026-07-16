import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";

export const getAppSettings = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token);
    const row = await ctx.db.query("appSettings").first();
    return { productNameSource: row?.productNameSource ?? "name" };
  },
});

export const setProductNameSource = mutation({
  args: {
    token: v.string(),
    productNameSource: v.union(v.literal("name"), v.literal("old_name")),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);
    const row = await ctx.db.query("appSettings").first();
    if (row) {
      await ctx.db.patch(row._id, { productNameSource: args.productNameSource });
    } else {
      await ctx.db.insert("appSettings", { productNameSource: args.productNameSource });
    }
  },
});
