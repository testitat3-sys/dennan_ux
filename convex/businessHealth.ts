import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery } from "./lib/ioTracking";
import { parseDateStrToMs, getOrdersInDateRange, getPaymentsByOrderId, attributeOrderPayments } from "./orders";

const COMPLETED_STATUSES = ["delivered", "returned", "partially_returned"];
const DAY_MS = 24 * 60 * 60 * 1000;

export const getBusinessHealthMetrics = trackedQuery("businessHealth.getBusinessHealthMetrics", {
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD"
    endDate: v.optional(v.string()), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // 1. Enforce strict Admin-only authorization
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const dayMs = DAY_MS;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;
    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;

    // 2. Fetch completed orders and attribute payments in date range
    const orders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);
    const completedOrders = orders.filter((o: any) => COMPLETED_STATUSES.includes(o.status));
    const paymentsByOrderId = await getPaymentsByOrderId(ctx, completedOrders);

    let grossRevenue = 0;
    let cashGrossRevenue = 0;
    let momoRevenue = 0;
    let cardRevenue = 0;
    let voucherRevenue = 0;

    for (const order of completedOrders) {
      const tenders = attributeOrderPayments(order, paymentsByOrderId);
      for (const t of tenders) {
        grossRevenue += t.amount;
        const methodKey = t.method === "cod" ? "physical" : t.method;
        if (methodKey === "physical") cashGrossRevenue += t.amount;
        else if (methodKey === "momo") momoRevenue += t.amount;
        else if (methodKey === "card") cardRevenue += t.amount;
        else if (methodKey === "voucher") voucherRevenue += t.amount;
      }
    }

    // 3. Compute Cost of Goods Sold (COGS) for completed orders
    let totalCogs = 0;
    let uncostedItemsCount = 0;

    for (const order of completedOrders) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      for (const item of orderItems) {
        const product = await ctx.db.get(item.productId);
        const costPrice = product && typeof product.costPrice === "number" && product.costPrice > 0 ? product.costPrice : 0;
        if (costPrice > 0) {
          totalCogs += costPrice * item.quantity;
        } else {
          uncostedItemsCount += item.quantity;
        }
      }
    }

    const grossProfit = grossRevenue - totalCogs;
    const grossMarginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // 4. Fetch daily cash-up expenses in date range
    const allDailyExpenses = await ctx.db.query("cashUpExpenses").collect();
    let totalDailyExpenses = 0;
    for (const de of allDailyExpenses) {
      const deMs = parseDateStrToMs(de.date);
      if (deMs >= rangeStartMs && deMs < rangeEndMs) {
        totalDailyExpenses += de.amount;
      }
    }

    // 5. Fetch major business expenses in date range (excluding voided vouchers for audit integrity)
    const allMajorExpenses = await ctx.db
      .query("businessExpenses")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
      .collect();

    const activeMajorExpenses = allMajorExpenses.filter((e) => !e.isVoided);
    const totalMajorExpenses = activeMajorExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 6. Compute True Net Profit and Financial Margins
    const totalExpenses = totalDailyExpenses + totalMajorExpenses;
    const netProfit = grossProfit - totalExpenses;
    // Keep netRevenue for backwards compatibility
    const netRevenue = netProfit;
    const netCashInDrawer = Math.max(0, cashGrossRevenue - totalDailyExpenses);
    const netMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      cashGrossRevenue,
      momoRevenue,
      cardRevenue,
      voucherRevenue,
      totalCogs,
      grossProfit,
      grossMarginPercent,
      totalDailyExpenses,
      totalMajorExpenses,
      totalExpenses,
      netProfit,
      netRevenue,
      netCashInDrawer,
      netMarginPercent,
      completedOrdersCount: completedOrders.length,
      majorExpensesCount: activeMajorExpenses.length,
      uncostedItemsCount,
    };
  },
});
