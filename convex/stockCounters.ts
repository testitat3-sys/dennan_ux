import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { verifyStaffSession } from "./staffAuth";
import { shouldKeepProduct } from "./products";

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
 */
export async function applyStockCounterDelta(
  ctx: MutationCtx,
  before: { inventory: number | undefined; reorderPoint: number | undefined } | null,
  after: { inventory: number | undefined; reorderPoint: number | undefined }
) {
  const newBucket = classifyStock(after.inventory, after.reorderPoint);
  const oldBucket = before ? classifyStock(before.inventory, before.reorderPoint) : null;
  if (oldBucket === newBucket) return;

  const counters = await getOrInitCounters(ctx);
  const patch: Record<string, number> = {};
  if (oldBucket) patch[oldBucket] = Math.max(0, (counters as any)[oldBucket] - 1);
  patch[newBucket] = (patch[newBucket] !== undefined ? patch[newBucket] : (counters as any)[newBucket]) + 1;
  await ctx.db.patch(counters._id, patch);
}

export const getStockSummary = query({
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
