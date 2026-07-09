import { v, ConvexError } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateCouponInternal } from "./coupons";
import { normalizeProductPrice, shouldKeepProduct } from "./products";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { verifyStaffSession } from "./staffAuth";
import { generateUniqueVoucherCode } from "./giftVouchers";
import { computeDeliveryQuote, computeDeliveryQuoteByName } from "./delivery";

async function syncStockDeductionByBarcode(
  ctx: MutationCtx,
  product: any,
  quantity: number
) {
  const productsToUpdate = [product];
  if (product.barcode) {
    const matchingProducts = await ctx.db
      .query("products")
      .withIndex("by_barcode", (q: any) => q.eq("barcode", product.barcode))
      .collect();
    const seenIds = new Set([product._id]);
    for (const p of matchingProducts) {
      if (!seenIds.has(p._id)) {
        seenIds.add(p._id);
        productsToUpdate.push(normalizeProductPrice(p));
      }
    }
  }

  for (const pToUpdate of productsToUpdate) {
    if (pToUpdate.inventory !== undefined) {
      const newInventory = Math.max(0, pToUpdate.inventory - quantity);
      await ctx.db.patch(pToUpdate._id, {
        inventory: newInventory,
        unitsSold: (pToUpdate.unitsSold || 0) + quantity,
      });
    } else {
      await ctx.db.patch(pToUpdate._id, {
        unitsSold: (pToUpdate.unitsSold || 0) + quantity,
      });
    }
  }
}

export const placeOrder = mutation({

  args: {
    paymentMethod: v.string(),
    momoPhone: v.optional(v.string()),
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      distance: v.optional(v.number()), // client-reported road distance; only ever used inside a sanity-check window, never trusted directly
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
      if (!rawProduct || !rawProduct.isActive || !shouldKeepProduct(rawProduct)) {
        throw new Error(`Product ${item.productId} is no longer available.`);
      }
      const product = normalizeProductPrice(rawProduct);

      if (product.slug === "pesapal-test-product" || product.slug === "developer-product") {
        hasTestProduct = true;
      }

      // Deduct inventory atomically (if applicable) and increment units sold
      if (product.inventory !== undefined && product.inventory < item.quantity) {
        throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
      }
      await syncStockDeductionByBarcode(ctx, product, item.quantity);

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

    // 4. Calculate Delivery Fee authoritatively
    let deliveryFee = 0;
    let distance: number | undefined = undefined;
    let resolvedZone = args.deliveryAddress.zone;
    let etaMinutes: number | undefined = undefined;
    if (!hasTestProduct) {
      const feeRes = await calculateDeliveryFeeAndDistance(
        ctx,
        args.deliveryAddress.zone,
        args.deliveryAddress.name,
        args.deliveryAddress.lat,
        args.deliveryAddress.lng,
        args.deliveryAddress.distance
      );
      deliveryFee = feeRes.deliveryFee;
      distance = feeRes.distance;
      resolvedZone = feeRes.zone;
      etaMinutes = feeRes.etaMinutes;
    }

    const grandTotal = computedSubtotal - discountAmount + deliveryFee;

    // 5. Create the Order securely
    const isCod = args.paymentMethod === "cod";
    const orderId = await ctx.db.insert("orders", {
      userId,
      status: isCod ? "pending_cod" : "pending_payment",
      paymentMethod: args.paymentMethod,
      momoPhone: args.momoPhone,
      deliveryAddress: {
        ...args.deliveryAddress,
        zone: resolvedZone,
        deliveryFee,
        distance,
        etaMinutes,
      },
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee,
      grandTotal,
      couponApplied: appliedCoupon,
      createdAt: Date.now(),
      channel: "online",
      isOnline: true,
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
      isCod,
    };
  },
});

export const placeGuestOrder = mutation({

  args: {
    guestName: v.string(),
    guestEmail: v.string(),
    guestPhone: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        size: v.optional(v.string()),
      })
    ),
    paymentMethod: v.string(),
    momoPhone: v.optional(v.string()),
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      distance: v.optional(v.number()),
    }),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Cannot place an order with an empty cart");
    }

    // 1. Resolve or create the guest customer user document (same pattern as
    // createPhysicalOrder's walk-in customer resolution below).
    let guestUser = null;

    if (args.guestPhone) {
      const allUsers = await ctx.db.query("users").collect();
      guestUser = allUsers.find((u) => u.phone === args.guestPhone) || null;
    }

    if (!guestUser && args.guestEmail) {
      guestUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.guestEmail))
        .first();
    }

    if (!guestUser) {
      const newUserId = await ctx.db.insert("users", {
        name: args.guestName,
        phone: args.guestPhone,
        email: args.guestEmail,
        isWalkIn: true,
        isOnboarded: true,
      });
      guestUser = await ctx.db.get(newUserId);
    }

    if (!guestUser) {
      throw new Error("Failed to resolve or create guest customer");
    }
    const guestUserId = guestUser._id;

    // 2. Validate stock/pricing directly from the DB using client-provided item
    // references (guest carts are never persisted server-side, unlike the
    // authenticated cartItems table used by placeOrder).
    let computedSubtotal = 0;
    const itemsToOrder = [];
    let hasTestProduct = false;

    for (const item of args.items) {
      const rawProduct = await ctx.db.get(item.productId);
      if (!rawProduct || !rawProduct.isActive || !shouldKeepProduct(rawProduct)) {
        throw new Error(`Product ${item.productId} is no longer available.`);
      }
      const product = normalizeProductPrice(rawProduct);

      if (product.slug === "pesapal-test-product" || product.slug === "developer-product") {
        hasTestProduct = true;
      }

      if (product.inventory !== undefined && product.inventory < item.quantity) {
        throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
      }
      await syncStockDeductionByBarcode(ctx, product, item.quantity);

      computedSubtotal += product.price * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price,
        stage: product.stage,
        image: product.image,
      });
    }

    // 3. Server-side coupon validation
    let discountAmount = 0;
    let appliedCoupon = undefined;

    if (args.couponCode) {
      const couponResult = await validateCouponInternal(ctx, args.couponCode, computedSubtotal);
      if (couponResult.valid && couponResult.coupon) {
        discountAmount = couponResult.discountAmount;
        appliedCoupon = couponResult.coupon.code;

        await ctx.db.patch(couponResult.coupon._id, {
          usageCount: couponResult.coupon.usageCount + 1,
        });
      } else {
        throw new Error(`Failed to apply coupon: ${couponResult.error}`);
      }
    }

    // 4. Authoritative delivery fee
    let deliveryFee = 0;
    let distance: number | undefined = undefined;
    let resolvedZone = args.deliveryAddress.zone;
    let etaMinutes: number | undefined = undefined;
    if (!hasTestProduct) {
      const feeRes = await calculateDeliveryFeeAndDistance(
        ctx,
        args.deliveryAddress.zone,
        args.deliveryAddress.name,
        args.deliveryAddress.lat,
        args.deliveryAddress.lng,
        args.deliveryAddress.distance
      );
      deliveryFee = feeRes.deliveryFee;
      distance = feeRes.distance;
      resolvedZone = feeRes.zone;
      etaMinutes = feeRes.etaMinutes;
    }

    const grandTotal = computedSubtotal - discountAmount + deliveryFee;

    // 5. Create the order, tied to the resolved guest user
    const isCod = args.paymentMethod === "cod";
    const orderId = await ctx.db.insert("orders", {
      userId: guestUserId,
      status: isCod ? "pending_cod" : "pending_payment",
      paymentMethod: args.paymentMethod,
      momoPhone: args.momoPhone,
      deliveryAddress: {
        ...args.deliveryAddress,
        zone: resolvedZone,
        deliveryFee,
        distance,
        etaMinutes,
      },
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee,
      grandTotal,
      couponApplied: appliedCoupon,
      createdAt: Date.now(),
      channel: "online",
      isOnline: true,
    });

    // 6. Line item snapshots
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

    // 7. Award loyalty points to the resolved guest user, so a returning guest
    // (or a later account signup with a matching email) doesn't lose them.
    const earnedPoints = Math.floor(grandTotal / 1000);
    if (earnedPoints > 0) {
      const currentPoints = guestUser.loyaltyPoints || 0;
      const newPoints = currentPoints + earnedPoints;

      let loyaltyTier = guestUser.loyaltyTier || "bronze";
      if (newPoints >= 500) {
        loyaltyTier = "platinum";
      } else if (newPoints >= 250) {
        loyaltyTier = "gold";
      } else if (newPoints >= 100) {
        loyaltyTier = "silver";
      }

      await ctx.db.patch(guestUserId, {
        loyaltyPoints: newPoints,
        loyaltyTier,
      });

      await ctx.db.insert("loyaltyTransactions", {
        userId: guestUserId,
        points: earnedPoints,
        type: "earned",
        description: `Earned from purchase (Order #${orderId})`,
        createdAt: Date.now(),
      });
    }

    return {
      success: true,
      orderId,
      grandTotal,
      isCod,
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

// Public, unauthenticated tracking query for the storefront's post-purchase progress
// view. The orderId itself (an unguessable Convex Id) is the capability token — same
// trust model already used to hand a guest their order confirmation. Deliberately
// returns only what's needed to render fulfillment progress, excluding payment
// details, coordinates, and any other order/customer PII.
export const getOrderTrackingStatus = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    return {
      status: order.status,
      createdAt: order.createdAt,
      claimedAt: order.claimedAt,
      dispatchedAt: order.dispatchedAt,
      completedAt: order.completedAt,
      failedAt: order.failedAt,
      expectedDeliveryTime: order.expectedDeliveryTime,
      deliveryPersonName: order.deliveryPersonName,
      riderPhone: order.riderPhone,
      zone: order.deliveryAddress?.zone,
      etaMinutes: order.deliveryAddress?.etaMinutes,
      history: (order.history ?? []).map((h) => ({
        status: h.status,
        timestamp: h.timestamp,
      })),
    };
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

export const getOrderStatusById = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    return { status: order.status };
  },
});

// ─── Zone-based Delivery Fee Calculator ─────────────────────────────────────
// Thin wrapper around the single authoritative calculation in convex/delivery.ts,
// so placeOrder/adminCreateOrder can never be handed a fee the client made up.

export async function calculateDeliveryFeeAndDistance(
  ctx: QueryCtx | MutationCtx,
  zoneName: string,
  landmarkName?: string,
  userLat?: number,
  userLng?: number,
  clientDistanceKm?: number
): Promise<{ distance: number | undefined; deliveryFee: number; zone: string; etaMinutes: number | undefined }> {
  let lat = userLat;
  let lng = userLng;

  // If no direct coordinates, try resolving them from a matching stored landmark
  if ((lat === undefined || lng === undefined) && landmarkName) {
    const landmarks = await ctx.db.query("deliveryLandmarks").collect();
    const match = landmarks.find((l) => l.name.toLowerCase() === landmarkName.toLowerCase());
    if (match?.lat !== undefined && match?.lng !== undefined) {
      lat = match.lat;
      lng = match.lng;
    }
  }

  if (lat !== undefined && lng !== undefined) {
    const quote = await computeDeliveryQuote(ctx, {
      lat,
      lng,
      addressText: landmarkName ?? zoneName,
      clientDistanceKm,
    });
    if (quote.outOfBounds) {
      throw new ConvexError("Delivery location is out of bounds (too far)");
    }
    return { distance: quote.distanceKm, deliveryFee: quote.deliveryFee, zone: quote.zone as string, etaMinutes: quote.etaMinutes ?? undefined };
  }

  // Legacy fallback: no coordinates resolvable anywhere (e.g. staff manual order entry
  // with a bare zone name) — price off the matched zone's base distance directly.
  const quote = await computeDeliveryQuoteByName(ctx, landmarkName ?? zoneName);
  return { distance: quote.distanceKm, deliveryFee: quote.deliveryFee, zone: quote.zone as string, etaMinutes: quote.etaMinutes ?? undefined };
}

// ─── Order Fulfillment Endpoints ───

export const getOrdersForStaff = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Verifies the caller is a valid staff member or admin
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    // Query orders in reverse chronological order
    const result = await ctx.db
      .query("orders")
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = [];
    for (const order of result.page) {
      // Resolve customer details
      const customer = await ctx.db.get(order.userId);

      // Fetch matching orderItems
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      // Fetch matching orderPayments
      const payments = await ctx.db
        .query("orderPayments")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      // Resolve claimant name
      let claimantName = null;
      if (order.claimedBy) {
        const claimant = await ctx.db.get(order.claimedBy);
        claimantName = claimant?.name || null;
      }

      enrichedPage.push({
        ...order,
        customerName: customer?.name || "Unnamed Customer",
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        items,
        payments,
        claimantName,
      });
    }

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

export const getOrderDetailById = query({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const customer = await ctx.db.get(order.userId);
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    const payments = await ctx.db
      .query("orderPayments")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    let claimantName = null;
    if (order.claimedBy) {
      const claimant = await ctx.db.get(order.claimedBy);
      claimantName = claimant?.name || null;
    }

    return {
      ...order,
      customerName: customer?.name || "Unnamed Customer",
      customerEmail: customer?.email,
      customerPhone: customer?.phone,
      items,
      payments,
      claimantName,
    };
  },
});

export const getMyHandledOrders = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const result = await ctx.db
      .query("orders")
      .withIndex("by_claimedBy", (q) => q.eq("claimedBy", staffUser._id))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = [];
    for (const order of result.page) {
      const customer = await ctx.db.get(order.userId);

      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      const payments = await ctx.db
        .query("orderPayments")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      enrichedPage.push({
        ...order,
        customerName: customer?.name || "Unnamed Customer",
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        items,
        payments,
        claimantName: staffUser.name || null,
      });
    }

    return { ...result, page: enrichedPage };
  },
});

export const claimOrder = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "preparing") {
      throw new Error(`Cannot claim order in status: ${order.status}`);
    }

    const claimedAt = Date.now();
    const timeToClaim = claimedAt - order.createdAt;
    const history = order.history || [];
    history.push({
      status: "packing",
      timestamp: claimedAt,
      note: `Claimed by ${user.name}`,
    });

    await ctx.db.patch(args.orderId, {
      status: "packing",
      claimedBy: user._id,
      claimedAt,
      timeToClaim,
      history,
    });

    return { success: true };
  },
});

export const handoverToDelivery = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    deliveryPersonName: v.string(),
    riderPhone: v.string(),
    expectedDeliveryTime: v.number(), // Unix timestamp (ms)
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "packing") {
      throw new Error(`Cannot dispatch order in status: ${order.status}`);
    }

    if (!order.claimedBy || order.claimedBy !== user._id) {
      throw new Error("Only the staff member who claimed this order can hand it over to delivery");
    }

    const dispatchedAt = Date.now();
    const claimedTime = order.claimedAt ?? order.createdAt;
    const timeToDispatch = dispatchedAt - claimedTime;
    const history = order.history || [];
    history.push({
      status: "dispatched",
      timestamp: dispatchedAt,
      note: `Handed over to rider ${args.deliveryPersonName}`,
    });

    await ctx.db.patch(args.orderId, {
      status: "dispatched",
      dispatchedAt,
      timeToDispatch,
      deliveryPersonName: args.deliveryPersonName,
      riderPhone: args.riderPhone,
      expectedDeliveryTime: args.expectedDeliveryTime,
      history,
    });

    return { success: true };
  },
});

export const completeOrder = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "dispatched" && order.status !== "packing") {
      throw new Error(`Cannot complete order in status: ${order.status}`);
    }

    if (!order.claimedBy || order.claimedBy !== user._id) {
      throw new Error("Only the claiming staff member can complete this order");
    }

    const completedAt = Date.now();
    const startTime = order.dispatchedAt ?? order.claimedAt ?? order.createdAt;
    const timeToDeliver = completedAt - startTime;
    const history = order.history || [];
    history.push({
      status: "delivered",
      timestamp: completedAt,
      note: "Marked as delivered by staff",
    });

    await ctx.db.patch(args.orderId, {
      status: "delivered",
      completedAt,
      timeToDeliver,
      history,
    });

    return { success: true };
  },
});

// Replaces the old markOrderFailed: staff report a failed/undelivered order and, in
// the same atomic mutation, submit the affected items into the returns-approval
// pipeline (source: "delivery_failure"). No inventory is restocked here — that only
// happens once an admin approves each returnItems row (see convex/returns.ts).
export const reportDeliveryFailure = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    failedItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        reason: v.optional(v.string()),
      })
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "dispatched") {
      throw new Error(`Cannot mark order as failed from status: ${order.status}`);
    }

    if (!order.claimedBy || order.claimedBy !== user._id) {
      throw new Error("Only the claiming staff member can mark this order as failed");
    }

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    const orderItemsMap = new Map(orderItems.map((item) => [item.productId, item]));

    let refundAmount = 0;
    for (const failedItem of args.failedItems) {
      if (failedItem.quantity <= 0) {
        throw new Error(`Invalid failed-item quantity ${failedItem.quantity} for product ${failedItem.productId}`);
      }
      const originalItem = orderItemsMap.get(failedItem.productId);
      if (!originalItem) {
        throw new Error(`Product ${failedItem.productId} was not part of the original order`);
      }
      if (failedItem.quantity > originalItem.quantity) {
        throw new Error(
          `Cannot report ${failedItem.quantity} of product ${originalItem.productName} as failed. Ordered: ${originalItem.quantity}.`
        );
      }
      refundAmount += failedItem.quantity * originalItem.unitPrice;
    }

    const failedAt = Date.now();
    const history = order.history || [];
    history.push({
      status: "failed",
      timestamp: failedAt,
      note: args.failedItems.length > 0
        ? `Marked as failed/undelivered — ${args.failedItems.length} item(s) pending return approval`
        : "Marked as failed/undelivered",
    });

    await ctx.db.patch(args.orderId, {
      status: "failed",
      failedAt,
      history,
    });

    if (args.failedItems.length > 0) {
      const returnId = await ctx.db.insert("returns", {
        orderId: args.orderId,
        refundAmount,
        note: args.note,
        staffId: user._id,
        staffName: user.name ?? "Staff",
        createdAt: failedAt,
      });

      for (const failedItem of args.failedItems) {
        const originalItem = orderItemsMap.get(failedItem.productId)!;
        await ctx.db.insert("returnItems", {
          returnId,
          orderId: args.orderId,
          productId: failedItem.productId,
          productName: originalItem.productName,
          quantity: failedItem.quantity,
          unitPrice: originalItem.unitPrice,
          reason: failedItem.reason,
          status: "pending",
          source: "delivery_failure",
          createdAt: failedAt,
        });
      }
    }

    return { success: true };
  },
});

export const adminCreateOrder = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }),
    paymentMethod: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        size: v.optional(v.string()),
      })
    ),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Gated: Admin only
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const customer = await ctx.db.get(args.userId);
    if (!customer) {
      throw new Error("Customer user not found");
    }

    if (args.items.length === 0) {
      throw new Error("Cannot create order with zero items");
    }

    let computedSubtotal = 0;
    const itemsToOrder = [];

    // Process items & validate/deduct stock
    for (const item of args.items) {
      const rawProduct = await ctx.db.get(item.productId);
      if (!rawProduct || !rawProduct.isActive) {
        throw new Error(`Product ${item.productId} is not active or does not exist`);
      }
      const product = normalizeProductPrice(rawProduct);

      if (product.inventory !== undefined && product.inventory < item.quantity) {
        throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
      }
      await syncStockDeductionByBarcode(ctx, product, item.quantity);

      computedSubtotal += product.price * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    // Process coupon
    let discountAmount = 0;
    let appliedCoupon = undefined;
    if (args.couponCode) {
      const couponResult = await validateCouponInternal(ctx, args.couponCode, computedSubtotal);
      if (couponResult.valid && couponResult.coupon) {
        discountAmount = couponResult.discountAmount;
        appliedCoupon = couponResult.coupon.code;
        await ctx.db.patch(couponResult.coupon._id, {
          usageCount: couponResult.coupon.usageCount + 1,
        });
      }
    }

    // Calculate delivery fee using helper
    const feeRes = await calculateDeliveryFeeAndDistance(
      ctx,
      args.deliveryAddress.zone,
      args.deliveryAddress.name,
      args.deliveryAddress.lat,
      args.deliveryAddress.lng
    );

    const grandTotal = computedSubtotal - discountAmount + feeRes.deliveryFee;

    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      status: "preparing", // Admins create order directly in preparing state
      paymentMethod: args.paymentMethod,
      deliveryAddress: {
        ...args.deliveryAddress,
        zone: feeRes.zone,
        deliveryFee: feeRes.deliveryFee,
        distance: feeRes.distance,
        etaMinutes: feeRes.etaMinutes,
      },
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee: feeRes.deliveryFee,
      grandTotal,
      couponApplied: appliedCoupon,
      createdAt: Date.now(),
      channel: "online",
      isOnline: true,
    });

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

    return { success: true, orderId };
  },
});

export const createPhysicalOrder = mutation({
  args: {
    token: v.string(),
    customerName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      })
    ),
    payments: v.array(
      v.object({
        method: v.union(v.literal("physical"), v.literal("momo"), v.literal("card"), v.literal("voucher")),
        amount: v.number(),
        momoPhone: v.optional(v.string()),
        cardOrderId: v.optional(v.string()),
        voucherCode: v.optional(v.string()),
      })
    ),
    voucherItems: v.optional(
      v.array(
        v.object({
          amount: v.number(),
          expiresAt: v.number(),
          recipientName: v.optional(v.string()),
          recipientEmail: v.optional(v.string()),
        })
      )
    ),
    note: v.optional(v.string()),
    reminder: v.optional(
      v.object({
        type: v.union(v.literal("call"), v.literal("meeting"), v.literal("email"), v.literal("other")),
        note: v.string(),
        scheduledDate: v.string(),
        scheduledTime: v.optional(v.string()),
        priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
      })
    ),
    workedByStaffId: v.optional(v.id("users")),
    channel: v.optional(v.union(v.literal("walk_in"), v.literal("whatsapp"))),
    deliveryFee: v.optional(v.number()),
    deliveryLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Gated: Staff or Admin
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    if (args.items.length === 0 && (!args.voucherItems || args.voucherItems.length === 0)) {
      throw new Error("Cannot create order with zero items and zero vouchers");
    }

    const now = Date.now();
    const channel = args.channel ?? "walk_in";

    // Resolve who actually worked the sale (defaults to the logged-in staff member)
    let attributedStaff = staffUser;
    if (args.workedByStaffId && args.workedByStaffId !== staffUser._id) {
      const chosenStaff = await ctx.db.get(args.workedByStaffId);
      if (!chosenStaff || (chosenStaff.accountRole !== "staff" && chosenStaff.accountRole !== "admin")) {
        throw new Error("Selected staff member is not valid");
      }
      attributedStaff = chosenStaff;
    }

    const deliveryFee = channel === "whatsapp" ? (args.deliveryFee ?? 0) : 0;
    if (deliveryFee < 0) {
      throw new Error("Delivery fee cannot be negative");
    }

    // Per-tender validation
    for (const p of args.payments) {
      if (p.method === "card" && !p.cardOrderId?.trim()) {
        throw new Error("Card Order ID is required for card payments");
      }
      if (p.method === "momo") {
        if (!p.momoPhone?.trim()) {
          throw new Error("Mobile money phone number is required for MoMo payments");
        }
        if (!p.cardOrderId?.trim()) {
          throw new Error("Transaction ID is required for MoMo payments");
        }
      }
      if (p.method === "voucher" && !p.voucherCode?.trim()) {
        throw new Error("Voucher code is required for voucher payments");
      }
    }

    // 1. Resolve or create user
    let customerUser = null;

    if (args.phone) {
      const allUsers = await ctx.db.query("users").collect();
      customerUser = allUsers.find((u) => u.phone === args.phone) || null;
    }
    
    if (!customerUser && args.email) {
      customerUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .first();
    }

    if (!customerUser) {
      // Create bare walk-in customer user document
      const newUserId = await ctx.db.insert("users", {
        name: args.customerName,
        phone: args.phone,
        email: args.email,
        isWalkIn: true,
        isOnboarded: true,
      });
      customerUser = await ctx.db.get(newUserId);
    }

    if (!customerUser) {
      throw new Error("Failed to resolve or create customer user");
    }

    let computedSubtotal = 0;
    const itemsToOrder = [];

    // 2. Validate inventory & calculate total
    for (const item of args.items) {
      const rawProduct = await ctx.db.get(item.productId);
      if (!rawProduct || !rawProduct.isActive) {
        throw new Error("Product is not active or does not exist");
      }
      const product = normalizeProductPrice(rawProduct);

      if (product.inventory !== undefined && product.inventory < item.quantity) {
        throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
      }
      await syncStockDeductionByBarcode(ctx, product, item.quantity);

      computedSubtotal += product.price * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    // 2b. Add voucher items to subtotal
    if (args.voucherItems) {
      for (const vItem of args.voucherItems) {
        if (vItem.amount <= 0) {
          throw new Error("Voucher amount must be greater than zero");
        }
        if (vItem.expiresAt <= now) {
          throw new Error("Voucher expiry date must be in the future");
        }
        computedSubtotal += vItem.amount;
      }
    }

    // Validate payment total (includes the staff-entered delivery fee for WhatsApp orders)
    const payableTotal = computedSubtotal + deliveryFee;
    const totalPayments = args.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayments !== payableTotal) {
      throw new Error(`Payment total mismatch: paid UGX ${totalPayments.toLocaleString()} but total is UGX ${payableTotal.toLocaleString()}`);
    }

    // Validate and pre-process voucher redemptions
    const resolvedPayments = [];
    for (const p of args.payments) {
      if (p.method === "voucher") {
        const code = p.voucherCode!.trim().toUpperCase();
        const voucher = await ctx.db
          .query("giftVouchers")
          .withIndex("by_code", (q) => q.eq("code", code))
          .first();
        if (!voucher) {
          throw new Error(`Voucher with code ${code} not found`);
        }
        if (voucher.status !== "active") {
          throw new Error(`Voucher ${code} is not active (status: ${voucher.status})`);
        }
        if (now > voucher.expiresAt) {
          throw new Error(`Voucher ${code} has expired`);
        }
        if (voucher.remainingBalance < p.amount) {
          throw new Error(`Voucher ${code} has insufficient balance. Remaining: UGX ${voucher.remainingBalance.toLocaleString()}, requested: UGX ${p.amount.toLocaleString()}`);
        }

        resolvedPayments.push({
          method: "voucher" as const,
          amount: p.amount,
          voucherId: voucher._id,
          voucherCode: code,
        });
      } else {
        resolvedPayments.push({
          method: p.method,
          amount: p.amount,
          momoPhone: p.momoPhone,
          cardOrderId: p.cardOrderId,
        });
      }
    }

    // 3. Create the physical store order
    // Populate scalar fields for backward compatibility
    let paymentMethodSummary: string = "mixed";
    let momoPhoneSummary: string | undefined = undefined;
    let cardOrderIdSummary: string | undefined = undefined;

    if (args.payments.length === 1) {
      paymentMethodSummary = args.payments[0].method;
      momoPhoneSummary = args.payments[0].momoPhone;
      cardOrderIdSummary = args.payments[0].cardOrderId;
    }

    // Generate human-readable receipt number: RCP-YYYYMMDD-XXXX
    const receiptDate = new Date(now);
    const receiptDateStr =
      String(receiptDate.getUTCFullYear()) +
      String(receiptDate.getUTCMonth() + 1).padStart(2, "0") +
      String(receiptDate.getUTCDate()).padStart(2, "0");
    const receiptSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `RCP-${receiptDateStr}-${receiptSuffix}`;

    const isWhatsapp = channel === "whatsapp";
    const orderId = await ctx.db.insert("orders", isWhatsapp ? {
      userId: customerUser._id,
      // WhatsApp orders still need to be physically delivered — enter the real
      // fulfillment pipeline already "claimed" (auto-claimed by whoever took the
      // order), rather than being marked delivered on the spot like in-store sales.
      status: "packing",
      paymentMethod: paymentMethodSummary,
      momoPhone: momoPhoneSummary,
      cardOrderId: cardOrderIdSummary,
      note: args.note,
      deliveryAddress: {
        name: args.deliveryLocation?.trim() || args.customerName,
        zone: "WhatsApp Delivery",
      },
      subtotal: computedSubtotal,
      discountAmount: 0,
      deliveryFee,
      grandTotal: computedSubtotal + deliveryFee,
      createdAt: now,
      claimedBy: attributedStaff._id,
      claimedAt: now,
      timeToClaim: 0,
      isOnline: false,
      isWalkIn: false,
      channel: "whatsapp",
      receiptNumber,
      history: [
        {
          status: "packing",
          timestamp: now,
          note: `WhatsApp order created & claimed by ${attributedStaff.name ?? "Staff"}`,
        },
      ],
    } : {
      userId: customerUser._id,
      status: "delivered", // Delivered immediately
      paymentMethod: paymentMethodSummary,
      momoPhone: momoPhoneSummary,
      cardOrderId: cardOrderIdSummary,
      note: args.note,
      deliveryAddress: {
        name: args.customerName,
        zone: "Physical Store",
      },
      subtotal: computedSubtotal,
      discountAmount: 0,
      deliveryFee: 0,
      grandTotal: computedSubtotal,
      createdAt: now,
      claimedBy: attributedStaff._id,
      claimedAt: now,
      completedAt: now,
      isOnline: false,
      isWalkIn: true,
      channel: "walk_in",
      receiptNumber,
      history: [
        {
          status: "delivered",
          timestamp: now,
          note: args.note || "Walk-in purchase in physical store completed",
        },
      ],
    });

    // 4. Update voucher balances, create redemptions, and create order payments
    for (const rp of resolvedPayments) {
      if (rp.method === "voucher") {
        const voucher = await ctx.db.get(rp.voucherId!);
        if (!voucher) throw new Error("Voucher not found during redemption");
        const newBalance = voucher.remainingBalance - rp.amount;
        const status = newBalance === 0 ? "depleted" : "active";
        await ctx.db.patch(voucher._id, {
          remainingBalance: newBalance,
          status,
        });

        await ctx.db.insert("voucherRedemptions", {
          voucherId: voucher._id,
          orderId,
          amount: rp.amount,
          balanceAfter: newBalance,
          redeemedAt: now,
          staffId: staffUser._id,
        });
      }

      await ctx.db.insert("orderPayments", {
        orderId,
        method: rp.method,
        amount: rp.amount,
        momoPhone: rp.momoPhone,
        cardOrderId: rp.cardOrderId,
        voucherId: rp.voucherId,
        voucherCode: rp.voucherCode,
      });
    }

    // 5. Create order items
    for (const item of itemsToOrder) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // 6. Sell/issue gift vouchers (if any)
    const issuedVouchers = [];
    if (args.voucherItems) {
      for (const vItem of args.voucherItems) {
        const code = await generateUniqueVoucherCode(ctx);
        await ctx.db.insert("giftVouchers", {
          code,
          originalAmount: vItem.amount,
          remainingBalance: vItem.amount,
          expiresAt: vItem.expiresAt,
          status: "active",
          issuedOrderId: orderId,
          recipientName: vItem.recipientName,
          recipientEmail: vItem.recipientEmail,
          purchaserUserId: customerUser._id,
          createdAt: now,
          createdByStaffId: staffUser._id,
        });

        issuedVouchers.push({
          code,
          amount: vItem.amount,
          expiresAt: vItem.expiresAt,
        });
      }
    }

    // 7. Save checkout note as a completed CRM activity and update customerNotes if provided
    if (args.note?.trim()) {
      const checkoutNoteClean = args.note.trim();
      await ctx.db.insert("customerActivities", {
        customerId: customerUser._id,
        orderId,
        type: "note",
        note: checkoutNoteClean,
        status: "completed",
        staffId: staffUser._id,
        staffName: staffUser.name ?? "Staff",
        createdAt: now,
        completedAt: now,
      });

      await ctx.db.patch(customerUser._id, {
        customerNotes: checkoutNoteClean,
      });
    }

    // 8. Schedule a follow-up reminder, if requested
    if (args.reminder) {
      await ctx.db.insert("customerActivities", {
        customerId: customerUser._id,
        orderId,
        type: args.reminder.type,
        note: args.reminder.note,
        scheduledDate: args.reminder.scheduledDate,
        scheduledTime: args.reminder.scheduledTime,
        priority: args.reminder.priority ?? "normal",
        status: "pending",
        staffId: staffUser._id,
        staffName: staffUser.name ?? "Staff",
        createdAt: now,
      });
    }

    return { success: true, orderId, receiptNumber, issuedVouchers };
  },
});

export const adminGetOverviewStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify caller is admin
    await verifyStaffSession(ctx, args.token, ["admin"]);

    // 2. Fetch all orders
    const allOrders = await ctx.db
      .query("orders")
      .collect();

    // 3. Compute stats
    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const completedOrders = allOrders.filter((o: any) => completedStatuses.includes(o.status));
    const failedOrders = allOrders.filter((o: any) => o.status === "failed");

    const grossSales = completedOrders.reduce((sum: number, o: any) => sum + o.grandTotal, 0);
    const completedCount = completedOrders.length;
    const aov = completedCount > 0 ? Math.round(grossSales / completedCount) : 0;

    // 4. Performance Leaderboard (count of orders claimed by each staff/admin)
    const staffMembers = await ctx.db
      .query("users")
      .withIndex("by_accountRole")
      .collect();

    const staffMap = new Map<string, { name: string; email: string; ordersCompletedCount: number; salesCompletedAmount: number }>();
    for (const member of staffMembers) {
      staffMap.set(member._id.toString(), {
        name: member.name || "Unnamed Staff",
        email: member.email || "",
        ordersCompletedCount: 0,
        salesCompletedAmount: 0,
      });
    }

    // Tally staff performance from completed orders
    for (const order of completedOrders) {
      if (order.claimedBy) {
        const staffIdStr = order.claimedBy.toString();
        const stats = staffMap.get(staffIdStr);
        if (stats) {
          stats.ordersCompletedCount += 1;
          stats.salesCompletedAmount += order.grandTotal;
        } else {
          // Fallback if user details not indexed or deleted
          const claimant = await ctx.db.get(order.claimedBy);
          staffMap.set(staffIdStr, {
            name: claimant?.name || "Unnamed Staff",
            email: claimant?.email || "",
            ordersCompletedCount: 1,
            salesCompletedAmount: order.grandTotal,
          });
        }
      }
    }

    const leaderboard = Array.from(staffMap.values())
      .filter((s) => s.ordersCompletedCount > 0)
      .sort((a, b) => b.ordersCompletedCount - a.ordersCompletedCount);

    return {
      grossSales,
      aov,
      completedOrdersCount: completedCount,
      failedOrdersCount: failedOrders.length,
      leaderboard,
    };
  },
});

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  physical: "Cash",
  momo: "Mobile Money",
  card: "Card",
  voucher: "Gift Voucher",
};

const CHANNEL_LABELS: Record<string, string> = {
  online: "Online",
  walk_in: "Walk-in",
  whatsapp: "WhatsApp Order",
};

// Legacy orders predate the `channel` field — fall back to the isWalkIn boolean so
// every order resolves to a channel bucket.
function resolveOrderChannel(order: any): string {
  return order.channel ?? (order.isWalkIn ? "walk_in" : "online");
}

// For a single order, returns its attributed tenders: real orderPayments rows
// if any exist (with their method-specific detail fields), else a single
// fallback tender built from the order's summary paymentMethod/grandTotal fields.
function attributeOrderPayments(
  order: any,
  paymentsByOrderId: Map<string, { method: string; amount: number; momoPhone?: string; cardOrderId?: string; voucherCode?: string }[]>
): { method: string; amount: number; momoPhone?: string; cardOrderId?: string; voucherCode?: string }[] {
  const payments = paymentsByOrderId.get(order._id.toString());
  if (payments && payments.length > 0) {
    return payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      momoPhone: p.momoPhone,
      cardOrderId: p.cardOrderId,
      voucherCode: p.voucherCode,
    }));
  }
  return [{
    method: order.paymentMethod,
    amount: order.grandTotal,
    momoPhone: order.momoPhone,
    cardOrderId: order.cardOrderId,
  }];
}

export const adminGetDailySalesDashboard = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify caller is admin
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];

    // 2. Day boundaries (server-local midnight), last 7 days including today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const dayRanges: { dateStr: string; start: number; end: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = startOfToday.getTime() - i * dayMs;
      dayRanges.push({
        dateStr: new Date(start).toISOString().slice(0, 10),
        start,
        end: start + dayMs,
      });
    }

    // 3. Fetch only the orders in the 7-day window via the createdAt index,
    // then only the payments belonging to those orders (orderPayments has no
    // date field of its own, so it can't be range-scoped directly).
    const rangeStart = dayRanges[0].start;
    const rangeEnd = dayRanges[dayRanges.length - 1].end;
    const allOrders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStart).lt("createdAt", rangeEnd))
      .collect();

    const paymentsPerOrder = await Promise.all(
      allOrders.map((o) =>
        ctx.db
          .query("orderPayments")
          .withIndex("by_order", (q) => q.eq("orderId", o._id))
          .collect()
      )
    );
    const paymentsByOrderId = new Map<string, (typeof paymentsPerOrder)[number]>();
    allOrders.forEach((o, i) => {
      paymentsByOrderId.set(o._id.toString(), paymentsPerOrder[i]);
    });

    const computeDayStats = (start: number, end: number) => {
      const ordersInRange = allOrders.filter((o: any) => o.createdAt >= start && o.createdAt < end);
      const completedInRange = ordersInRange.filter((o: any) => completedStatuses.includes(o.status));
      const revenue = completedInRange.reduce((sum: number, o: any) => sum + o.grandTotal, 0);
      return { ordersPlaced: ordersInRange.length, revenue, completedInRange };
    };

    // 4. Today's overview
    const todayRange = dayRanges[dayRanges.length - 1];
    const todayStats = computeDayStats(todayRange.start, todayRange.end);

    // 5. Payment breakdown for today's completed orders (combine orderPayments + fallback to summary field)
    const breakdownMap = new Map<string, { method: string; amount: number; count: number }>();
    for (const order of todayStats.completedInRange) {
      const tenders = attributeOrderPayments(order, paymentsByOrderId);
      for (const t of tenders) {
        const existing = breakdownMap.get(t.method);
        if (existing) {
          existing.amount += t.amount;
          existing.count += 1;
        } else {
          breakdownMap.set(t.method, { method: t.method, amount: t.amount, count: 1 });
        }
      }
    }
    const paymentBreakdown = Array.from(breakdownMap.values())
      .map((b) => ({ ...b, label: PAYMENT_METHOD_LABELS[b.method] || b.method }))
      .sort((a, b) => b.amount - a.amount);

    // 6. 7-day trend
    const trend = dayRanges.map(({ dateStr, start, end }) => {
      const { ordersPlaced, revenue } = computeDayStats(start, end);
      return { date: dateStr, ordersPlaced, revenue };
    });

    // 7. Today's staff leaderboard (same shape/logic as adminGetOverviewStats, scoped to today)
    const staffMembers = await ctx.db
      .query("users")
      .withIndex("by_accountRole")
      .collect();

    const staffMap = new Map<string, { name: string; email: string; ordersCompletedCount: number; salesCompletedAmount: number }>();
    for (const member of staffMembers) {
      staffMap.set(member._id.toString(), {
        name: member.name || "Unnamed Staff",
        email: member.email || "",
        ordersCompletedCount: 0,
        salesCompletedAmount: 0,
      });
    }

    for (const order of todayStats.completedInRange) {
      if (order.claimedBy) {
        const staffIdStr = order.claimedBy.toString();
        const stats = staffMap.get(staffIdStr);
        if (stats) {
          stats.ordersCompletedCount += 1;
          stats.salesCompletedAmount += order.grandTotal;
        } else {
          const claimant = await ctx.db.get(order.claimedBy);
          staffMap.set(staffIdStr, {
            name: claimant?.name || "Unnamed Staff",
            email: claimant?.email || "",
            ordersCompletedCount: 1,
            salesCompletedAmount: order.grandTotal,
          });
        }
      }
    }

    const leaderboard = Array.from(staffMap.values())
      .filter((s) => s.ordersCompletedCount > 0)
      .sort((a, b) => b.ordersCompletedCount - a.ordersCompletedCount);

    return {
      today: {
        ordersPlaced: todayStats.ordersPlaced,
        revenue: todayStats.revenue,
      },
      paymentBreakdown,
      trend,
      leaderboard,
    };
  },
});

// Parses a "YYYY-MM-DD" string into a server-local midnight timestamp.
function parseDateStrToMs(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

function toDateStr(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const adminGetSalesMetrics = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    endDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    paymentMethod: v.optional(v.string()), // "physical"|"momo"|"card"|"voucher"
    channel: v.optional(v.string()), // "online"|"walk_in"|"whatsapp"
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    // 1. Resolve the date range (default: last 30 days including today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    // 2. Fetch only orders in range via the createdAt index, then only the
    // payments belonging to those orders (orderPayments has no date field).
    const allOrders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
      .collect();

    const paymentsPerOrder = await Promise.all(
      allOrders.map((o) =>
        ctx.db
          .query("orderPayments")
          .withIndex("by_order", (q) => q.eq("orderId", o._id))
          .collect()
      )
    );
    const paymentsByOrderId = new Map<string, (typeof paymentsPerOrder)[number]>();
    allOrders.forEach((o, i) => {
      paymentsByOrderId.set(o._id.toString(), paymentsPerOrder[i]);
    });

    // 3. Filter to completed orders within range, then by channel (order-level filter,
    // unlike payment method which is a tender-level filter applied inside
    // computeAggregate below)
    let ordersInRange = allOrders.filter(
      (o: any) =>
        o.createdAt >= rangeStartMs && o.createdAt < rangeEndMs && completedStatuses.includes(o.status)
    );
    if (args.channel) {
      ordersInRange = ordersInRange.filter((o: any) => resolveOrderChannel(o) === args.channel);
    }

    // 4. Attribute tenders per order, applying the payment-method filter (if any)
    const computeAggregate = (orders: any[]) => {
      const byMethodMap = new Map<string, { method: string; amount: number; count: number }>();
      const byChannelMap = new Map<string, { channel: string; amount: number; count: number }>();
      const distinctOrderIds = new Set<string>();
      let totalSales = 0;

      for (const order of orders) {
        let tenders = attributeOrderPayments(order, paymentsByOrderId);
        if (args.paymentMethod) {
          tenders = tenders.filter((t) => t.method === args.paymentMethod);
        }
        if (tenders.length === 0) continue;

        distinctOrderIds.add(order._id.toString());
        let orderAmount = 0;
        for (const t of tenders) {
          totalSales += t.amount;
          orderAmount += t.amount;
          const existing = byMethodMap.get(t.method);
          if (existing) {
            existing.amount += t.amount;
            existing.count += 1;
          } else {
            byMethodMap.set(t.method, { method: t.method, amount: t.amount, count: 1 });
          }
        }

        const channel = resolveOrderChannel(order);
        const existingChannel = byChannelMap.get(channel);
        if (existingChannel) {
          existingChannel.amount += orderAmount;
          existingChannel.count += 1;
        } else {
          byChannelMap.set(channel, { channel, amount: orderAmount, count: 1 });
        }
      }

      return { totalSales, orderCount: distinctOrderIds.size, byMethodMap, byChannelMap };
    };

    const overall = computeAggregate(ordersInRange);
    const byPaymentMethod = Array.from(overall.byMethodMap.values())
      .map((b) => ({ ...b, label: PAYMENT_METHOD_LABELS[b.method] || b.method }))
      .sort((a, b) => b.amount - a.amount);
    const byChannel = Array.from(overall.byChannelMap.values())
      .map((b) => ({ ...b, label: CHANNEL_LABELS[b.channel] || b.channel }))
      .sort((a, b) => b.amount - a.amount);
    const aov = overall.orderCount > 0 ? Math.round(overall.totalSales / overall.orderCount) : 0;

    // 5. Time series, bucketed by day (<=62 days) or week otherwise
    const totalRangeDays = Math.round((rangeEndMs - rangeStartMs) / dayMs);
    const bucketGranularity: "day" | "week" = totalRangeDays <= 62 ? "day" : "week";
    const bucketMs = bucketGranularity === "day" ? dayMs : 7 * dayMs;

    const series: { date: string; total: number; byMethod: Record<string, number> }[] = [];
    for (let bucketStart = rangeStartMs; bucketStart < rangeEndMs; bucketStart += bucketMs) {
      const bucketEnd = Math.min(bucketStart + bucketMs, rangeEndMs);
      const bucketOrders = ordersInRange.filter(
        (o: any) => o.createdAt >= bucketStart && o.createdAt < bucketEnd
      );
      const bucketAgg = computeAggregate(bucketOrders);
      const byMethod: Record<string, number> = {};
      for (const b of bucketAgg.byMethodMap.values()) {
        byMethod[b.method] = b.amount;
      }
      series.push({ date: toDateStr(bucketStart), total: bucketAgg.totalSales, byMethod });
    }

    return {
      totalSales: overall.totalSales,
      orderCount: overall.orderCount,
      aov,
      byPaymentMethod,
      byChannel,
      series,
      bucketGranularity,
      rangeStart: toDateStr(rangeStartMs),
      rangeEnd: toDateStr(rangeEndMs - dayMs),
    };
  },
});

const STAGE_LABELS: Record<string, string> = { mother: "Mother", newborn: "Newborn", kid: "Kid" };
const TIER_LABELS: Record<string, string> = { essentials: "Essentials", musthaves: "Must-Haves", luxuries: "Luxuries" };

export const adminGetProductAnalytics = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    const ordersInWindow = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
      .collect();
    const ordersInRange = ordersInWindow.filter((o: any) => completedStatuses.includes(o.status));

    // Aggregate units/revenue per product across all matching orders' line items
    const productAgg = new Map<string, { productId: any; unitsSold: number; revenue: number }>();
    for (const order of ordersInRange) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const item of items) {
        const key = item.productId.toString();
        const revenue = item.unitPrice * item.quantity;
        const existing = productAgg.get(key);
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += revenue;
        } else {
          productAgg.set(key, { productId: item.productId, unitsSold: item.quantity, revenue });
        }
      }
    }

    const byCategoryMap = new Map<string, { key: string; label: string; unitsSold: number; revenue: number }>();
    const byStageMap = new Map<string, { key: string; label: string; unitsSold: number; revenue: number }>();
    const byTierMap = new Map<string, { key: string; label: string; unitsSold: number; revenue: number }>();
    const topProducts: {
      productId: string;
      name: string;
      unitsSold: number;
      revenue: number;
      grossMargin: number | null;
      marginPct: number | null;
      hasCostData: boolean;
    }[] = [];

    for (const [key, agg] of productAgg.entries()) {
      const product = await ctx.db.get(agg.productId);
      const name = product?.name || "Unknown Product";
      const costPrice = product?.costPrice;
      const hasCostData = typeof costPrice === "number";
      const grossMargin = hasCostData ? agg.revenue - costPrice * agg.unitsSold : null;
      const marginPct =
        hasCostData && agg.revenue > 0 ? Math.round((grossMargin! / agg.revenue) * 1000) / 10 : null;

      topProducts.push({
        productId: key,
        name,
        unitsSold: agg.unitsSold,
        revenue: agg.revenue,
        grossMargin,
        marginPct,
        hasCostData,
      });

      const categoryKey = product?.category || "Uncategorized";
      const catEntry = byCategoryMap.get(categoryKey) || { key: categoryKey, label: categoryKey, unitsSold: 0, revenue: 0 };
      catEntry.unitsSold += agg.unitsSold;
      catEntry.revenue += agg.revenue;
      byCategoryMap.set(categoryKey, catEntry);

      if (product?.stage) {
        const stageEntry = byStageMap.get(product.stage) || {
          key: product.stage,
          label: STAGE_LABELS[product.stage] || product.stage,
          unitsSold: 0,
          revenue: 0,
        };
        stageEntry.unitsSold += agg.unitsSold;
        stageEntry.revenue += agg.revenue;
        byStageMap.set(product.stage, stageEntry);
      }

      if (product?.tier) {
        const tierEntry = byTierMap.get(product.tier) || {
          key: product.tier,
          label: TIER_LABELS[product.tier] || product.tier,
          unitsSold: 0,
          revenue: 0,
        };
        tierEntry.unitsSold += agg.unitsSold;
        tierEntry.revenue += agg.revenue;
        byTierMap.set(product.tier, tierEntry);
      }
    }

    topProducts.sort((a, b) => b.revenue - a.revenue);

    const withCostData = topProducts.filter((p) => p.hasCostData);
    const totalRevenueWithCost = withCostData.reduce((sum, p) => sum + p.revenue, 0);
    const totalMarginWithCost = withCostData.reduce((sum, p) => sum + (p.grossMargin || 0), 0);
    const overallMarginPct =
      totalRevenueWithCost > 0 ? Math.round((totalMarginWithCost / totalRevenueWithCost) * 1000) / 10 : null;

    return {
      topProducts: topProducts.slice(0, 10),
      byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.revenue - a.revenue),
      byStage: Array.from(byStageMap.values()).sort((a, b) => b.revenue - a.revenue),
      byTier: Array.from(byTierMap.values()).sort((a, b) => b.revenue - a.revenue),
      overallMarginPct,
      productsWithoutCostData: topProducts.length - withCostData.length,
      rangeStart: toDateStr(rangeStartMs),
      rangeEnd: toDateStr(rangeEndMs - dayMs),
    };
  },
});

export const adminGetPaymentMethodTransactions = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    endDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    paymentMethod: v.string(), // "physical"|"momo"|"card"|"voucher"
    channel: v.optional(v.string()), // "online"|"walk_in"|"whatsapp"
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    // 1. Fetch all orders + all order payments once
    const allOrders = await ctx.db.query("orders").collect();
    const allOrderPayments = await ctx.db.query("orderPayments").collect();
    const paymentsByOrderId = new Map<string, typeof allOrderPayments>();
    for (const payment of allOrderPayments) {
      const key = payment.orderId.toString();
      const existing = paymentsByOrderId.get(key);
      if (existing) {
        existing.push(payment);
      } else {
        paymentsByOrderId.set(key, [payment]);
      }
    }

    // 2. Resolve the date range (default: last 30 days including today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    // 3. Filter to completed orders within range (+ optional channel filter)
    let ordersInRange = allOrders.filter(
      (o: any) =>
        o.createdAt >= rangeStartMs && o.createdAt < rangeEndMs && completedStatuses.includes(o.status)
    );
    if (args.channel) {
      ordersInRange = ordersInRange.filter((o: any) => resolveOrderChannel(o) === args.channel);
    }

    // 4. Attribute tenders per order, keep only ones matching the requested method
    type Row = {
      orderId: any;
      createdAt: number;
      userId: any;
      amount: number;
      momoPhone?: string;
      cardOrderId?: string;
      voucherCode?: string;
    };
    const rows: Row[] = [];
    for (const order of ordersInRange) {
      const tenders = attributeOrderPayments(order, paymentsByOrderId).filter(
        (t) => t.method === args.paymentMethod
      );
      for (const t of tenders) {
        rows.push({
          orderId: order._id,
          createdAt: order.createdAt,
          userId: order.userId,
          amount: t.amount,
          momoPhone: t.momoPhone,
          cardOrderId: t.cardOrderId,
          voucherCode: t.voucherCode,
        });
      }
    }

    // 5. Batch-resolve customer names
    const distinctUserIds = Array.from(new Set(rows.map((r) => r.userId.toString())));
    const users = await Promise.all(distinctUserIds.map((id) => ctx.db.get(id as any)));
    const nameByUserId = new Map<string, string>();
    distinctUserIds.forEach((id, idx) => {
      nameByUserId.set(id, (users[idx] as any)?.name || "Unnamed Customer");
    });

    // 6. Sort most recent first
    rows.sort((a, b) => b.createdAt - a.createdAt);

    return rows.map((r) => ({
      orderId: r.orderId,
      createdAt: r.createdAt,
      customerName: nameByUserId.get(r.userId.toString()) || "Unnamed Customer",
      amount: r.amount,
      momoPhone: r.momoPhone,
      cardOrderId: r.cardOrderId,
      voucherCode: r.voucherCode,
    }));
  },
});

// Drill-down for the "Sales by Channel" breakdown — mirrors
// adminGetPaymentMethodTransactions, but lists orders for a single channel instead of
// a single payment tender.
export const adminGetChannelTransactions = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    channel: v.string(), // "online"|"walk_in"|"whatsapp"
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    const allOrders = await ctx.db.query("orders").collect();
    const allOrderPayments = await ctx.db.query("orderPayments").collect();
    const paymentsByOrderId = new Map<string, typeof allOrderPayments>();
    for (const payment of allOrderPayments) {
      const key = payment.orderId.toString();
      const existing = paymentsByOrderId.get(key);
      if (existing) {
        existing.push(payment);
      } else {
        paymentsByOrderId.set(key, [payment]);
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    const ordersInRange = allOrders.filter(
      (o: any) =>
        o.createdAt >= rangeStartMs &&
        o.createdAt < rangeEndMs &&
        completedStatuses.includes(o.status) &&
        resolveOrderChannel(o) === args.channel
    );

    const distinctUserIds = Array.from(new Set(ordersInRange.map((o: any) => o.userId.toString())));
    const users = await Promise.all(distinctUserIds.map((id) => ctx.db.get(id as any)));
    const nameByUserId = new Map<string, string>();
    distinctUserIds.forEach((id, idx) => {
      nameByUserId.set(id, (users[idx] as any)?.name || "Unnamed Customer");
    });

    const rows = ordersInRange.map((order: any) => {
      const tenders = attributeOrderPayments(order, paymentsByOrderId);
      const amount = tenders.reduce((sum, t) => sum + t.amount, 0);
      return {
        orderId: order._id,
        createdAt: order.createdAt,
        customerName: nameByUserId.get(order.userId.toString()) || "Unnamed Customer",
        amount,
      };
    });

    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows;
  },
});

