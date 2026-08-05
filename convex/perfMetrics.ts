import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { todayStr } from "./lib/ioTracking";

/**
 * Get-or-init-then-patch both the per-day and all-time counters for a
 * client-side timing metric, mirroring bumpIOCounters in
 * convex/lib/ioTracking.ts. Never scans - always a point lookup by index.
 */
async function bumpPerfMetric(
  ctx: MutationCtx,
  metric: string,
  ms: number,
  day: string = todayStr()
): Promise<void> {
  const dailyExisting = await ctx.db
    .query("perfMetrics")
    .withIndex("by_metric_and_day", (q) => q.eq("metric", metric).eq("day", day))
    .unique();
  if (dailyExisting) {
    await ctx.db.patch(dailyExisting._id, {
      count: dailyExisting.count + 1,
      sumMs: dailyExisting.sumMs + ms,
      maxMs: Math.max(dailyExisting.maxMs, ms),
    });
  } else {
    await ctx.db.insert("perfMetrics", { metric, day, count: 1, sumMs: ms, maxMs: ms });
  }

  const allTimeExisting = await ctx.db
    .query("perfMetricsAllTime")
    .withIndex("by_metric", (q) => q.eq("metric", metric))
    .unique();
  if (allTimeExisting) {
    await ctx.db.patch(allTimeExisting._id, {
      count: allTimeExisting.count + 1,
      sumMs: allTimeExisting.sumMs + ms,
      maxMs: Math.max(allTimeExisting.maxMs, ms),
    });
  } else {
    await ctx.db.insert("perfMetricsAllTime", { metric, count: 1, sumMs: ms, maxMs: ms });
  }
}

/**
 * Records one client-side timing sample (e.g. "how long did the POS grid
 * take to render", "how long did a search keystroke take to filter").
 * Called by the frontend `usePerfTracking` hook. Must never throw back into
 * the caller's render/interaction path - a failed counter update should
 * never surface as a user-facing error, mirroring recordIO in
 * convex/dbIOStats.ts.
 */
export const recordPerfSample = mutation({
  args: {
    token: v.string(),
    metric: v.string(),
    ms: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);
    try {
      await bumpPerfMetric(ctx, args.metric, args.ms);
    } catch (e) {
      // Instrumentation must never surface as a user-facing failure.
    }
    return null;
  },
});

export const getPerfStatsForDay = query({
  args: {
    token: v.string(),
    day: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const rows = await ctx.db
      .query("perfMetrics")
      .withIndex("by_day", (q) => q.eq("day", args.day))
      .collect();

    const sorted = rows
      .map((r) => ({
        metric: r.metric,
        count: r.count,
        avgMs: r.count > 0 ? r.sumMs / r.count : 0,
        maxMs: r.maxMs,
      }))
      .sort((a, b) => b.avgMs - a.avgMs);

    return { day: args.day, rows: sorted };
  },
});

export const getCumulativePerfStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    // One row per metric — small, bounded table, same shape as
    // dbIOAllTimeCounters.
    const rows = await ctx.db.query("perfMetricsAllTime").collect();

    const sorted = rows
      .map((r) => ({
        metric: r.metric,
        count: r.count,
        avgMs: r.count > 0 ? r.sumMs / r.count : 0,
        maxMs: r.maxMs,
      }))
      .sort((a, b) => b.avgMs - a.avgMs);

    return { rows: sorted };
  },
});
