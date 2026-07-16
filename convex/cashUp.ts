import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";
import {
  parseDateStrToMs,
  getOrdersInDateRange,
  getPaymentsByOrderId,
  attributeOrderPayments,
} from "./orders";

const COMPLETED_STATUSES = ["delivered", "returned", "partially_returned"];
const DAY_MS = 24 * 60 * 60 * 1000;

type MethodTotals = {
  physical: number;
  momo: number;
  card: number;
  voucher: number;
};

function zeroTotals(): MethodTotals {
  return { physical: 0, momo: 0, card: 0, voucher: 0 };
}

// Sums each payment method's tenders across every completed order placed on
// `date`, reusing the same order-fetch/payment-attribution helpers as the
// Sales Metrics panel (convex/orders.ts) so the two surfaces never disagree.
async function computeExpectedTotalsForDate(ctx: QueryCtx, date: string): Promise<MethodTotals> {
  const rangeStartMs = parseDateStrToMs(date);
  const rangeEndMs = rangeStartMs + DAY_MS;

  const orders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);
  const completedOrders = orders.filter((o: any) => COMPLETED_STATUSES.includes(o.status));
  const paymentsByOrderId = await getPaymentsByOrderId(ctx, completedOrders);

  const totals = zeroTotals();
  for (const order of completedOrders) {
    const tenders = attributeOrderPayments(order, paymentsByOrderId);
    for (const t of tenders) {
      if (t.method in totals) {
        totals[t.method as keyof MethodTotals] += t.amount;
      }
    }
  }
  return totals;
}

/**
 * Live-computed expected totals for a date, without persisting anything.
 * Used to preview the "System Expected" column before a cash-up entry has
 * been saved for that day.
 */
export const getExpectedTotalsForDate = trackedQuery("cashUp.getExpectedTotalsForDate", {
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);
    return computeExpectedTotalsForDate(ctx, args.date);
  },
});

/**
 * Everything the Balance Books panel needs for one day in a single round
 * trip: the saved entry (if any), that day's expenses, and the live-computed
 * expected totals (recomputed even if an entry already exists, so the panel
 * can flag if new orders landed after the entry was saved).
 */
export const getCashUpForDate = trackedQuery("cashUp.getCashUpForDate", {
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    const entry = await ctx.db
      .query("cashUpEntries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const expenses = await ctx.db
      .query("cashUpExpenses")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    const expected = await computeExpectedTotalsForDate(ctx, args.date);

    return { entry, expenses, expected };
  },
});

/**
 * Upserts the store-wide cash-up entry for `date`. `expectedTotals` is
 * always recomputed server-side (never trusted from the client) so a saved
 * discrepancy is always relative to the true order data at save time.
 */
export const saveCashUpEntry = trackedMutation("cashUp.saveCashUpEntry", {
  args: {
    token: v.string(),
    date: v.string(),
    physicalCounts: v.object({
      physical: v.number(),
      momo: v.number(),
      card: v.number(),
      voucher: v.number(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    const expectedTotals = await computeExpectedTotalsForDate(ctx, args.date);
    const discrepancies: MethodTotals = {
      physical: args.physicalCounts.physical - expectedTotals.physical,
      momo: args.physicalCounts.momo - expectedTotals.momo,
      card: args.physicalCounts.card - expectedTotals.card,
      voucher: args.physicalCounts.voucher - expectedTotals.voucher,
    };

    const existing = await ctx.db
      .query("cashUpEntries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        physicalCounts: args.physicalCounts,
        expectedTotals,
        discrepancies,
        notes: args.notes,
        staffId: user._id,
        staffName: user.name || "Unknown",
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("cashUpEntries", {
      date: args.date,
      physicalCounts: args.physicalCounts,
      expectedTotals,
      discrepancies,
      notes: args.notes,
      staffId: user._id,
      staffName: user.name || "Unknown",
      createdAt: now,
    });
  },
});

export const addCashUpExpense = trackedMutation("cashUp.addCashUpExpense", {
  args: {
    token: v.string(),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);
    return await ctx.db.insert("cashUpExpenses", {
      date: args.date,
      description: args.description,
      amount: args.amount,
      staffId: user._id,
      staffName: user.name || "Unknown",
      createdAt: Date.now(),
    });
  },
});

export const deleteCashUpExpense = trackedMutation("cashUp.deleteCashUpExpense", {
  args: { token: v.string(), expenseId: v.id("cashUpExpenses") },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);
    await ctx.db.delete(args.expenseId);
    return null;
  },
});

/** Admin/accounting history view across a date range, via the `by_date` index. */
export const listCashUpHistory = trackedQuery("cashUp.listCashUpHistory", {
  args: { token: v.string(), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);
    return await ctx.db
      .query("cashUpEntries")
      .withIndex("by_date", (q) => q.gte("date", args.startDate).lte("date", args.endDate))
      .collect();
  },
});
