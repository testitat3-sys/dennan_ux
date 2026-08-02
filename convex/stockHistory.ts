import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery } from "./lib/ioTracking";

const CAP_PER_PRODUCT = 30;

/**
 * Logs one stock-quantity change for a product. No-ops when the quantity
 * didn't actually move. Self-prunes rows past CAP_PER_PRODUCT for this
 * product on every insert, mirroring convex/errorLogs.ts's cap pattern but
 * scoped per-product so total table size stays bounded regardless of
 * catalogue size.
 */
export async function recordStockHistory(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    productName: string;
    barcode?: string;
    before: number;
    after: number;
    source: "manual_adjust" | "stock_request_approval" | "bulk_upload";
    actorId?: Id<"users">;
    actorName: string;
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
    actorId: args.actorId,
    actorName: args.actorName,
    note: args.note,
    createdAt: Date.now(),
  });

  const rows = await ctx.db
    .query("stockHistory")
    .withIndex("by_productId_and_createdAt", (q) => q.eq("productId", args.productId))
    .order("asc")
    .take(CAP_PER_PRODUCT + 1);
  if (rows.length > CAP_PER_PRODUCT) {
    const overflow = rows.slice(0, rows.length - CAP_PER_PRODUCT);
    for (const row of overflow) {
      await ctx.db.delete(row._id);
    }
  }
}

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
      .take(CAP_PER_PRODUCT);
  },
});

/**
 * Admin-only: paginated store-wide feed of every logged stock change,
 * newest first — the "master" view across all products, so admins don't
 * have to open each product's history individually. Optionally narrowed to
 * one source (manual_adjust / stock_request_approval / bulk_upload).
 *
 * Plain `query`, not `trackedQuery` — the latter wraps its return as
 * `{ data, _io }`, which breaks `usePaginatedQuery` on the client (it
 * expects the raw `{ page, isDone, continueCursor }` shape straight from
 * `.paginate()`). Same reason `orders.adminGetOrdersByDateRange` is plain.
 */
export const getStockHistoryFeed = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
    source: v.optional(
      v.union(
        v.literal("manual_adjust"),
        v.literal("stock_request_approval"),
        v.literal("bulk_upload")
      )
    ),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);
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
