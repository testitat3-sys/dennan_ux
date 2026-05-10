import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getWishlistItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Hydrate wishlist items with product details
    const hydratedWishlist = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    // Filter out items where the product was deleted
    return hydratedWishlist.filter((item) => item.product !== null);
  },
});

export const addToWishlist = mutation({
  args: {
    productId: v.id("products"),
    notifyBackInStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if product is already in the user's wishlist
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();

    const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;
    const shouldNotify = args.notifyBackInStock ?? isOutOfStock;

    if (existing) {
      // If already exists, update notify status if provided
      await ctx.db.patch(existing._id, {
        notifyBackInStock: shouldNotify,
      });
      return existing._id;
    } else {
      const insertedId = await ctx.db.insert("wishlistItems", {
        userId,
        productId: args.productId,
        notifyBackInStock: shouldNotify,
        addedAt: Date.now(),
      });
      return insertedId;
    }
  },
});

export const removeFromWishlist = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();

    if (item) {
      await ctx.db.delete(item._id);
    }
    return { success: true };
  },
});

export const mergeGuestWishlist = mutation({
  args: {
    guestProductIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    for (const productId of args.guestProductIds) {
      const product = await ctx.db.get(productId);
      if (!product || !product.isActive) {
        continue;
      }

      const existing = await ctx.db
        .query("wishlistItems")
        .withIndex("by_user_and_product", (q) =>
          q.eq("userId", userId).eq("productId", productId)
        )
        .first();

      if (!existing) {
        const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;
        await ctx.db.insert("wishlistItems", {
          userId,
          productId,
          notifyBackInStock: isOutOfStock,
          addedAt: Date.now(),
        });
      }
    }
    return { success: true };
  },
});

export const getGuestWishlistDetails = query({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const hydratedWishlist = await Promise.all(
      args.productIds.map(async (productId) => {
        try {
          const product = await ctx.db.get(productId);
          return {
            productId,
            product,
          };
        } catch (e) {
          return { productId, product: null };
        }
      })
    );

    return hydratedWishlist.filter((item) => item.product !== null && item.product.isActive);
  },
});
