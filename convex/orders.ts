import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateCouponInternal } from "./coupons";

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

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} is no longer available.`);
      }

      // Verify and decrement inventory
      if (product.inventory !== undefined) {
        if (product.inventory < item.quantity) {
          throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
        }
        // Deduct inventory atomically
        await ctx.db.patch(product._id, {
          inventory: product.inventory - item.quantity,
        });
      }

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
    if (args.deliveryAddress.zone !== "Kololo" && args.deliveryAddress.zone !== "Kampala Central") {
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
