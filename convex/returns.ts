import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { verifyStaffSession } from "./staffAuth";
import { appendAttribute } from "./attributes";
import { applyStockCounterDelta } from "./stockCounters";
import { Id } from "./_generated/dataModel";
import { parseDateStrToMs } from "./orders";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";

// Restocks a product (and any barcode-matching duplicate product rows) by `quantity`.
async function restockByBarcode(ctx: any, productId: Id<"products">, quantity: number) {
  const product = await ctx.db.get(productId);
  if (!product) return;

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
        productsToUpdate.push(p);
      }
    }
  }

  for (const pToUpdate of productsToUpdate) {
    if (pToUpdate.inventory !== undefined) {
      const newInventory = pToUpdate.inventory + quantity;
      await ctx.db.patch(pToUpdate._id, {
        inventory: newInventory,
        updatedAt: Date.now(),
      });
      await applyStockCounterDelta(
        ctx,
        { inventory: pToUpdate.inventory, reorderPoint: pToUpdate.reorderPoint },
        { inventory: newInventory, reorderPoint: pToUpdate.reorderPoint },
        pToUpdate._id
      );
    }
  }
}

export const submitReturn = trackedMutation("returns.submitReturn", {
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    returnedItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        reason: v.optional(v.string()),
      })
    ),
    refundAmount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify caller is staff or admin
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    // 2. Fetch the order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // 3. Fetch original order items
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    if (orderItems.length === 0) {
      throw new Error("No items found for this order");
    }

    // 4. Fetch existing return line items for this order (any status, since a
    // pending/rejected item shouldn't block re-counting, but approved+pending both
    // represent quantity already claimed against this order)
    const existingReturnItems = await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.neq(q.field("status"), "rejected"))
      .collect();

    const orderItemsMap = new Map(orderItems.map((item) => [item.productId, item]));

    const alreadyReturnedMap = new Map<Id<"products">, number>();
    for (const item of existingReturnItems) {
      alreadyReturnedMap.set(
        item.productId,
        (alreadyReturnedMap.get(item.productId) || 0) + item.quantity
      );
    }

    // Enriched return items (with name and unit price from the order items)
    const enrichedReturnedItems = [];

    for (const retItem of args.returnedItems) {
      if (retItem.quantity <= 0) {
        throw new Error(`Invalid return quantity ${retItem.quantity} for product ${retItem.productId}`);
      }

      const originalItem = orderItemsMap.get(retItem.productId);
      if (!originalItem) {
        throw new Error(`Product ${retItem.productId} was not part of the original order`);
      }

      const previouslyReturned = alreadyReturnedMap.get(retItem.productId) || 0;
      if (previouslyReturned + retItem.quantity > originalItem.quantity) {
        throw new Error(
          `Cannot return ${retItem.quantity} of product ${originalItem.productName}. ` +
          `Ordered: ${originalItem.quantity}, Already returned/pending: ${previouslyReturned}.`
        );
      }

      enrichedReturnedItems.push({
        productId: retItem.productId,
        name: originalItem.productName,
        quantity: retItem.quantity,
        unitPrice: originalItem.unitPrice,
        reason: retItem.reason,
      });
    }

    const now = Date.now();

    // 5. Insert the returns envelope row
    const returnId = await ctx.db.insert("returns", {
      orderId: args.orderId,
      refundAmount: args.refundAmount,
      note: args.note,
      staffId: staffUser._id,
      staffName: staffUser.name ?? "Staff",
      createdAt: now,
    });

    // 6. Insert one pending returnItems row per line — no restock here
    for (const item of enrichedReturnedItems) {
      await ctx.db.insert("returnItems", {
        returnId,
        orderId: args.orderId,
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reason: item.reason,
        status: "pending",
        source: "manual_return",
        createdAt: now,
      });
    }

    // 7. Calculate total ordered vs total returned (incl. this submission) to set the
    // order's status immediately, for staff visibility, independent of approval state
    let totalOrderedQty = 0;
    for (const item of orderItems) {
      totalOrderedQty += item.quantity;
    }

    let totalReturnedQty = 0;
    for (const qty of alreadyReturnedMap.values()) {
      totalReturnedQty += qty;
    }
    for (const item of args.returnedItems) {
      totalReturnedQty += item.quantity;
    }

    const newStatus = totalReturnedQty >= totalOrderedQty ? "returned" : "partially_returned";
    await ctx.db.patch(args.orderId, {
      status: newStatus,
      history: [
        ...(order.history ?? []),
        { status: newStatus, timestamp: now, note: `Return submitted by ${staffUser.name ?? "Staff"} — awaiting admin approval` },
      ],
    });

    return {
      success: true,
      returnId,
      status: newStatus,
    };
  },
});

export const processReturn = submitReturn;

/**
 * Exchange-only replacement for submitReturn: customers no longer receive cash
 * refunds. They must pick replacement product(s) — topping up if the exchange
 * is pricier than what they returned, or accepting that any leftover value on
 * a cheaper exchange is forfeited (never paid back in cash).
 */
export const submitExchange = trackedMutation("returns.submitExchange", {
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    returnedItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        reason: v.optional(v.string()),
        restock: v.boolean(),
      })
    ),
    exchangeItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
      })
    ),
    topUp: v.optional(
      v.object({
        method: v.union(v.literal("physical"), v.literal("momo"), v.literal("card")),
        amount: v.number(),
        momoPhone: v.optional(v.string()),
        cardOrderId: v.optional(v.string()),
      })
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    if (args.returnedItems.length === 0) {
      throw new Error("At least one returned item is required");
    }
    if (args.exchangeItems.length === 0) {
      throw new Error("At least one exchange item is required");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    if (orderItems.length === 0) {
      throw new Error("No items found for this order");
    }

    const existingReturnItems = await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.neq(q.field("status"), "rejected"))
      .collect();

    const orderItemsMap = new Map(orderItems.map((item) => [item.productId, item]));
    const alreadyReturnedMap = new Map<Id<"products">, number>();
    for (const item of existingReturnItems) {
      alreadyReturnedMap.set(
        item.productId,
        (alreadyReturnedMap.get(item.productId) || 0) + item.quantity
      );
    }

    const enrichedReturnedItems = [];
    for (const retItem of args.returnedItems) {
      if (retItem.quantity <= 0) {
        throw new Error(`Invalid return quantity ${retItem.quantity} for product ${retItem.productId}`);
      }
      const originalItem = orderItemsMap.get(retItem.productId);
      if (!originalItem) {
        throw new Error(`Product ${retItem.productId} was not part of the original order`);
      }
      const previouslyReturned = alreadyReturnedMap.get(retItem.productId) || 0;
      if (previouslyReturned + retItem.quantity > originalItem.quantity) {
        throw new Error(
          `Cannot return ${retItem.quantity} of product ${originalItem.productName}. ` +
          `Ordered: ${originalItem.quantity}, Already returned/pending: ${previouslyReturned}.`
        );
      }
      enrichedReturnedItems.push({
        productId: retItem.productId,
        name: originalItem.productName,
        quantity: retItem.quantity,
        unitPrice: originalItem.unitPrice,
        reason: retItem.reason,
        restock: retItem.restock,
      });
    }

    // Value of the returned items, proportionally discounted like the original order.
    let returnedTotal = 0;
    for (const item of enrichedReturnedItems) {
      returnedTotal += item.quantity * item.unitPrice;
    }
    if (order.subtotal > 0 && order.discountAmount > 0) {
      const discountPercentage = order.discountAmount / order.subtotal;
      returnedTotal = Math.round(returnedTotal * (1 - discountPercentage));
    }

    // Validate + price the exchange selection at current product prices.
    const enrichedExchangeItems = [];
    let exchangeTotal = 0;
    for (const exItem of args.exchangeItems) {
      if (exItem.quantity <= 0) {
        throw new Error(`Invalid exchange quantity ${exItem.quantity}`);
      }
      const product = await ctx.db.get(exItem.productId);
      if (!product) {
        throw new Error(`Exchange product ${exItem.productId} not found`);
      }
      if (product.inventory !== undefined && product.inventory < exItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}: have ${product.inventory}, need ${exItem.quantity}`);
      }
      const hasActiveDiscount = product.discountPrice != null && product.discountExpiry != null && product.discountExpiry > Date.now();
      const unitPrice = hasActiveDiscount ? product.discountPrice : product.price;
      enrichedExchangeItems.push({ productId: exItem.productId, name: product.name, quantity: exItem.quantity, unitPrice });
      exchangeTotal += exItem.quantity * unitPrice;
    }

    // Pricier exchange requires a sufficient top-up; cheaper exchange forfeits
    // the difference outright — there is never a cash refund either way.
    const difference = exchangeTotal - returnedTotal;
    let topUpAmount = 0;
    let topUpMethod: "physical" | "momo" | "card" | undefined;
    let topUpMomoPhone: string | undefined;
    let topUpCardOrderId: string | undefined;
    if (difference > 0) {
      if (!args.topUp || args.topUp.amount < difference) {
        throw new Error(
          `Exchange total (UGX ${exchangeTotal.toLocaleString()}) exceeds the returned value ` +
          `(UGX ${returnedTotal.toLocaleString()}) by UGX ${difference.toLocaleString()}, but no sufficient top-up was provided.`
        );
      }
      topUpAmount = args.topUp.amount;
      topUpMethod = args.topUp.method;
      topUpMomoPhone = args.topUp.momoPhone;
      topUpCardOrderId = args.topUp.cardOrderId;
    }

    const now = Date.now();

    const returnId = await ctx.db.insert("returns", {
      orderId: args.orderId,
      refundAmount: 0,
      note: args.note,
      staffId: staffUser._id,
      staffName: staffUser.name ?? "Staff",
      createdAt: now,
      exchangeTotal,
      returnedTotal,
      topUpAmount,
      topUpMethod,
      topUpMomoPhone,
      topUpCardOrderId,
    });

    // Returned items are resolved immediately — the restock decision is made
    // by whoever submits the return, not deferred to a later approval step.
    for (const item of enrichedReturnedItems) {
      await ctx.db.insert("returnItems", {
        returnId,
        orderId: args.orderId,
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reason: item.reason,
        status: "approved",
        source: "manual_return",
        approvedBy: staffUser._id,
        approvedAt: now,
        restocked: item.restock,
        createdAt: now,
      });
      if (item.restock) {
        await restockByBarcode(ctx, item.productId, item.quantity);
      }
    }

    // Exchange items leave the shop immediately — decrement stock right away
    // rather than waiting for admin/cashier approval of the returned items.
    for (const item of enrichedExchangeItems) {
      await ctx.db.insert("returnExchangeItems", {
        returnId,
        orderId: args.orderId,
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        createdAt: now,
      });
      await restockByBarcode(ctx, item.productId, -item.quantity);
      await appendAttribute(ctx, "products", item.productId, "sold_via_exchange");
    }

    await appendAttribute(ctx, "orders", args.orderId, "fulfilled_via_exchange", returnId.toString());

    let totalOrderedQty = 0;
    for (const item of orderItems) totalOrderedQty += item.quantity;
    let totalReturnedQty = 0;
    for (const qty of alreadyReturnedMap.values()) totalReturnedQty += qty;
    for (const item of args.returnedItems) totalReturnedQty += item.quantity;

    const newStatus = totalReturnedQty >= totalOrderedQty ? "returned" : "partially_returned";
    await ctx.db.patch(args.orderId, {
      status: newStatus,
      history: [
        ...(order.history ?? []),
        { status: newStatus, timestamp: now, note: `Exchange processed by ${staffUser.name ?? "Staff"}` },
      ],
    });

    return {
      success: true,
      returnId,
      status: newStatus,
      returnedTotal,
      exchangeTotal,
      topUpAmount,
    };
  },
});

export const approveReturnItem = trackedMutation("returns.approveReturnItem", {
  args: {
    token: v.string(),
    returnItemId: v.id("returnItems"),
    // Whether the returned item goes back on the shelf. Defaults to true to
    // preserve legacy behavior for callers that predate this option.
    restock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const item = await ctx.db.get(args.returnItemId);
    if (!item) throw new Error("Return item not found");
    if (item.status !== "pending") {
      throw new Error(`Return item is already ${item.status}`);
    }

    const shouldRestock = args.restock ?? true;
    if (shouldRestock) {
      await restockByBarcode(ctx, item.productId, item.quantity);
    }

    await ctx.db.patch(args.returnItemId, {
      status: "approved",
      approvedBy: approver._id,
      approvedAt: Date.now(),
      restocked: shouldRestock,
    });

    return { success: true };
  },
});

export const rejectReturnItem = mutation({
  args: {
    token: v.string(),
    returnItemId: v.id("returnItems"),
    rejectedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const item = await ctx.db.get(args.returnItemId);
    if (!item) throw new Error("Return item not found");
    if (item.status !== "pending") {
      throw new Error(`Return item is already ${item.status}`);
    }

    await ctx.db.patch(args.returnItemId, {
      status: "rejected",
      approvedBy: approver._id,
      approvedAt: Date.now(),
      rejectedReason: args.rejectedReason,
    });

    return { success: true };
  },
});

/**
 * Rejects a return in one action instead of one-by-one: every still-pending
 * returnItem for the given return is rejected with the same reason. Items
 * already approved/rejected in the same return are left untouched.
 */
export const rejectReturn = trackedMutation("returns.rejectReturn", {
  args: {
    token: v.string(),
    returnId: v.id("returns"),
    rejectedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const returnItems = await ctx.db
      .query("returnItems")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    const pendingItems = returnItems.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      throw new Error("No pending items on this return to reject");
    }

    const now = Date.now();
    for (const item of pendingItems) {
      await ctx.db.patch(item._id, {
        status: "rejected",
        approvedBy: approver._id,
        approvedAt: now,
        rejectedReason: args.rejectedReason,
      });
    }

    return { success: true, rejectedCount: pendingItems.length };
  },
});

/**
 * Shared batch-enrichment for a set of return groups (mirrors Refactor 2's
 * enrichOrders pattern, applied to returns): given `{ returnId, orderId,
 * items }` groups, batches the envelope/order/user/exchangeItems lookups by
 * unique ID via Promise.all instead of awaiting them one group at a time.
 */
async function enrichReturns(
  ctx: any,
  groups: { returnId: Id<"returns">; orderId: Id<"orders">; items: any[] }[]
) {
  const uniqueReturnIds = [...new Set(groups.map((g) => g.returnId))];
  const uniqueOrderIds = [...new Set(groups.map((g) => g.orderId))];

  const [returnEnvelopes, orders, exchangeItemsByReturn] = await Promise.all([
    Promise.all(uniqueReturnIds.map((id) => ctx.db.get(id))),
    Promise.all(uniqueOrderIds.map((id) => ctx.db.get(id))),
    Promise.all(
      uniqueReturnIds.map((id) =>
        ctx.db
          .query("returnExchangeItems")
          .withIndex("by_return", (q: any) => q.eq("returnId", id))
          .collect()
      )
    ),
  ]);

  const returnEnvelopeMap = new Map(uniqueReturnIds.map((id, i) => [id.toString(), returnEnvelopes[i]]));
  const orderMap = new Map(uniqueOrderIds.map((id, i) => [id.toString(), orders[i]]));
  const exchangeItemsMap = new Map(uniqueReturnIds.map((id, i) => [id.toString(), exchangeItemsByReturn[i]]));

  const uniqueUserIds = [
    ...new Set(orders.filter(Boolean).map((o: any) => o.userId.toString())),
  ] as Id<"users">[];
  const users = await Promise.all(uniqueUserIds.map((id) => ctx.db.get(id)));
  const userMap = new Map(uniqueUserIds.map((id, i) => [id.toString(), users[i]]));

  const results = [];
  for (const group of groups) {
    const returnEnvelope = returnEnvelopeMap.get(group.returnId.toString());
    if (!returnEnvelope) continue;
    const order = orderMap.get(group.orderId.toString());
    const orderUser = order ? userMap.get(order.userId.toString()) : null;
    const customerName = order?.deliveryAddress?.name || orderUser?.name || "Unknown";
    const exchangeItems = exchangeItemsMap.get(group.returnId.toString()) ?? [];

    results.push({
      returnId: group.returnId,
      orderId: group.orderId,
      customerName,
      staffName: returnEnvelope.staffName,
      note: returnEnvelope.note,
      createdAt: returnEnvelope.createdAt,
      returnedTotal: returnEnvelope.returnedTotal,
      exchangeTotal: returnEnvelope.exchangeTotal,
      topUpAmount: returnEnvelope.topUpAmount,
      topUpMethod: returnEnvelope.topUpMethod,
      items: group.items.map((i) => ({
        _id: i._id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        reason: i.reason,
        status: i.status,
        source: i.source,
        rejectedReason: i.rejectedReason,
        restocked: i.restocked,
      })),
      exchangeItems: exchangeItems.map((e: any) => ({
        _id: e._id,
        productId: e.productId,
        productName: e.productName,
        quantity: e.quantity,
        unitPrice: e.unitPrice,
      })),
    });
  }

  return results;
}

export const getPendingReturns = trackedQuery("returns.getPendingReturns", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const pendingItems = await ctx.db
      .query("returnItems")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const byReturnId = new Map<string, typeof pendingItems>();
    for (const item of pendingItems) {
      const key = item.returnId.toString();
      if (!byReturnId.has(key)) byReturnId.set(key, []);
      byReturnId.get(key)!.push(item);
    }

    const groups = [...byReturnId.values()].map((items) => ({
      returnId: items[0].returnId,
      orderId: items[0].orderId,
      items,
    }));

    const results = await enrichReturns(ctx, groups);
    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

/**
 * Date-range-bounded returns list (defaults to "today"), showing returns
 * whether or not they've been resolved yet — the history view companion to
 * getPendingReturns. Mirrors orders.adminGetOrdersByDateRange's date-range
 * pattern against the returns table's by_createdAt index, then reuses the
 * same per-return enrichment shape as getPendingReturns.
 */
// NOTE: consumed via usePaginatedQuery on the frontend, which requires the
// raw PaginationResult shape - trackedQuery's {data, _io} envelope would
// break pagination, so this stays a plain query.
export const getReturnsByDateRange = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()), // "YYYY-MM-DD", server-local; defaults to today
    endDate: v.optional(v.string()), // "YYYY-MM-DD", server-local; defaults to today
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const rangeStartMs = args.startDate ? parseDateStrToMs(args.startDate) : todayMs;
    const rangeEndMs = args.endDate ? parseDateStrToMs(args.endDate) + dayMs : todayMs + dayMs;

    const result = await ctx.db
      .query("returns")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", rangeStartMs).lt("createdAt", rangeEndMs))
      .order("desc")
      .paginate(args.paginationOpts);

    const itemsByReturn = await Promise.all(
      result.page.map((returnEnvelope) =>
        ctx.db
          .query("returnItems")
          .withIndex("by_return", (q) => q.eq("returnId", returnEnvelope._id))
          .collect()
      )
    );

    const groups = result.page
      .map((returnEnvelope, i) => ({
        returnId: returnEnvelope._id,
        orderId: returnEnvelope.orderId,
        items: itemsByReturn[i],
      }))
      .filter((g) => g.items.length > 0);

    const enrichedPage = await enrichReturns(ctx, groups);

    return {
      ...result,
      page: enrichedPage,
    };
  },
});

export const getReturnItemsForOrder = trackedQuery("returns.getReturnItemsForOrder", {
  args: { token: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    return await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

/**
 * Single-return detail, same enriched shape as getPendingReturns/
 * getReturnsByDateRange - powers TradeReturnPage, which fetches its own
 * data via a returnId route param instead of receiving it as a prop.
 */
export const getReturnById = trackedQuery("returns.getReturnById", {
  args: { token: v.string(), returnId: v.id("returns") },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const returnEnvelope = await ctx.db.get(args.returnId);
    if (!returnEnvelope) return null;

    const items = await ctx.db
      .query("returnItems")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    const order = await ctx.db.get(returnEnvelope.orderId);
    const orderUser = order ? await ctx.db.get(order.userId) : null;
    const customerName = order?.deliveryAddress?.name || orderUser?.name || "Unknown";

    const exchangeItems = await ctx.db
      .query("returnExchangeItems")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    return {
      returnId: returnEnvelope._id,
      orderId: returnEnvelope.orderId,
      customerName,
      staffName: returnEnvelope.staffName,
      note: returnEnvelope.note,
      createdAt: returnEnvelope.createdAt,
      returnedTotal: returnEnvelope.returnedTotal,
      exchangeTotal: returnEnvelope.exchangeTotal,
      topUpAmount: returnEnvelope.topUpAmount,
      topUpMethod: returnEnvelope.topUpMethod,
      items: items.map((i) => ({
        _id: i._id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        reason: i.reason,
        status: i.status,
        source: i.source,
      })),
      exchangeItems: exchangeItems.map((e) => ({
        _id: e._id,
        productId: e.productId,
        productName: e.productName,
        quantity: e.quantity,
        unitPrice: e.unitPrice,
      })),
    };
  },
});

export { restockByBarcode };
