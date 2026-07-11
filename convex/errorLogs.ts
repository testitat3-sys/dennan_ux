import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_DETAILS_LENGTH = 2000;
const CAP = 200;

/**
 * Logs a client-reported error. Must never throw back into the caller's
 * error-reporting path — a bad token or a lookup failure just means the row
 * gets logged without user attribution instead of crashing the reporter.
 */
export const logError = mutation({
  args: {
    token: v.optional(v.string()),
    fingerprint: v.string(),
    message: v.string(),
    details: v.optional(v.string()),
    suggestion: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId, userName, accountRole;
    if (args.token) {
      try {
        const { user } = await verifyStaffSession(ctx, args.token);
        userId = user._id;
        userName = user.name;
        accountRole = user.accountRole;
      } catch (e) {
        // Unauthenticated/expired session — log anonymously rather than fail.
      }
    }

    const now = Date.now();
    const truncatedDetails = args.details && args.details.length > MAX_DETAILS_LENGTH
      ? args.details.slice(0, MAX_DETAILS_LENGTH)
      : args.details;

    const existing = await ctx.db
      .query("errorLogs")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
      .order("desc")
      .first();

    if (existing && now - existing.lastSeenAt < DEDUPE_WINDOW_MS) {
      await ctx.db.patch(existing._id, {
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeenAt: now,
      });
      return { success: true, deduped: true };
    }

    await ctx.db.insert("errorLogs", {
      fingerprint: args.fingerprint,
      message: args.message,
      details: truncatedDetails,
      suggestion: args.suggestion,
      source: args.source,
      userId,
      userName,
      accountRole,
      occurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    });

    // Bloat control: self-prune the oldest rows past CAP on every new insert.
    const rows = await ctx.db
      .query("errorLogs")
      .withIndex("by_lastSeenAt")
      .order("asc")
      .take(CAP + 20);
    if (rows.length > CAP) {
      const overflow = rows.slice(0, rows.length - CAP);
      for (const row of overflow) {
        await ctx.db.delete(row._id);
      }
    }

    return { success: true, deduped: false };
  },
});

/**
 * Admin-only: retrieves the full error log history, most recent first.
 */
export const getErrorLogs = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    return await ctx.db
      .query("errorLogs")
      .withIndex("by_lastSeenAt")
      .order("desc")
      .take(CAP);
  },
});

/**
 * Admin-only: clears the entire error log history.
 */
export const clearErrorLogs = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const rows = await ctx.db.query("errorLogs").take(CAP + 20);
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return { success: true };
  },
});
