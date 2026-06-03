import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateCouponInternal } from "./coupons";
import { normalizeProductPrice } from "./products";
import { internal } from "./_generated/api";

export const placeOrder = mutation({
  args: {
    paymentMethod: v.string(),
    momoPhone: v.optional(v.string()),
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
    }),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 1. Fetch active cart items directly from the database (DO NOT trust cart details from frontend!)
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cannot place an order with an empty cart");
    }

    // 2. Compute subtotal directly using DB prices and perform stock validation
    let computedSubtotal = 0;
    const itemsToOrder = [];
    let hasTestProduct = false;

    for (const item of cartItems) {
      const rawProduct = await ctx.db.get(item.productId);
      if (!rawProduct || !rawProduct.isActive) {
        throw new Error(`Product ${item.productId} is no longer available.`);
      }
      const product = normalizeProductPrice(rawProduct);

      if (product.slug === "pesapal-test-product") {
        hasTestProduct = true;
      }

      // Deduct inventory atomically (if applicable) and increment units sold
      const patches: { inventory?: number; unitsSold?: number } = {
        unitsSold: (product.unitsSold || 0) + item.quantity,
      };
      if (product.inventory !== undefined) {
        if (product.inventory < item.quantity) {
          throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
        }
        patches.inventory = product.inventory - item.quantity;
      }
      await ctx.db.patch(product._id, patches);

      computedSubtotal += product.price * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price, // Lock the current database price
        stage: product.stage,
        image: product.image,
      });
    }

    // 3. Process Server-Side Coupon / Discount
    let discountAmount = 0;
    let appliedCoupon = undefined;

    if (args.couponCode) {
      const couponResult = await validateCouponInternal(ctx, args.couponCode, computedSubtotal);
      if (couponResult.valid && couponResult.coupon) {
        discountAmount = couponResult.discountAmount;
        appliedCoupon = couponResult.coupon.code;

        // Increment usage count of coupon code
        await ctx.db.patch(couponResult.coupon._id, {
          usageCount: couponResult.coupon.usageCount + 1,
        });
      } else {
        // If a coupon code was sent but was invalid, reject the transaction
        throw new Error(`Failed to apply coupon: ${couponResult.error}`);
      }
    }

    // 4. Calculate Delivery Fee authoritatively (e.g. Kampala Central or Kololo = 0, others = 5000 UGX)
    let deliveryFee = 0;
    if (!hasTestProduct && args.deliveryAddress.zone !== "Kololo" && args.deliveryAddress.zone !== "Kampala Central") {
       deliveryFee = 5000; // Securely calculated fee
    }

    const grandTotal = computedSubtotal - discountAmount + deliveryFee;

    // 5. Create the Order securely
    const orderId = await ctx.db.insert("orders", {
      userId,
      status: "pending_payment",
      paymentMethod: args.paymentMethod,
      momoPhone: args.momoPhone,
      deliveryAddress: args.deliveryAddress,
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee,
      grandTotal,
      couponApplied: appliedCoupon,
      createdAt: Date.now(),
    });

    // 6. Save line items snapshots (locks price and details at checkout)
    for (const item of itemsToOrder) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // 7. Clear the user's cart on completion
    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }

    // 7.5. Award Loyalty Points and Create Transaction record
    const earnedPoints = Math.floor(grandTotal / 1000);
    if (earnedPoints > 0) {
      const user = await ctx.db.get(userId);
      if (user) {
        const currentPoints = user.loyaltyPoints || 0;
        const newPoints = currentPoints + earnedPoints;
        
        // Tier thresholds: bronze (0-99), silver (100-249), gold (250-499), platinum (500+)
        let loyaltyTier = user.loyaltyTier || "bronze";
        if (newPoints >= 500) {
          loyaltyTier = "platinum";
        } else if (newPoints >= 250) {
          loyaltyTier = "gold";
        } else if (newPoints >= 100) {
          loyaltyTier = "silver";
        }

        await ctx.db.patch(userId, {
          loyaltyPoints: newPoints,
          loyaltyTier,
        });

        await ctx.db.insert("loyaltyTransactions", {
          userId,
          points: earnedPoints,
          type: "earned",
          description: `Earned from purchase (Order #${orderId})`,
          createdAt: Date.now(),
        });
      }
    }

    // 8. Recalculate and update user preferences in background mutation
    try {
      await ctx.runMutation(internal.users.recalculateUserBehavioralPreferences, { userId });
    } catch (err) {
      console.error("[orders.ts] Failed to recalculate user preferences:", err);
    }

    return {
      success: true,
      orderId,
      grandTotal,
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee,
      items: itemsToOrder,
    };
  },
});

export const getOrderForPayment = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

export const getOrderForClient = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== userId) {
      return null;
    }
    return order;
  },
});

export const updateOrderWithPesapalDetails = internalMutation({
  args: {
    orderId: v.id("orders"),
    pesapalTrackingId: v.string(),
    pesapalMerchantReference: v.string(),
    pesapalRedirectUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      pesapalTrackingId: args.pesapalTrackingId,
      pesapalMerchantReference: args.pesapalMerchantReference,
      pesapalRedirectUrl: args.pesapalRedirectUrl,
    });
  },
});

export const updateOrderStatus = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(v.literal("preparing"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: args.status,
    });
  },
});
