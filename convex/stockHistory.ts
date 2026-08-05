import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";
import { applyStockCounterDelta } from "./stockCounters";

const READ_TAKE_LIMIT = 50;

export type StockHistorySource =
  | "manual_adjust"
  | "stock_request_approval"
  | "bulk_upload"
  | "customer_sale"
  | "customer_return"
  | "exchange_in"
  | "exchange_out"
  | "delivery_failure_restock"
  | "physical_audit"
  | "direct_admin_edit"
  | "order_cancellation"
  | "vendor_receipt";

/**
 * Logs one stock-quantity change for a product into an immutable audit ledger.
 * No-ops when the quantity didn't actually move. Retains complete historical
 * audit trail indefinitely for compliance and financial accountability.
 */
export async function recordStockHistory(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    productName: string;
    barcode?: string;
    before: number;
    after: number;
    source: StockHistorySource;
    reasonCode?: string;
    actorId?: Id<"users">;
    actorName: string;
    orderId?: Id<"orders">;
    returnId?: Id<"returns">;
    requestId?: Id<"stockRequests">;
    unitCost?: number;
    note?: string;
  }
) {
  if (args.before === args.after) return;

  await ctx.db.insert("stockHistory", {
    productId: args.productId,
    productName: args.productName,
    barcode: args.barcode,
    delta: args.after - args.before,
    beforeInventory: args.before,
    afterInventory: args.after,
    source: args.source,
    reasonCode: args.reasonCode,
    actorId: args.actorId,
    actorName: args.actorName,
    orderId: args.orderId,
    returnId: args.returnId,
    requestId: args.requestId,
    unitCost: args.unitCost,
    note: args.note,
    createdAt: Date.now(),
  });
}

/**
 * Admin/Stock Manager: record a physical stock audit / cycle count.
 * Calculates variance (physicalCount - expected), patches product inventory,
 * syncs stock counters, and logs the change to stockHistory.
 */
export const recordPhysicalAudit = trackedMutation("stockHistory.recordPhysicalAudit", {
  args: {
    token: v.string(),
    productId: v.id("products"),
    physicalCount: v.number(),
    reasonCode: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);

    if (args.physicalCount < 0) {
      throw new Error("Physical count cannot be negative");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const beforeInv = product.inventory ?? 0;
    const afterInv = args.physicalCount;
    const delta = afterInv - beforeInv;

    if (delta === 0) {
      return { success: true, message: "No inventory variance detected", delta: 0 };
    }

    const now = Date.now();
    await ctx.db.patch(args.productId, {
      inventory: afterInv,
      updatedAt: now,
    });

    await applyStockCounterDelta(
      ctx,
      { inventory: beforeInv, reorderPoint: product.reorderPoint },
      { inventory: afterInv, reorderPoint: product.reorderPoint },
      product._id
    );

    const defaultNote = `Physical audit variance: expected ${beforeInv}, counted ${afterInv} (delta: ${delta > 0 ? "+" : ""}${delta})`;
    const reasonCode = args.reasonCode || (delta < 0 ? "PHYSICAL_AUDIT_SHRINKAGE" : "PHYSICAL_AUDIT_SURPLUS");

    await recordStockHistory(ctx, {
      productId: product._id,
      productName: product.name,
      barcode: product.barcode,
      before: beforeInv,
      after: afterInv,
      source: "physical_audit",
      reasonCode,
      actorId: user._id,
      actorName: user.name || "Staff",
      unitCost: product.costPrice,
      note: args.note ? `${args.note} (${defaultNote})` : defaultNote,
    });

    return {
      success: true,
      productId: product._id,
      beforeInventory: beforeInv,
      afterInventory: afterInv,
      variance: delta,
    };
  },
});

/**
 * Admin-only: most recent stock changes for a single product, newest first.
 */
export const getProductStockHistory = trackedQuery("stockHistory.getProductStockHistory", {
  args: { token: v.string(), productId: v.id("products") },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);
    return await ctx.db
      .query("stockHistory")
      .withIndex("by_productId_and_createdAt", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(READ_TAKE_LIMIT);
  },
});

/**
 * Admin-only: paginated store-wide feed of every logged stock change,
 * newest first — the "master" view across all products, so admins don't
 * have to open each product's history individually. Optionally narrowed to
 * one source or one reasonCode.
 */
export const getStockHistoryFeed = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
    source: v.optional(
      v.union(
        v.literal("manual_adjust"),
        v.literal("stock_request_approval"),
        v.literal("bulk_upload"),
        v.literal("customer_sale"),
        v.literal("customer_return"),
        v.literal("exchange_in"),
        v.literal("exchange_out"),
        v.literal("delivery_failure_restock"),
        v.literal("physical_audit"),
        v.literal("direct_admin_edit"),
        v.literal("order_cancellation"),
        v.literal("vendor_receipt")
      )
    ),
    reasonCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);
    if (args.reasonCode) {
      const reasonCode = args.reasonCode;
      return await ctx.db
        .query("stockHistory")
        .withIndex("by_reasonCode_and_createdAt", (q) => q.eq("reasonCode", reasonCode))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    if (args.source) {
      const source = args.source;
      return await ctx.db
        .query("stockHistory")
        .withIndex("by_source_and_createdAt", (q) => q.eq("source", source))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("stockHistory")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Admin/Stock Manager: Fetch stock history events within a date range (YYYY-MM-DD).
 */
export const adminGetStockHistoryByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "accounting"]);
    const startMs = new Date(`${args.startDate}T00:00:00`).getTime() - 86400000;
    const endMs = new Date(`${args.endDate}T23:59:59.999`).getTime() + 86400000;
    const cap = 1000;

    const rows = await ctx.db
      .query("stockHistory")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startMs).lte("createdAt", endMs))
      .order("desc")
      .take(cap);

    const filtered = rows.filter((row) => {
      const d = new Date(row.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;
      if (dateStr < args.startDate || dateStr > args.endDate) return false;
      if (args.source && row.source !== args.source) return false;
      return true;
    });

    // The ±1 day padding means some capped-out reads may be padding rows we'd
    // have filtered out anyway; treat hitting the cap as a signal worth
    // surfacing rather than trying to prove real data was dropped.
    return { rows: filtered, truncated: rows.length >= cap, cap };
  },
});

/**
 * Admin/Stock Manager: Summarize stock activity per calendar day for a given month/year.
 */
export const adminGetStockHistoryCalendarData = query({
  args: {
    token: v.string(),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "accounting"]);
    const startMs = new Date(args.year, args.month - 1, 1, 0, 0, 0).getTime() - 86400000;
    const endMs = new Date(args.year, args.month, 0, 23, 59, 59).getTime() + 86400000;
    const cap = 2000;

    const rows = await ctx.db
      .query("stockHistory")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startMs).lte("createdAt", endMs))
      .take(cap);

    const summaryByDate: Record<string, { count: number; added: number; removed: number }> = {};

    for (const row of rows) {
      const d = new Date(row.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      if (!summaryByDate[dateStr]) {
        summaryByDate[dateStr] = { count: 0, added: 0, removed: 0 };
      }
      summaryByDate[dateStr].count += 1;
      if (row.delta > 0) {
        summaryByDate[dateStr].added += row.delta;
      } else {
        summaryByDate[dateStr].removed += Math.abs(row.delta);
      }
    }

    // Hitting the cap means some days in this month may be undercounted;
    // surface that instead of silently returning a partial summary.
    return { summary: summaryByDate, truncated: rows.length >= cap, cap };
  },
});


