import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateCouponInternal } from "./coupons";
import { normalizeProductPrice, shouldKeepProduct } from "./products";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { verifyStaffSession } from "./staffAuth";

export const placeOrder = mutation({
  args: {
    paymentMethod: v.string(),
    momoPhone: v.optional(v.string()),
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
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

    // 4. Calculate Delivery Fee authoritatively
    let deliveryFee = 0;
    let distance = undefined;
    if (!hasTestProduct) {
      const feeRes = await calculateDeliveryFeeAndDistance(
        ctx,
        args.deliveryAddress.zone,
        args.deliveryAddress.name,
        args.deliveryAddress.lat,
        args.deliveryAddress.lng
      );
      deliveryFee = feeRes.deliveryFee;
      distance = feeRes.distance;
    }

    const grandTotal = computedSubtotal - discountAmount + deliveryFee;

    // 5. Create the Order securely
    const orderId = await ctx.db.insert("orders", {
      userId,
      status: "pending_payment",
      paymentMethod: args.paymentMethod,
      momoPhone: args.momoPhone,
      deliveryAddress: {
        ...args.deliveryAddress,
        deliveryFee,
        distance,
      },
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

export const getOrderStatusById = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    return { status: order.status };
  },
});

// ─── Zone-based Delivery Fee Calculator and Haversine Distance helper ───

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const WAREHOUSE_COORDS = { lat: 0.3136, lng: 32.5811 }; // Kampala Central/Warehouse

export async function calculateDeliveryFeeAndDistance(
  ctx: any,
  zoneName: string,
  landmarkName?: string,
  userLat?: number,
  userLng?: number
): Promise<{ distance: number | undefined; deliveryFee: number }> {
  // If coordinates are explicitly provided by the user, calculate distance directly
  if (userLat !== undefined && userLng !== undefined) {
    const distance = haversineDistance(WAREHOUSE_COORDS.lat, WAREHOUSE_COORDS.lng, userLat, userLng);
    const deliveryFee = resolveFeeByDistance(distance);
    return { distance, deliveryFee };
  }

  // If a landmark is provided, look it up in the database to see if it has coordinates
  if (landmarkName) {
    const landmarks = await ctx.db.query("deliveryLandmarks").collect();
    const match = landmarks.find(
      (l: any) => l.name.toLowerCase() === landmarkName.toLowerCase()
    );

    if (match && match.lat !== undefined && match.lng !== undefined) {
      const distance = haversineDistance(WAREHOUSE_COORDS.lat, WAREHOUSE_COORDS.lng, match.lat, match.lng);
      const deliveryFee = resolveFeeByDistance(distance);
      return { distance, deliveryFee };
    }
  }

  // Fallback to zone-based fees if coordinates are missing/unresolved
  const cleanZone = zoneName?.toLowerCase() || "";
  if (cleanZone === "kololo" || cleanZone === "kampala central" || cleanZone === "central") {
    return { distance: undefined, deliveryFee: 0 };
  }

  const zoneFees: Record<string, number> = {
    ntinda: 4000,
    kiwatule: 4000,
    buziga: 6000,
    lubowa: 6000,
    mukono: 10000,
  };

  const deliveryFee = zoneFees[cleanZone] ?? 5000; // default 5000 UGX
  return { distance: undefined, deliveryFee };
}

function resolveFeeByDistance(distance: number): number {
  if (distance < 3) {
    return 2000;
  } else if (distance < 6) {
    return 3500;
  } else if (distance < 10) {
    return 5000;
  } else {
    return 7500;
  }
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
      claimantName,
    };
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

export const markOrderFailed = mutation({
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

    if (order.status !== "dispatched") {
      throw new Error(`Cannot mark order as failed from status: ${order.status}`);
    }

    if (!order.claimedBy || order.claimedBy !== user._id) {
      throw new Error("Only the claiming staff member can mark this order as failed");
    }

    const failedAt = Date.now();
    const history = order.history || [];
    history.push({
      status: "failed",
      timestamp: failedAt,
      note: "Marked as failed/undelivered",
    });

    await ctx.db.patch(args.orderId, {
      status: "failed",
      failedAt,
      history,
    });

    // Restock inventory
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (product && product.inventory !== undefined) {
        await ctx.db.patch(product._id, {
          inventory: product.inventory + item.quantity,
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

      if (product.inventory !== undefined) {
        if (product.inventory < item.quantity) {
          throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
        }
        await ctx.db.patch(product._id, {
          inventory: product.inventory - item.quantity,
          unitsSold: (product.unitsSold || 0) + item.quantity,
        });
      } else {
        await ctx.db.patch(product._id, {
          unitsSold: (product.unitsSold || 0) + item.quantity,
        });
      }

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
        deliveryFee: feeRes.deliveryFee,
        distance: feeRes.distance,
      },
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee: feeRes.deliveryFee,
      grandTotal,
      couponApplied: appliedCoupon,
      createdAt: Date.now(),
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
    paymentMethod: v.union(v.literal("physical"), v.literal("momo"), v.literal("card")),
    momoPhone: v.optional(v.string()),
    cardOrderId: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    // Gated: Staff or Admin
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    if (args.items.length === 0) {
      throw new Error("Cannot create order with zero items");
    }

    if (args.paymentMethod === "card" && !args.cardOrderId?.trim()) {
      throw new Error("Card Order ID is required for card payments");
    }

    if (args.paymentMethod === "momo" && !args.momoPhone?.trim()) {
      throw new Error("Mobile money phone number is required for MoMo payments");
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
        throw new Error(`Product ${item.productId} is not active or does not exist`);
      }
      const product = normalizeProductPrice(rawProduct);

      if (product.inventory !== undefined) {
        if (product.inventory < item.quantity) {
          throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
        }
        await ctx.db.patch(product._id, {
          inventory: product.inventory - item.quantity,
          unitsSold: (product.unitsSold || 0) + item.quantity,
        });
      } else {
        await ctx.db.patch(product._id, {
          unitsSold: (product.unitsSold || 0) + item.quantity,
        });
      }

      computedSubtotal += product.price * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    // 3. Create the physical store order
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      userId: customerUser._id,
      status: "delivered", // Delivered immediately
      paymentMethod: args.paymentMethod,
      momoPhone: args.paymentMethod === "momo" ? args.momoPhone : undefined,
      cardOrderId: args.paymentMethod === "card" ? args.cardOrderId : undefined,
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
      claimedBy: staffUser._id,
      claimedAt: now,
      completedAt: now,
      isOnline: false,
      isWalkIn: true,
      history: [
        {
          status: "delivered",
          timestamp: now,
          note: args.note || "Walk-in purchase in physical store completed",
        },
      ],
    });

    // 4. Create order items
    for (const item of itemsToOrder) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // 5. Save checkout note as a completed CRM activity and update customerNotes if provided
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

    // 6. Schedule a follow-up reminder, if requested
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

    return { success: true, orderId };
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

