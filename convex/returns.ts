import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { Id } from "./_generated/dataModel";

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
      await ctx.db.patch(pToUpdate._id, {
        inventory: pToUpdate.inventory + quantity,
      });
    }
  }
}

export const submitReturn = mutation({
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

export const approveReturnItem = mutation({
  args: {
    token: v.string(),
    returnItemId: v.id("returnItems"),
  },
  handler: async (ctx, args) => {
    const { user: adminUser } = await verifyStaffSession(ctx, args.token, ["admin"]);

    const item = await ctx.db.get(args.returnItemId);
    if (!item) throw new Error("Return item not found");
    if (item.status !== "pending") {
      throw new Error(`Return item is already ${item.status}`);
    }

    await restockByBarcode(ctx, item.productId, item.quantity);

    await ctx.db.patch(args.returnItemId, {
      status: "approved",
      approvedBy: adminUser._id,
      approvedAt: Date.now(),
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
    const { user: adminUser } = await verifyStaffSession(ctx, args.token, ["admin"]);

    const item = await ctx.db.get(args.returnItemId);
    if (!item) throw new Error("Return item not found");
    if (item.status !== "pending") {
      throw new Error(`Return item is already ${item.status}`);
    }

    await ctx.db.patch(args.returnItemId, {
      status: "rejected",
      approvedBy: adminUser._id,
      approvedAt: Date.now(),
      rejectedReason: args.rejectedReason,
    });

    return { success: true };
  },
});

export const getPendingReturns = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

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

    const results = [];
    for (const [, items] of byReturnId) {
      const returnEnvelope = await ctx.db.get(items[0].returnId);
      if (!returnEnvelope) continue;
      const order = await ctx.db.get(items[0].orderId);
      const orderUser = order ? await ctx.db.get(order.userId) : null;
      const customerName = order?.deliveryAddress?.name || orderUser?.name || "Unknown";

      results.push({
        returnId: items[0].returnId,
        orderId: items[0].orderId,
        customerName,
        staffName: returnEnvelope.staffName,
        note: returnEnvelope.note,
        createdAt: returnEnvelope.createdAt,
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
      });
    }

    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

export const getReturnItemsForOrder = query({
  args: { token: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    return await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

export { restockByBarcode };
