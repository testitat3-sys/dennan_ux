import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { normalizeProductPrice } from "./products";

export const getCartItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Hydrate cart items with product details
    const hydratedCart = await Promise.all(
      cartItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product: normalizeProductPrice(product),
        };
      })
    );

    // Filter out items where the product was deleted
    return hydratedCart.filter((item) => item.product !== null);
  },
});

export const addToCart = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    size: v.optional(v.string()),
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

    // Check inventory if available
    let qtyToAdd = args.quantity;
    if (product.inventory !== undefined) {
      qtyToAdd = Math.min(qtyToAdd, product.inventory);
      if (qtyToAdd <= 0) {
          throw new Error("Product is out of stock");
      }
    }

    const existingCartItem = await ctx.db
      .query("cartItems")
      .withIndex("by_user_and_product", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .filter((q) => q.eq(q.field("size"), args.size))
      .first();

    if (existingCartItem) {
      let newQty = existingCartItem.quantity + qtyToAdd;
      if (product.inventory !== undefined) {
         newQty = Math.min(newQty, product.inventory);
      }
      await ctx.db.patch(existingCartItem._id, {
        quantity: newQty,
      });
    } else {
      await ctx.db.insert("cartItems", {
        userId,
        productId: args.productId,
        quantity: qtyToAdd,
        size: args.size,
        addedAt: Date.now(),
      });
    }
  },
});

export const updateQuantity = mutation({
  args: {
    cartItemId: v.id("cartItems"),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new Error("Cart item not found");
    }

    const product = await ctx.db.get(cartItem.productId);
    if (!product) {
       throw new Error("Product not found");
    }

    let newQty = Math.max(1, cartItem.quantity + args.delta);
    
    if (product.inventory !== undefined) {
       newQty = Math.min(newQty, product.inventory);
    }

    await ctx.db.patch(cartItem._id, {
      quantity: newQty,
    });
  },
});

export const removeFromCart = mutation({
  args: {
    cartItemId: v.id("cartItems"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const cartItem = await ctx.db.get(args.cartItemId);
    if (cartItem && cartItem.userId === userId) {
      await ctx.db.delete(cartItem._id);
    }
  },
});

export const mergeGuestCart = mutation({
  args: {
    guestCartItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        size: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    for (const guestItem of args.guestCartItems) {
      const product = await ctx.db.get(guestItem.productId);
      if (!product || !product.isActive) {
        continue; // Skip deleted or inactive products
      }

      let qtyToAdd = guestItem.quantity;
      if (product.inventory !== undefined) {
         qtyToAdd = Math.min(qtyToAdd, product.inventory);
      }
      
      if (qtyToAdd <= 0) continue;

      const existingCartItem = await ctx.db
        .query("cartItems")
        .withIndex("by_user_and_product", (q) =>
          q.eq("userId", userId).eq("productId", guestItem.productId)
        )
        .filter((q) => q.eq(q.field("size"), guestItem.size))
        .first();

      if (existingCartItem) {
        let newQty = existingCartItem.quantity + qtyToAdd;
        if (product.inventory !== undefined) {
            newQty = Math.min(newQty, product.inventory);
        }
        await ctx.db.patch(existingCartItem._id, {
          quantity: newQty,
        });
      } else {
        await ctx.db.insert("cartItems", {
          userId,
          productId: guestItem.productId,
          quantity: qtyToAdd,
          size: guestItem.size,
          addedAt: Date.now(),
        });
      }
    }
    
    return { success: true };
  },
});

export const getGuestCartDetails = query({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        size: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const hydratedCart = await Promise.all(
      args.items.map(async (item) => {
        try {
          const product = await ctx.db.get(item.productId);
          return {
            ...item,
            product: normalizeProductPrice(product),
          };
        } catch (e) {
          return { ...item, product: null };
        }
      })
    );

    // Filter out items where the product was deleted or is inactive
    return hydratedCart.filter((item) => item.product !== null && item.product.isActive);
  },
});

