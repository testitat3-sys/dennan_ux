import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * Save a "how did you know about us?" answer, prompted on the order
 * confirmation screen right after checkout (both guest and authenticated
 * orders reach that screen).
 */
export const submitReferralSource = mutation({
  args: {
    source: v.union(
      v.literal("tiktok"),
      v.literal("instagram"),
      v.literal("friend"),
      v.literal("google"),
      v.literal("chatgpt"),
      v.literal("other")
    ),
    otherDetail: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);

    await ctx.db.insert("referralSources", {
      userId: userId ?? undefined,
      orderId: args.orderId,
      source: args.source,
      otherDetail: args.otherDetail?.trim() || undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
