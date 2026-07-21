import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery } from "./lib/ioTracking";

const DEFAULT_COUNTS = {
  tiktok: 0,
  instagram: 0,
  friend: 0,
  google: 0,
  chatgpt: 0,
  other: 0,
};

type ReferralSourceKey = keyof typeof DEFAULT_COUNTS;

/**
 * Save a "how did you know about us?" answer, prompted on the order
 * confirmation screen right after checkout (both guest and authenticated
 * orders reach that screen).
 * Also updates the denormalized referralSourceStats summary row in O(1).
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

    // 1. Record individual answer
    await ctx.db.insert("referralSources", {
      userId: userId ?? undefined,
      orderId: args.orderId,
      source: args.source,
      otherDetail: args.otherDetail?.trim() || undefined,
      createdAt: Date.now(),
    });

    // 2. Increment denormalized summation stats counter
    const statsRow = await ctx.db.query("referralSourceStats").first();

    if (!statsRow) {
      // Initialize stats counter if missing
      const allRecords = await ctx.db.query("referralSources").collect();
      const counts: Record<ReferralSourceKey, number> = { ...DEFAULT_COUNTS };
      for (const r of allRecords) {
        if (r.source in counts) {
          counts[r.source as ReferralSourceKey]++;
        }
      }
      await ctx.db.insert("referralSourceStats", {
        total: allRecords.length,
        counts,
        updatedAt: Date.now(),
      });
    } else {
      // O(1) patch update
      const currentCounts = statsRow.counts;
      const updatedCounts = {
        ...currentCounts,
        [args.source]: (currentCounts[args.source as ReferralSourceKey] || 0) + 1,
      };
      await ctx.db.patch(statsRow._id, {
        total: statsRow.total + 1,
        counts: updatedCounts,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * High-efficiency O(1) query returning summary totals, raw counts, and percentage
 * proportions for referral channels. Used by the admin Leads page.
 */
export const getReferralSourceStats = trackedQuery("referralSources.getReferralSourceStats", {
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.token) {
      await verifyStaffSession(ctx, args.token, ["staff", "admin"]);
    }

    const statsRow = await ctx.db.query("referralSourceStats").first();

    let total = 0;
    let counts: Record<ReferralSourceKey, number> = { ...DEFAULT_COUNTS };

    if (statsRow) {
      total = statsRow.total;
      counts = { ...DEFAULT_COUNTS, ...statsRow.counts };
    } else {
      // Fallback calculation for first run
      const allRecords = await ctx.db.query("referralSources").take(500);
      total = allRecords.length;
      for (const r of allRecords) {
        if (r.source in counts) {
          counts[r.source as ReferralSourceKey]++;
        }
      }
    }

    // Calculate proportions (percentages)
    const proportions: Record<ReferralSourceKey, number> = {
      tiktok: total > 0 ? Math.round((counts.tiktok / total) * 100) : 0,
      instagram: total > 0 ? Math.round((counts.instagram / total) * 100) : 0,
      friend: total > 0 ? Math.round((counts.friend / total) * 100) : 0,
      google: total > 0 ? Math.round((counts.google / total) * 100) : 0,
      chatgpt: total > 0 ? Math.round((counts.chatgpt / total) * 100) : 0,
      other: total > 0 ? Math.round((counts.other / total) * 100) : 0,
    };

    return {
      total,
      counts,
      proportions,
    };
  },
});
