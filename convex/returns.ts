import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { Id } from "./_generated/dataModel";

export const processReturn = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    returnedItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
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

    // 4. Fetch existing returns for this order
    const existingReturns = await ctx.db
      .query("returns")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Map order items by productId for easy validation and info retrieval
    const orderItemsMap = new Map(orderItems.map((item) => [item.productId, item]));

    // Map already returned quantities
    const alreadyReturnedMap = new Map<Id<"products">, number>();
    for (const ret of existingReturns) {
      for (const item of ret.returnedItems) {
        alreadyReturnedMap.set(
          item.productId,
          (alreadyReturnedMap.get(item.productId) || 0) + item.quantity
        );
      }
    }

    // Enriched return items (with name and unit price from the order items)
    const enrichedReturnedItems = [];

    // Validate quantities
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
          `Ordered: ${originalItem.quantity}, Already returned: ${previouslyReturned}.`
        );
      }

      enrichedReturnedItems.push({
        productId: retItem.productId,
        name: originalItem.productName,
        quantity: retItem.quantity,
        unitPrice: originalItem.unitPrice,
      });
    }

    // 5. Insert returns record
    const returnId = await ctx.db.insert("returns", {
      orderId: args.orderId,
      returnedItems: enrichedReturnedItems,
      refundAmount: args.refundAmount,
      note: args.note,
      staffId: staffUser._id,
      staffName: staffUser.name ?? "Staff",
      createdAt: Date.now(),
    });

    // 6. Calculate total ordered vs total returned to determine updated order status
    let totalOrderedQty = 0;
    for (const item of orderItems) {
      totalOrderedQty += item.quantity;
    }

    let totalReturnedQty = 0;
    // Tally previously returned
    for (const qty of alreadyReturnedMap.values()) {
      totalReturnedQty += qty;
    }
    // Add current return
    for (const item of args.returnedItems) {
      totalReturnedQty += item.quantity;
    }

    const newStatus = totalReturnedQty >= totalOrderedQty ? "returned" : "partially_returned";
    await ctx.db.patch(args.orderId, { status: newStatus });

    // 7. Restock inventory
    for (const retItem of args.returnedItems) {
      const product = await ctx.db.get(retItem.productId);
      if (product && product.inventory !== undefined) {
        await ctx.db.patch(product._id, {
          inventory: product.inventory + retItem.quantity,
        });
      }
    }

    return {
      success: true,
      returnId,
      status: newStatus,
    };
  },
});
