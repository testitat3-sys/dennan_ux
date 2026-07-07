import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Saves a magic link generated for a user.
 * This is intended for development and testing.
 */
export const storeLink = internalMutation({
  args: {
    email: v.string(),
    url: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    // We only keep the latest link for each email to avoid clutter
    const existing = await ctx.db
      .query("testLinks")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.insert("testLinks", {
      email: args.email,
      url: args.url,
      expiresAt: args.expires,
    });
  },
});

/**
 * Fetches the latest magic link for a given email.
 */
export const getLink = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("testLinks")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .first();
  },
});
