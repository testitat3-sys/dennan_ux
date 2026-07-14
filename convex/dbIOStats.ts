import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { bumpIOCounters } from "./lib/ioTracking";

/**
 * Records the read-count tally a `trackedQuery` piggybacked onto its return
 * value as `_io` (queries can't persist it themselves - see
 * convex/lib/ioTracking.ts). Called by the frontend `useTrackedQuery` hook
 * after every tracked query resolves. Must never throw back into the
 * caller's render path — a failed counter update should never break the
 * page that triggered it, mirroring convex/errorLogs.ts's `logError`.
 */
export const recordIO = mutation({
  args: {
    fn: v.string(),
    reads: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      await bumpIOCounters(ctx, args.fn, args.reads);
    } catch (e) {
      // Instrumentation must never surface as a user-facing failure.
    }
    return null;
  },
});

export const getIOStatsForDay = query({
  args: {
    token: v.string(),
    day: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const rows = await ctx.db
      .query("dbIOCounters")
      .withIndex("by_day", (q) => q.eq("day", args.day))
      .collect();

    const sorted = rows
      .map((r) => ({
        functionName: r.functionName,
        reads: r.reads,
        invocations: r.invocations,
        avgReadsPerInvocation: r.invocations > 0 ? r.reads / r.invocations : 0,
      }))
      .sort((a, b) => b.reads - a.reads);

    const totalReads = sorted.reduce((sum, r) => sum + r.reads, 0);
    const totalInvocations = sorted.reduce((sum, r) => sum + r.invocations, 0);

    return { day: args.day, rows: sorted, totalReads, totalInvocations };
  },
});

export const getCumulativeIOStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    // One row per function — small, bounded table (not the unbounded-scan
    // pattern this dashboard exists to catch elsewhere.
    const rows = await ctx.db.query("dbIOAllTimeCounters").collect();

    const sorted = rows
      .map((r) => ({
        functionName: r.functionName,
        reads: r.reads,
        invocations: r.invocations,
        avgReadsPerInvocation: r.invocations > 0 ? r.reads / r.invocations : 0,
      }))
      .sort((a, b) => b.reads - a.reads);

    const totalReads = sorted.reduce((sum, r) => sum + r.reads, 0);
    const totalInvocations = sorted.reduce((sum, r) => sum + r.invocations, 0);

    return { rows: sorted, totalReads, totalInvocations };
  },
});
