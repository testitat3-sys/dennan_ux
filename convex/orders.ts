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
import { applyStockCounterDelta } from "./stockCounters";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";
import { restockByBarcode } from "./returns";

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
        updatedAt: Date.now(),
      });
      await applyStockCounterDelta(
        ctx,
        { inventory: pToUpdate.inventory, reorderPoint: pToUpdate.reorderPoint },
        { inventory: newInventory, reorderPoint: pToUpdate.reorderPoint },
        pToUpdate._id
      );
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
      isWalkIn: false,
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
      guestUser = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.guestPhone))
        .first();
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
    // Walk-in customers (created in-store) are not eligible for coupon discounts.
    let discountAmount = 0;
    let appliedCoupon = undefined;

    if (args.couponCode) {
      if (guestUser.isWalkIn) {
        throw new Error("Coupon codes cannot be applied to walk-in orders.");
      }
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
      isWalkIn: false,
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

// NOTE: consumed via usePaginatedQuery on the frontend, which calls this
// function reference directly (bypassing useTrackedQuery) and requires the
// raw PaginationResult shape - trackedQuery's {data, _io} envelope would
// break pagination, so this stays a plain query.
export const getOrdersForStaff = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Verifies the caller is a valid staff member, admin, or accounting
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    // Query orders in reverse chronological order, excluding walk-in sales
    // (those are already complete on creation and belong only in Order History).
    // Relies on convex/migrations.ts backfillOrdersIsWalkIn having stamped
    // isWalkIn: false on every legacy order, so this index's `.eq(false)`
    // matches all non-walk-in orders, not just ones written after the field existed.
    const result = await ctx.db
      .query("orders")
      .withIndex("by_isWalkIn_and_createdAt", (q) => q.eq("isWalkIn", false))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await enrichOrders(ctx, result.page);

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

/**
 * Order History tab's default query — date-range bounded (defaults to
 * "today" when no dates are given), so the panel resets to a blank slate
 * every morning. Reuses parseDateStrToMs/toDateStr (defined further below in
 * this file; function declarations are hoisted so this is safe to reference
 * here) and the same by_createdAt index range pattern as adminGetSalesAndProductAnalytics.
 */
// NOTE: consumed via usePaginatedQuery - see getOrdersForStaff above for why
// this must stay a plain query rather than trackedQuery.
export const adminGetOrdersByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD", server-local; defaults to today
    endDate: v.optional(v.string()), // "YYYY-MM-DD", server-local; defaults to today
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const isRestrictedToToday = user.accountRole === "accounting" || user.accountRole === "staff";
    const rangeStartMs = isRestrictedToToday ? todayMs : args.startDate ? parseDateStrToMs(args.startDate) : todayMs;
    const rangeEndMs = isRestrictedToToday ? todayMs + dayMs : args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;

    const result = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await enrichOrders(ctx, result.page);

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

/**
 * Order History "Download CSV" query. Bounded by a hard cap (never an
 * unbounded collect) — if the selected date range has more than HARD_CAP
 * orders, returns `truncated: true` and no rows so the client can ask staff
 * to narrow the range instead.
 */
export const adminExportOrdersByDateRange = trackedQuery("orders.adminExportOrdersByDateRange", {
  args: {
    token: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    const dayMs = 24 * 60 * 60 * 1000;
    const HARD_CAP = 2000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const isRestrictedToToday = user.accountRole === "accounting" || user.accountRole === "staff";
    const rangeStartMs = isRestrictedToToday ? todayMs : parseDateStrToMs(args.startDate);
    const rangeEndMs = isRestrictedToToday ? todayMs + dayMs : parseDateStrToMs(args.endDate) + dayMs;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
      .order("desc")
      .take(HARD_CAP + 1);

    if (orders.length > HARD_CAP) {
      return { truncated: true, cap: HARD_CAP, rows: [] as any[] };
    }

    const enrichedOrders = await enrichOrders(ctx, orders, { includePayments: false });

    const rows = enrichedOrders.map((order) => ({
      date: new Date(order.createdAt).toISOString(),
      customerName: order.customerName,
      type: order.isWalkIn ? "Walk-in" : "Online",
      itemCount: order.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      total: order.grandTotal,
      status: order.status,
      claimantName: order.claimantName || "",
    }));

    return { truncated: false, cap: HARD_CAP, rows };
  },
});

export const getOrderDetailById = trackedQuery("orders.getOrderDetailById", {
  args: {
    token: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const [enriched] = await enrichOrders(ctx, [order]);
    return enriched;
  },
});

// NOTE: paginated (.paginate() below) - kept as a plain query in case a
// future consumer uses usePaginatedQuery, same reasoning as
// getOrdersForStaff above.
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

    const enrichedPage = await enrichOrders(ctx, result.page, {
      claimantNameOverride: staffUser.name || null,
    });

    return { ...result, page: enrichedPage };
  },
});

const PENDING_STATUSES = ["preparing", "pending_cod", "packing", "dispatched"] as const;
const DEFAULT_PENDING_ORDERS_LIMIT = 200;

export const getPendingOrders = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    const limit = args.limit ?? DEFAULT_PENDING_ORDERS_LIMIT;

    // withIndex can't OR across status values in one call, so run one
    // indexed query per pending status and merge the results instead of a
    // full unindexed table scan.
    const ordersByStatus = await Promise.all(
      PENDING_STATUSES.map((status) =>
        ctx.db
          .query("orders")
          .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
          .order("desc")
          .take(limit)
      )
    );
    const pendingOrders = ordersByStatus.flat().filter((o) => o.isWalkIn !== true);

    const enriched = await enrichOrders(ctx, pendingOrders, {
      includePayments: false,
      includeCustomerEmail: false,
    });

    // Sort by createdAt descending
    enriched.sort((a, b) => b.createdAt - a.createdAt);
    return enriched;
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

    if (order.status !== "preparing" && order.status !== "pending_cod") {
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

    // Relaxed claimant restriction: any staff member or admin can dispatch/handover any order, despite not being the one who claimed it.

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

    // Relaxed claimant restriction: any staff member or admin can complete any order, despite not being the one who claimed it.

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

    await ctx.scheduler.runAfter(0, internal.receipts.sendOrderReceipt, { orderId: args.orderId });

    return { success: true };
  },
});

// Replaces the old markOrderFailed: staff report a failed/undelivered order and, in
// the same atomic mutation, resolve each affected item immediately — restock or
// don't restock, chosen per item by the reporting staff member (source:
// "delivery_failure"). No later approval step is needed.
export const reportDeliveryFailure = trackedMutation("orders.reportDeliveryFailure", {
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    failedItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        reason: v.optional(v.string()),
        restock: v.boolean(),
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

    // Relaxed claimant restriction: any staff member or admin can mark any order as failed, despite not being the one who claimed it.

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
        ? `Marked as failed/undelivered — ${args.failedItems.length} item(s) processed`
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
          status: "approved",
          source: "delivery_failure",
          approvedBy: user._id,
          approvedAt: failedAt,
          restocked: failedItem.restock,
          createdAt: failedAt,
        });
        if (failedItem.restock) {
          await restockByBarcode(ctx, failedItem.productId, failedItem.quantity);
        }
      }
    }

    return { success: true };
  },
});

export const adminCreateOrder = trackedMutation("orders.adminCreateOrder", {
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

    // Process coupon — blocked for walk-in customers (in-store / WhatsApp-originated profiles).
    let discountAmount = 0;
    let appliedCoupon = undefined;
    if (args.couponCode) {
      if (customer.isWalkIn) {
        throw new Error("Coupon codes cannot be applied to walk-in customer orders.");
      }
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
      isWalkIn: false,
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
    // Client-generated id set by the offline POS queue (see admin/src/lib/offlineDb.js).
    // If a resubmission arrives for an offlineOrderId that already produced an order
    // (e.g. a retried sync after the client crashed before removing the queue entry),
    // return the existing order instead of inserting a duplicate + double stock decrement.
    offlineOrderId: v.optional(v.string()),
    customerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Gated: Staff or Admin
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    if (args.offlineOrderId) {
      const existingOrder = await ctx.db
        .query("orders")
        .withIndex("by_offlineOrderId", (q) => q.eq("offlineOrderId", args.offlineOrderId))
        .first();
      if (existingOrder) {
        const existingVouchers = await ctx.db
          .query("giftVouchers")
          .withIndex("by_issuedOrderId", (q) => q.eq("issuedOrderId", existingOrder._id))
          .collect();
        return {
          success: true,
          orderId: existingOrder._id,
          receiptNumber: existingOrder.receiptNumber,
          issuedVouchers: existingVouchers.map((v) => ({
            code: v.code,
            amount: v.originalAmount,
            expiresAt: v.expiresAt,
          })),
        };
      }
    }

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

    if (args.customerId) {
      customerUser = await ctx.db.get(args.customerId);
    }

    if (!customerUser && args.phone) {
      customerUser = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();
    }
    
    if (!customerUser && args.email) {
      customerUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .first();
    }

    if (!customerUser && args.customerName) {
      const nameMatch = await ctx.db
        .query("users")
        .withSearchIndex("search_name", (q) => q.search("name", args.customerName))
        .first();
      if (nameMatch && !nameMatch.accountRole) {
        customerUser = nameMatch;
      }
    }

    if (customerUser) {
      // Patch existing user if name, phone, or email are provided and updated
      const userPatches: Record<string, any> = {};
      if (args.customerName && args.customerName.trim() !== "" && args.customerName.trim() !== customerUser.name) {
        userPatches.name = args.customerName.trim();
      }
      if (args.phone && args.phone.trim() !== "" && args.phone.trim() !== customerUser.phone) {
        userPatches.phone = args.phone.trim();
      }
      if (args.email && args.email.trim() !== "" && args.email.trim() !== customerUser.email) {
        userPatches.email = args.email.trim();
      }
      if (Object.keys(userPatches).length > 0) {
        await ctx.db.patch(customerUser._id, userPatches);
        customerUser = { ...customerUser, ...userPatches };
      }
    } else {
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

      // For walk-in and WhatsApp orders, always use the original (undiscounted) price.
      // Discounts are only applicable to online storefront orders.
      const prices = [rawProduct.price, rawProduct.wasPrice, rawProduct.originalPrice, rawProduct.discountPrice].filter(
        (v): v is number => typeof v === "number" && v > 0
      );
      const unitPrice = prices.length > 0 ? Math.max(...prices) : rawProduct.price;
      computedSubtotal += unitPrice * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
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
      offlineOrderId: args.offlineOrderId,
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
      offlineOrderId: args.offlineOrderId,
      history: [
        {
          status: "delivered",
          timestamp: now,
          note: args.note || "Walk-in purchase in physical store completed",
        },
      ],
    });

    if (!isWhatsapp) {
      await ctx.scheduler.runAfter(0, internal.receipts.sendOrderReceipt, { orderId });
    }

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

// NOTE: startDate/endDate are optional and default to a rolling 30-day
// window (see adminGetSalesAndProductAnalytics for the same convention) rather than
// all-time, so this no longer requires an unbounded orders.collect(). Any
// existing caller passing only { token } now gets the last-30-days view
// instead of an all-time one.
export const adminGetOverviewStats = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    endDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
  },
  handler: async (ctx, args) => {
    // 1. Verify caller is admin
    await verifyStaffSession(ctx, args.token, ["admin"]);

    // 2. Resolve the date range (default: last 30 days including today)
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    // 3. Fetch only orders in range via the createdAt index
    const allOrders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);

    // 4. Compute stats
    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const completedOrders = allOrders.filter((o: any) => completedStatuses.includes(o.status));
    const failedOrders = allOrders.filter((o: any) => o.status === "failed");

    const grossSales = completedOrders.reduce((sum: number, o: any) => sum + o.grandTotal, 0);
    const completedCount = completedOrders.length;
    const aov = completedCount > 0 ? Math.round(grossSales / completedCount) : 0;

    // 5. Performance Leaderboard (count of orders claimed by each staff/admin),
    // batch-resolving only the distinct claimants that actually appear in this
    // date-bounded set instead of scanning the entire users table.
    const distinctClaimantIds = Array.from(
      new Set(completedOrders.filter((o: any) => o.claimedBy).map((o: any) => o.claimedBy.toString()))
    );
    const claimants = await Promise.all(distinctClaimantIds.map((id) => ctx.db.get(id as any)));
    const claimantById = new Map<string, any>();
    distinctClaimantIds.forEach((id, idx) => claimantById.set(id, claimants[idx]));

    const staffMap = new Map<string, { name: string; email: string; ordersCompletedCount: number; salesCompletedAmount: number }>();
    for (const order of completedOrders) {
      if (order.claimedBy) {
        const staffIdStr = order.claimedBy.toString();
        const stats = staffMap.get(staffIdStr);
        if (stats) {
          stats.ordersCompletedCount += 1;
          stats.salesCompletedAmount += order.grandTotal;
        } else {
          const claimant = claimantById.get(staffIdStr);
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

// Shared date-range order fetch — pushes the range into the `by_createdAt`
// index instead of collecting the whole table and filtering in memory.
export async function getOrdersInDateRange(ctx: QueryCtx, rangeStartMs: number, rangeEndMs: number) {
  return ctx.db
    .query("orders")
    .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
    .collect();
}

// Per-order-payments lookup scoped to an already date-narrowed set of orders,
// replacing a full `orderPayments` table collect with N indexed point-lookups.
export async function getPaymentsByOrderId(ctx: QueryCtx, orders: { _id: any }[]) {
  const paymentsPerOrder = await Promise.all(
    orders.map((o) =>
      ctx.db
        .query("orderPayments")
        .withIndex("by_order", (q) => q.eq("orderId", o._id))
        .collect()
    )
  );
  const paymentsByOrderId = new Map<string, (typeof paymentsPerOrder)[number]>();
  orders.forEach((o, i) => {
    paymentsByOrderId.set(o._id.toString(), paymentsPerOrder[i]);
  });
  return paymentsByOrderId;
}

// For a single order, returns its attributed tenders: real orderPayments rows
// if any exist (with their method-specific detail fields), else a single
// fallback tender built from the order's summary paymentMethod/grandTotal fields.
export function attributeOrderPayments(
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

// Dedup-by-id batch getter — fetches each distinct id once via Promise.all
// instead of re-fetching the same document every time it recurs in `ids`.
async function batchGetById(ctx: QueryCtx, ids: any[]): Promise<Map<string, any>> {
  const distinctIds = Array.from(new Set(ids.map((id) => id.toString())));
  const docs = await Promise.all(distinctIds.map((id) => ctx.db.get(id as any)));
  const byId = new Map<string, any>();
  distinctIds.forEach((id, i) => {
    if (docs[i]) byId.set(id, docs[i]);
  });
  return byId;
}

// Per-order orderItems lookup, batched via Promise.all across the given
// orders instead of one query at a time in a loop.
async function getOrderItemsByOrderId(ctx: QueryCtx, orders: { _id: any }[]): Promise<Map<string, any[]>> {
  const itemsPerOrder = await Promise.all(
    orders.map((o) =>
      ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", o._id))
        .collect()
    )
  );
  const itemsByOrderId = new Map<string, (typeof itemsPerOrder)[number]>();
  orders.forEach((o, i) => {
    itemsByOrderId.set(o._id.toString(), itemsPerOrder[i]);
  });
  return itemsByOrderId;
}

type EnrichOrdersOptions = {
  // Whether to fetch and attach `payments`. Default true — set false for
  // callers (e.g. getPendingOrders) that never used the payments array, so
  // they don't start paying for a fetch they didn't have before.
  includePayments?: boolean;
  // Whether to attach `customerEmail`. Default true.
  includeCustomerEmail?: boolean;
  // Skip the per-order claimant lookup entirely and stamp every row with
  // this name instead (getMyHandledOrders already knows every order in the
  // page is claimed by the calling staff user).
  claimantNameOverride?: string | null;
};

// Shared batch-fetch enrichment for order rows: customer, orderItems,
// orderPayments, and claimant, each fetched once per distinct id/order
// instead of the previous per-order sequential ctx.db.get()/query() loop.
async function enrichOrders(ctx: QueryCtx, orders: any[], options: EnrichOrdersOptions = {}) {
  const includePayments = options.includePayments ?? true;
  const includeCustomerEmail = options.includeCustomerEmail ?? true;

  const claimantIds =
    options.claimantNameOverride !== undefined
      ? []
      : orders.filter((o) => o.claimedBy).map((o) => o.claimedBy);

  const [customersById, claimantsById, itemsByOrderId, paymentsByOrderId] = await Promise.all([
    batchGetById(ctx, orders.map((o) => o.userId)),
    batchGetById(ctx, claimantIds),
    getOrderItemsByOrderId(ctx, orders),
    includePayments ? getPaymentsByOrderId(ctx, orders) : Promise.resolve(new Map<string, any[]>()),
  ]);

  return orders.map((order) => {
    const customer = customersById.get(order.userId.toString());
    const claimantName =
      options.claimantNameOverride !== undefined
        ? options.claimantNameOverride
        : order.claimedBy
          ? claimantsById.get(order.claimedBy.toString())?.name || null
          : null;

    return {
      ...order,
      customerName: order.deliveryAddress?.name || customer?.name || "Walk-in Customer",
      ...(includeCustomerEmail ? { customerEmail: customer?.email } : {}),
      customerPhone: customer?.phone,
      items: itemsByOrderId.get(order._id.toString()) ?? [],
      ...(includePayments ? { payments: paymentsByOrderId.get(order._id.toString()) ?? [] } : {}),
      claimantName,
    };
  });
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
    const allOrders = await getOrdersInDateRange(ctx, rangeStart, rangeEnd);
    const paymentsByOrderId = await getPaymentsByOrderId(ctx, allOrders);

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
        const methodKey = t.method === "cod" ? "physical" : t.method;
        const existing = breakdownMap.get(methodKey);
        if (existing) {
          existing.amount += t.amount;
          existing.count += 1;
        } else {
          breakdownMap.set(methodKey, { method: methodKey, amount: t.amount, count: 1 });
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
export function parseDateStrToMs(dateStr: string): number {
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

const STAGE_LABELS: Record<string, string> = { mother: "Mother", newborn: "Newborn", kid: "Kid" };
const TIER_LABELS: Record<string, string> = { essentials: "Essentials", musthaves: "Must-Haves", luxuries: "Luxuries" };

export const adminGetSalesAndProductAnalytics = trackedQuery("orders.adminGetSalesAndProductAnalytics", {
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    endDate: v.optional(v.string()), // "YYYY-MM-DD", inclusive, server-local
    paymentMethod: v.optional(v.string()), // "physical"|"momo"|"card"|"voucher"
    channel: v.optional(v.string()), // "online"|"walk_in"|"whatsapp"
    brand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    // 1. Resolve the date range (default: Today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const isAccounting = user.accountRole === "accounting";
    const rangeEndMs = isAccounting
      ? todayMs + dayMs
      : args.endDate
      ? parseDateStrToMs(args.endDate) + dayMs
      : todayMs + dayMs;
    const rangeStartMs = isAccounting
      ? todayMs
      : args.startDate
      ? parseDateStrToMs(args.startDate)
      : todayMs;

    // 2. Fetch only orders in range via the createdAt index, then only the
    // payments belonging to those orders (orderPayments has no date field).
    const allOrders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);
    const paymentsByOrderId = await getPaymentsByOrderId(ctx, allOrders);

    // 3. Filter to completed orders within range. This unfiltered-by-channel/
    // brand list (`ordersInRange`) is the shared base for both halves below -
    // the product-analytics half (which has no channel arg and must always
    // cover every brand for byBrand) reads from it directly, while the
    // sales-metrics half narrows it further into `salesOrders`.
    const ordersInRange = allOrders.filter(
      (o: any) =>
        o.createdAt >= rangeStartMs && o.createdAt < rangeEndMs && completedStatuses.includes(o.status)
    );

    // 3a. orderItems + products are needed unconditionally for the product
    // analytics half below, so fetch them once (over the full unfiltered
    // range) and share the same maps for the brand-ratio proration used by
    // the sales-metrics half.
    const itemsByOrderId = await getOrderItemsByOrderId(ctx, ordersInRange);
    const productsById = await batchGetById(
      ctx,
      ordersInRange.flatMap((o: any) => (itemsByOrderId.get(o._id.toString()) ?? []).map((i: any) => i.productId))
    );

    // 3b. Sales-metrics-only filtering: by channel (order-level filter,
    // unlike payment method which is a tender-level filter applied inside
    // computeAggregate below), then by brand. Orders don't have a single
    // brand (they can mix line items from several brands), so when a brand
    // filter is active, compute what fraction of each order's item revenue
    // belongs to the selected brand and use that as a proration ratio for
    // tenders below. Orders with none of the selected brand are dropped
    // entirely from salesOrders (productAnalytics is unaffected - it filters
    // per-product, not per-order, further down).
    let salesOrders = args.channel
      ? ordersInRange.filter((o: any) => resolveOrderChannel(o) === args.channel)
      : ordersInRange;

    let brandRatioByOrderId: Map<string, number> | null = null;
    if (args.brand) {
      brandRatioByOrderId = new Map();
      for (const order of salesOrders) {
        const items = itemsByOrderId.get(order._id.toString()) ?? [];
        let itemsRevenue = 0;
        let brandRevenue = 0;
        for (const item of items) {
          const revenue = item.unitPrice * item.quantity;
          itemsRevenue += revenue;
          const brand = productsById.get(item.productId.toString())?.brand;
          if (brand === args.brand) brandRevenue += revenue;
        }
        if (brandRevenue > 0 && itemsRevenue > 0) {
          brandRatioByOrderId.set(order._id.toString(), brandRevenue / itemsRevenue);
        }
      }
      salesOrders = salesOrders.filter((o: any) => brandRatioByOrderId!.has(o._id.toString()));
    }

    // 4. Attribute tenders per order, applying the payment-method filter (if
    // any) and, when a brand is selected, prorating each tender by that
    // order's brand-revenue ratio so multi-brand orders don't over-count.
    const computeAggregate = (orders: any[]) => {
      const byMethodMap = new Map<string, { method: string; amount: number; count: number }>();
      const byChannelMap = new Map<string, { channel: string; amount: number; count: number }>();
      const distinctOrderIds = new Set<string>();
      let totalSales = 0;

      for (const order of orders) {
        let tenders = attributeOrderPayments(order, paymentsByOrderId);
        if (args.paymentMethod) {
          tenders = tenders.filter((t) => (t.method === "cod" ? "physical" : t.method) === args.paymentMethod);
        }
        if (tenders.length === 0) continue;

        const ratio = brandRatioByOrderId ? brandRatioByOrderId.get(order._id.toString()) ?? 0 : 1;
        if (ratio === 0) continue;

        distinctOrderIds.add(order._id.toString());
        let orderAmount = 0;
        for (const t of tenders) {
          const amount = t.amount * ratio;
          totalSales += amount;
          orderAmount += amount;
          const methodKey = t.method === "cod" ? "physical" : t.method;
          const existing = byMethodMap.get(methodKey);
          if (existing) {
            existing.amount += amount;
            existing.count += 1;
          } else {
            byMethodMap.set(methodKey, { method: methodKey, amount, count: 1 });
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

    const overall = computeAggregate(salesOrders);

    // 4b. Merge exchange top-up revenue (recorded on `returns`, not
    // `orderPayments` — see returns.submitExchange) into totals so it counts
    // as real sales, while staying separately trackable for auditing. Skipped
    // entirely when brand-filtered: a top-up isn't tied to any specific
    // brand's line items, so it can't be prorated meaningfully.
    const returnsInRange = args.brand
      ? []
      : await ctx.db
          .query("returns")
          .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
          .collect();
    const exchangeTopUps = returnsInRange.filter((r: any) => (r.topUpAmount ?? 0) > 0);

    let exchangeTopUpRevenue = 0;
    for (const t of exchangeTopUps) {
      exchangeTopUpRevenue += t.topUpAmount;
      overall.totalSales += t.topUpAmount;
      const method = t.topUpMethod || "physical";
      const existing = overall.byMethodMap.get(method);
      if (existing) {
        existing.amount += t.topUpAmount;
        existing.count += 1;
      } else {
        overall.byMethodMap.set(method, { method, amount: t.topUpAmount, count: 1 });
      }
    }

    const byPaymentMethod = Array.from(overall.byMethodMap.values())
      .map((b) => ({ ...b, label: PAYMENT_METHOD_LABELS[b.method] || b.method }))
      .sort((a, b) => b.amount - a.amount);
    const byChannel = Array.from(overall.byChannelMap.values())
      .map((b) => ({ ...b, label: CHANNEL_LABELS[b.channel] || b.channel }))
      .sort((a, b) => b.amount - a.amount);
    const aov = overall.orderCount > 0 ? Math.round(overall.totalSales / overall.orderCount) : 0;

    // 5. Time series — hourly for short ranges (<=3 days) so a "Today" or
    // 2-3 day selection still plots a meaningful trend instead of 1-3 points,
    // daily up to 62 days, weekly beyond that.
    const totalRangeDays = Math.round((rangeEndMs - rangeStartMs) / dayMs);
    const bucketGranularity: "hour" | "day" | "week" =
      totalRangeDays <= 3 ? "hour" : totalRangeDays <= 62 ? "day" : "week";
    const bucketMs =
      bucketGranularity === "hour" ? 60 * 60 * 1000 : bucketGranularity === "day" ? dayMs : 7 * dayMs;

    const series: { date: string; bucketStartMs: number; total: number; byMethod: Record<string, number> }[] = [];
    for (let bucketStart = rangeStartMs; bucketStart < rangeEndMs; bucketStart += bucketMs) {
      const bucketEnd = Math.min(bucketStart + bucketMs, rangeEndMs);
      const bucketOrders = salesOrders.filter(
        (o: any) => o.createdAt >= bucketStart && o.createdAt < bucketEnd
      );
      const bucketAgg = computeAggregate(bucketOrders);
      const byMethod: Record<string, number> = {};
      for (const b of bucketAgg.byMethodMap.values()) {
        byMethod[b.method] = b.amount;
      }
      let bucketTotal = bucketAgg.totalSales;
      for (const t of exchangeTopUps) {
        if (t.createdAt >= bucketStart && t.createdAt < bucketEnd) {
          bucketTotal += t.topUpAmount;
          const method = t.topUpMethod || "physical";
          byMethod[method] = (byMethod[method] || 0) + t.topUpAmount;
        }
      }
      series.push({ date: toDateStr(bucketStart), bucketStartMs: bucketStart, total: bucketTotal, byMethod });
    }

    const salesMetrics = {
      totalSales: overall.totalSales,
      orderCount: overall.orderCount,
      aov,
      byPaymentMethod,
      byChannel,
      series,
      bucketGranularity,
      rangeStart: toDateStr(rangeStartMs),
      rangeEnd: toDateStr(rangeEndMs - dayMs),
      exchangeTopUpRevenue,
      exchangeTopUpCount: exchangeTopUps.length,
      exchangeTopUps: exchangeTopUps.map((t: any) => ({
        returnId: t._id,
        orderId: t.orderId,
        amount: t.topUpAmount,
        method: t.topUpMethod,
        createdAt: t.createdAt,
      })),
    };

    // 6. Product analytics half - shares ordersInRange/itemsByOrderId/
    // productsById fetched above instead of re-scanning orders/orderItems.
    // Unlike salesOrders, this always covers every completed order in range
    // regardless of channel/brand filters (byBrand must stay stable, and
    // per-product/category/stage/tier filtering by brand happens below).
    const productAgg = new Map<string, { productId: any; unitsSold: number; revenue: number }>();
    for (const order of ordersInRange) {
      const items = itemsByOrderId.get(order._id.toString()) ?? [];
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
    const byBrandMap = new Map<string, { key: string; label: string; unitsSold: number; revenue: number }>();
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
      const product = productsById.get(key);

      // Brand grouping always runs, ahead of the args.brand filter below, so
      // byBrand keeps every brand's data regardless of which one (if any) is
      // selected - it's both the comparison chart and this filter's own
      // option list, so it can't be narrowed down to just the chosen brand.
      const brandKey = product?.brand || "Unknown";
      const brandEntry = byBrandMap.get(brandKey) || { key: brandKey, label: brandKey, unitsSold: 0, revenue: 0 };
      brandEntry.unitsSold += agg.unitsSold;
      brandEntry.revenue += agg.revenue;
      byBrandMap.set(brandKey, brandEntry);

      if (args.brand && product?.brand !== args.brand) continue;

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

    const productAnalytics = {
      topProducts: topProducts.slice(0, 10),
      byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.revenue - a.revenue),
      byStage: Array.from(byStageMap.values()).sort((a, b) => b.revenue - a.revenue),
      byTier: Array.from(byTierMap.values()).sort((a, b) => b.revenue - a.revenue),
      byBrand: Array.from(byBrandMap.values()).sort((a, b) => b.revenue - a.revenue),
      overallMarginPct,
      productsWithoutCostData: topProducts.length - withCostData.length,
      rangeStart: toDateStr(rangeStartMs),
      rangeEnd: toDateStr(rangeEndMs - dayMs),
    };

    return { salesMetrics, productAnalytics };
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
    await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    // 1. Resolve the date range (default: last 30 days including today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    // 2. Fetch only orders in range via the createdAt index, then only the
    // payments belonging to those orders.
    const allOrders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);
    const paymentsByOrderId = await getPaymentsByOrderId(ctx, allOrders);

    // 3. Filter to completed orders within range (+ optional channel filter)
    let ordersInRange = allOrders.filter((o: any) => completedStatuses.includes(o.status));
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
        (t) => (t.method === "cod" ? "physical" : t.method) === args.paymentMethod
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
    await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);

    const completedStatuses = ["delivered", "returned", "partially_returned"];
    const dayMs = 24 * 60 * 60 * 1000;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;
    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs - 29 * dayMs;

    // Fetch only orders in range via the createdAt index, then only the
    // payments belonging to those orders.
    const allOrders = await getOrdersInDateRange(ctx, rangeStartMs, rangeEndMs);
    const paymentsByOrderId = await getPaymentsByOrderId(ctx, allOrders);

    const ordersInRange = allOrders.filter(
      (o: any) => completedStatuses.includes(o.status) && resolveOrderChannel(o) === args.channel
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
        customerName: order.deliveryAddress?.name || (order.userId ? nameByUserId.get(order.userId.toString()) : null) || "Walk-in Customer",
        amount,
      };
    });

    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows;
  },
});

/**
 * Fast $O(\log N)$ point-lookup for a single order by its human-readable receipt number.
 * Used on the Returns tab to let staff quickly load past orders for returns/exchanges.
 */
export const getOrderByReceiptNumber = trackedQuery("orders.getOrderByReceiptNumber", {
  args: { token: v.string(), receiptNumber: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin", "accounting"]);

    const cleanReceiptNo = args.receiptNumber.trim();
    if (!cleanReceiptNo) return null;

    const order = await ctx.db
      .query("orders")
      .withIndex("by_receiptNumber", (q) => q.eq("receiptNumber", cleanReceiptNo))
      .first();

    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    const orderUser = order.userId ? await ctx.db.get(order.userId) : null;
    const customerName = order.deliveryAddress?.name || orderUser?.name || "Walk-in Customer";

    return {
      ...order,
      customerName,
      items,
    };
  },
});


