import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { verifyStaffSession } from "./staffAuth";
import { shouldKeepProduct } from "./products";
import { trackedQuery } from "./lib/ioTracking";

type StockBucket = "ok" | "low" | "out";

export function classifyStock(inventory: number | undefined, reorderPoint: number | undefined): StockBucket {
  const inv = inventory ?? 0;
  const reorder = reorderPoint ?? 0;
  if (inv <= 0) return "out";
  if (inv <= reorder) return "low";
  return "ok";
}

async function getOrInitCounters(ctx: MutationCtx) {
  const existing = await ctx.db.query("stockCounters").first();
  if (existing) return existing;
  const id = await ctx.db.insert("stockCounters", { ok: 0, low: 0, out: 0 });
  return (await ctx.db.get(id))!;
}

/**
 * Call this alongside any write to a product's `inventory` or `reorderPoint`
 * to keep the {ok, low, out} singleton in sync incrementally, without ever
 * scanning the products table. Pass `before: null` for a fresh insert.
 *
 * Also the single choke point for every inventory-changing code path, so it
 * doubles as the restock-detection hook: an "out" -> non-"out" transition
 * schedules back-in-stock emails to wishlisters, and the reverse clears the
 * per-restock notification guard so the next restock notifies again.
 */
export async function applyStockCounterDelta(
  ctx: MutationCtx,
  before: { inventory: number | undefined; reorderPoint: number | undefined } | null,
  after: { inventory: number | undefined; reorderPoint: number | undefined },
  productId?: Id<"products">
) {
  const newBucket = classifyStock(after.inventory, after.reorderPoint);
  const oldBucket = before ? classifyStock(before.inventory, before.reorderPoint) : null;

  if (productId && oldBucket !== newBucket) {
    if (oldBucket === "out" && newBucket !== "out") {
      await ctx.scheduler.runAfter(0, internal.restockNotifications.notifyWishlistersOnRestock, { productId });
    } else if (oldBucket !== "out" && newBucket === "out") {
      await ctx.scheduler.runAfter(0, internal.restockNotifications.clearRestockGuards, { productId });
    }
  }

  if (oldBucket === newBucket) return;

  const counters = await getOrInitCounters(ctx);
  const patch: Record<string, number> = {};
  if (oldBucket) patch[oldBucket] = Math.max(0, (counters as any)[oldBucket] - 1);
  patch[newBucket] = (patch[newBucket] !== undefined ? patch[newBucket] : (counters as any)[newBucket]) + 1;
  await ctx.db.patch(counters._id, patch);
}

export const getStockSummary = trackedQuery("stockCounters.getStockSummary", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager"]);
    const counters = await ctx.db.query("stockCounters").first();
    return counters ? { ok: counters.ok, low: counters.low, out: counters.out } : { ok: 0, low: 0, out: 0 };
  },
});

/**
 * One-time/maintenance tool — rebuilds the stockCounters singleton from
 * scratch by walking the entire products table. NOT called from the app;
 * run manually via `npx convex run stockCounters:recomputeStockCounters`
 * after this feature ships, or after bulk operations (migrations, seeds)
 * that could have drifted the live counters.
 */
export const recomputeStockCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let ok = 0, low = 0, out = 0;
    for (const p of products) {
      if (!shouldKeepProduct(p, true)) continue;
      const bucket = classifyStock(p.inventory, p.reorderPoint);
      if (bucket === "ok") ok++;
      else if (bucket === "low") low++;
      else out++;
    }
    const existing = await ctx.db.query("stockCounters").first();
    if (existing) {
      await ctx.db.patch(existing._id, { ok, low, out });
    } else {
      await ctx.db.insert("stockCounters", { ok, low, out });
    }
    return { ok, low, out };
  },
});
