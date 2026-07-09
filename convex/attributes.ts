/**
 * Generic, append-only tagging helper for products and orders.
 *
 * Lets new one-off classifications be introduced without a schema migration
 * or backfill — just call appendAttribute with a new `key`. Every new key
 * must get a matching entry in convex/ATTRIBUTES.md in the same change.
 */

type AttributableTable = "products" | "orders";

export async function appendAttribute(
  ctx: { db: any },
  table: AttributableTable,
  id: any,
  key: string,
  value?: string
): Promise<void> {
  const doc = await ctx.db.get(id);
  if (!doc) return;
  const attributes = Array.isArray(doc.attributes) ? doc.attributes : [];
  await ctx.db.patch(id, {
    attributes: [...attributes, { key, value, setAt: Date.now() }],
  });
}
