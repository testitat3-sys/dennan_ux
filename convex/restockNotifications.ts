import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

function stripBrandFromName(name: string, brand: string | undefined): string {
  if (!name || !brand?.trim()) return name;
  const escaped = brand.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = name.replace(new RegExp(`^\\s*${escaped}\\s+`, "i"), "").trim();
  return stripped || name;
}

export const getWishlistersToNotify = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return { product: null, recipients: [] };

    const allItemsForProduct = await ctx.db
      .query("wishlistItems")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    const items = allItemsForProduct.filter(
      (item) => item.notifyBackInStock === true && item.notifiedAt === undefined
    );

    const recipients = await Promise.all(
      items.map(async (item) => {
        const user = await ctx.db.get(item.userId);
        return { wishlistItemId: item._id, email: user?.email };
      })
    );

    return {
      product: { name: product.name, brand: product.brand },
      recipients: recipients.filter((r) => !!r.email) as { wishlistItemId: Id<"wishlistItems">; email: string }[],
    };
  },
});

export const markNotified = internalMutation({
  args: { wishlistItemIds: v.array(v.id("wishlistItems")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.wishlistItemIds) {
      await ctx.db.patch(id, { notifiedAt: now });
    }
  },
});

export const clearRestockGuards = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const item of items) {
      if (item.notifiedAt !== undefined) {
        await ctx.db.patch(item._id, { notifiedAt: undefined });
      }
    }
  },
});

export const notifyWishlistersOnRestock = internalAction({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const { product, recipients } = await ctx.runQuery(
      internal.restockNotifications.getWishlistersToNotify,
      { productId: args.productId }
    );
    if (!product || recipients.length === 0) return;

    const displayName = stripBrandFromName(product.name, product.brand);
    const notifiedIds: Id<"wishlistItems">[] = [];

    for (const recipient of recipients) {
      try {
        await ctx.runAction(internal.emails.send, {
          to: recipient.email,
          subject: `${displayName} is back in stock`,
          text: `Good news! "${displayName}" is back in stock at Dennan. Shop now before it sells out again.`,
          html: `<p>Good news! <strong>${displayName}</strong> is back in stock at Dennan.</p><p>Shop now before it sells out again.</p>`,
        });
        notifiedIds.push(recipient.wishlistItemId);
      } catch (err) {
        console.error(`[convex/restockNotifications.ts] Failed to notify ${recipient.email}:`, err);
      }
    }

    if (notifiedIds.length > 0) {
      await ctx.runMutation(internal.restockNotifications.markNotified, { wishlistItemIds: notifiedIds });
    }
  },
});
