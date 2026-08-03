import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { verifyStaffSession } from "./staffAuth";

function formatBarcode(year: number, seq: number): string {
  return `${year}${String(seq).padStart(3, "0")}`;
}

async function getOrInitBarcodeCounter(ctx: MutationCtx, year: number) {
  const existing = await ctx.db
    .query("barcodeCounters")
    .withIndex("by_year", (q) => q.eq("year", year))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("barcodeCounters", { year, lastSeq: 0 });
  return (await ctx.db.get(id))!;
}

/**
 * Atomically allocates and returns the next barcode for the current year,
 * e.g. "2026087". Single read + single patch — never scans the products
 * table. Call this from createProduct (see convex/products.ts).
 */
export async function allocateNextBarcode(ctx: MutationCtx): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await getOrInitBarcodeCounter(ctx, year);
  const nextSeq = counter.lastSeq + 1;
  await ctx.db.patch(counter._id, { lastSeq: nextSeq });
  return formatBarcode(year, nextSeq);
}

/**
 * Read-only preview of the barcode that will be assigned to the next
 * created product. Does NOT increment the counter, so it can drift by one
 * if another admin saves first — createProduct always allocates the true
 * next value at save time, so this is for display only.
 */
export const getNextBarcodePreview = query({
  args: { token: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "stockManager", "productEditor"]);
    const year = new Date().getFullYear();
    const counter = await ctx.db
      .query("barcodeCounters")
      .withIndex("by_year", (q) => q.eq("year", year))
      .unique();
    const nextSeq = (counter?.lastSeq ?? 0) + 1;
    return formatBarcode(year, nextSeq);
  },
});

/**
 * One-time/maintenance tool — sets the counter for a given year to a known
 * starting sequence (e.g. to align with the highest pre-existing "{year}NNN"
 * barcode already present in the data). NOT called from the app; run
 * manually via `npx convex run barcodeCounters:seedBarcodeCounter '{"year": 2026, "lastSeq": 86}'`.
 */
export const seedBarcodeCounter = internalMutation({
  args: { year: v.number(), lastSeq: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("barcodeCounters")
      .withIndex("by_year", (q) => q.eq("year", args.year))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeq: args.lastSeq });
    } else {
      await ctx.db.insert("barcodeCounters", { year: args.year, lastSeq: args.lastSeq });
    }
    return { year: args.year, lastSeq: args.lastSeq };
  },
});
