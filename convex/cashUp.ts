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
// `date`, and deducts refunds issued on `date` per payment method.
async function computeExpectedTotalsForDate(ctx: QueryCtx, date: string): Promise<{ totals: MethodTotals; refunds: MethodTotals }> {
  const rangeStartMs = parseDateStrToMs(date);
  const rangeEndMs = rangeStartMs + DAY_MS;

  const orders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);
  const completedOrders = orders.filter((o: any) => COMPLETED_STATUSES.includes(o.status));
  const paymentsByOrderId = await getPaymentsByOrderId(ctx, completedOrders);

  const totals = zeroTotals();
  const refunds = zeroTotals();

  for (const order of completedOrders) {
    const tenders = attributeOrderPayments(order, paymentsByOrderId);
    for (const t of tenders) {
      const methodKey = t.method === "cod" ? "physical" : t.method;
      if (methodKey in totals) {
        totals[methodKey as keyof MethodTotals] += t.amount;
      }
    }
  }

  // Fetch returns & refunds processed on this date
  const returnsInRange = await ctx.db
    .query("returns")
    .filter((q) => q.and(q.gte(q.field("createdAt"), rangeStartMs), q.lt(q.field("createdAt"), rangeEndMs)))
    .collect();

  for (const ret of returnsInRange) {
    const order = await ctx.db.get(ret.orderId);
    if (ret.refundAmount && ret.refundAmount > 0) {
      const methodKey = (order?.paymentMethod === "cod" ? "physical" : order?.paymentMethod) || "physical";
      if (methodKey in refunds) {
        refunds[methodKey as keyof MethodTotals] += ret.refundAmount;
        totals[methodKey as keyof MethodTotals] = Math.max(0, totals[methodKey as keyof MethodTotals] - ret.refundAmount);
      }
    }
    if (ret.topUpAmount && ret.topUpAmount > 0) {
      const topUpKey = (ret.topUpMethod === "cod" ? "physical" : ret.topUpMethod) || "physical";
      if (topUpKey in totals) {
        totals[topUpKey as keyof MethodTotals] += ret.topUpAmount;
      }
    }
  }

  return { totals, refunds };
}

/**
 * Live-computed expected totals for a date, without persisting anything.
 */
export const getExpectedTotalsForDate = trackedQuery("cashUp.getExpectedTotalsForDate", {
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);
    const { totals } = await computeExpectedTotalsForDate(ctx, args.date);
    return totals;
  },
});

/**
 * Everything the Balance Books panel needs for one day in a single round
 * trip: the saved entry (if any), that day's expenses, live-computed
 * expected totals, and refunds breakdown per payment method.
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

    const { totals: expected, refunds } = await computeExpectedTotalsForDate(ctx, args.date);

    return { entry, expenses, expected, refunds };
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

    const { totals: expectedTotals } = await computeExpectedTotalsForDate(ctx, args.date);
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
