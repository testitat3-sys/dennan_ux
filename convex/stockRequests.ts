import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { verifyStaffSession } from "./staffAuth";
import { applyInventoryDelta } from "./products";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";

/**
 * Stages (or updates) a draft inventory-decrease request for one product.
 * `requestedDelta` is the absolute cumulative delta for this product, not an
 * increment — the caller is responsible for adding to any existing draft's
 * delta before calling again (repeated -1 clicks collapse into one row).
 */
export const stageStockDecrease = mutation({
  args: {
    token: v.string(),
    productId: v.id("products"),
    requestedDelta: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    if (args.requestedDelta >= 0) {
      throw new Error("stageStockDecrease is only for inventory reductions");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const currentInventory = product.inventory ?? 0;
    const requestedInventory = currentInventory + args.requestedDelta;
    if (requestedInventory < 0) {
      throw new Error(`Inventory cannot be negative (current: ${currentInventory}, delta: ${args.requestedDelta})`);
    }

    const existingDraft = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_productId_and_staffId_and_status", (q) =>
        q.eq("productId", args.productId).eq("staffId", user._id).eq("status", "draft")
      )
      .unique();

    const now = Date.now();
    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        currentInventoryAtStage: currentInventory,
        requestedDelta: args.requestedDelta,
        requestedInventory,
        updatedAt: now,
      });
      return { success: true, draftId: existingDraft._id };
    }

    const draftId = await ctx.db.insert("stockRequestItems", {
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      productId: args.productId,
      productName: product.name,
      barcode: product.barcode,
      currentInventoryAtStage: currentInventory,
      requestedDelta: args.requestedDelta,
      requestedInventory,
      status: "draft",
      createdAt: now,
    });

    return { success: true, draftId };
  },
});

export const cancelStockDraft = mutation({
  args: {
    token: v.string(),
    draftItemId: v.id("stockRequestItems"),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    const item = await ctx.db.get(args.draftItemId);
    if (!item) throw new Error("Draft not found");
    if (item.status !== "draft") throw new Error(`Item is already ${item.status}`);
    if (item.staffId !== user._id) throw new Error("You can only cancel your own drafts");

    await ctx.db.delete(args.draftItemId);
    return { success: true };
  },
});

export const getMyStockDrafts = trackedQuery("stockRequests.getMyStockDrafts", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    const drafts = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_staffId_and_status", (q) => q.eq("staffId", user._id).eq("status", "draft"))
      .collect();

    return drafts.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const submitStockRequests = trackedMutation("stockRequests.submitStockRequests", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    const drafts = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_staffId_and_status", (q) => q.eq("staffId", user._id).eq("status", "draft"))
      .collect();

    if (drafts.length === 0) {
      throw new Error("No staged reductions to submit");
    }

    // Re-validate against current live inventory — it may have drifted since staging.
    for (const draft of drafts) {
      const product = await ctx.db.get(draft.productId);
      if (!product) throw new Error(`Product ${draft.productName} no longer exists`);
      const currentInventory = product.inventory ?? 0;
      const requestedInventory = currentInventory + draft.requestedDelta;
      if (requestedInventory < 0) {
        throw new Error(
          `${draft.productName}: current inventory (${currentInventory}) is now lower than the staged decrease (${draft.requestedDelta}) allows. Remove or adjust this staged item and try again.`
        );
      }
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("stockRequests", {
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      createdAt: now,
      submittedAt: now,
    });

    for (const draft of drafts) {
      const product = await ctx.db.get(draft.productId);
      const currentInventory = product?.inventory ?? draft.currentInventoryAtStage;
      await ctx.db.patch(draft._id, {
        requestId,
        status: "pending",
        currentInventoryAtStage: currentInventory,
        requestedInventory: currentInventory + draft.requestedDelta,
        updatedAt: now,
      });
    }

    return { success: true, requestId, itemCount: drafts.length };
  },
});

export const getMyStockRequests = trackedQuery("stockRequests.getMyStockRequests", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    const [pending, approved, rejected] = await Promise.all([
      ctx.db
        .query("stockRequestItems")
        .withIndex("by_staffId_and_status", (q) => q.eq("staffId", user._id).eq("status", "pending"))
        .collect(),
      ctx.db
        .query("stockRequestItems")
        .withIndex("by_staffId_and_status", (q) => q.eq("staffId", user._id).eq("status", "approved"))
        .collect(),
      ctx.db
        .query("stockRequestItems")
        .withIndex("by_staffId_and_status", (q) => q.eq("staffId", user._id).eq("status", "rejected"))
        .collect(),
    ]);

    const items = [...pending, ...approved, ...rejected];

    const byRequestId = new Map<string, typeof items>();
    const requestIds: Id<"stockRequests">[] = [];
    for (const item of items) {
      if (!item.requestId) continue;
      const key = item.requestId.toString();
      if (!byRequestId.has(key)) {
        byRequestId.set(key, []);
        requestIds.push(item.requestId);
      }
      byRequestId.get(key)!.push(item);
    }

    const envelopes = await Promise.all(requestIds.map((id) => ctx.db.get(id)));
    const envelopeMap = new Map(requestIds.map((id, i) => [id.toString(), envelopes[i]]));

    const groups = [...byRequestId.entries()].map(([key, groupItems]) => {
      const envelope = envelopeMap.get(key);
      return {
        requestId: key,
        submittedAt: envelope?.submittedAt ?? groupItems[0].createdAt,
        items: groupItems,
      };
    });

    groups.sort((a, b) => b.submittedAt - a.submittedAt);
    return groups;
  },
});

export const getPendingStockRequests = trackedQuery("stockRequests.getPendingStockRequests", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin"]);

    const pendingItems = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const byRequestId = new Map<string, typeof pendingItems>();
    const requestIds: Id<"stockRequests">[] = [];
    for (const item of pendingItems) {
      if (!item.requestId) continue;
      const key = item.requestId.toString();
      if (!byRequestId.has(key)) {
        byRequestId.set(key, []);
        requestIds.push(item.requestId);
      }
      byRequestId.get(key)!.push(item);
    }

    const envelopes = await Promise.all(requestIds.map((id) => ctx.db.get(id)));
    const envelopeMap = new Map(requestIds.map((id, i) => [id.toString(), envelopes[i]]));

    const groups = [...byRequestId.entries()].map(([key, groupItems]) => {
      const envelope = envelopeMap.get(key);
      return {
        requestId: key,
        staffName: envelope?.staffName ?? groupItems[0].staffName,
        submittedAt: envelope?.submittedAt ?? groupItems[0].createdAt,
        items: groupItems,
      };
    });

    groups.sort((a, b) => b.submittedAt - a.submittedAt);
    return groups;
  },
});

export const approveStockRequestItem = trackedMutation("stockRequests.approveStockRequestItem", {
  args: { token: v.string(), itemId: v.id("stockRequestItems") },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["admin"]);

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Stock request item not found");
    if (item.status !== "pending") throw new Error(`Item is already ${item.status}`);

    await applyInventoryDelta(ctx, item.productId, item.requestedDelta);

    await ctx.db.patch(args.itemId, {
      status: "approved",
      approvedBy: approver._id,
      approvedAt: Date.now(),
    });

    return { success: true };
  },
});

export const rejectStockRequestItem = mutation({
  args: {
    token: v.string(),
    itemId: v.id("stockRequestItems"),
    rejectedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["admin"]);

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Stock request item not found");
    if (item.status !== "pending") throw new Error(`Item is already ${item.status}`);

    await ctx.db.patch(args.itemId, {
      status: "rejected",
      approvedBy: approver._id,
      approvedAt: Date.now(),
      rejectedReason: args.rejectedReason,
    });

    return { success: true };
  },
});

export const approveStockRequestBatch = trackedMutation("stockRequests.approveStockRequestBatch", {
  args: { token: v.string(), requestId: v.id("stockRequests") },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["admin"]);

    const items = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect();

    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      throw new Error("No pending items on this request to approve");
    }

    const now = Date.now();
    let approvedCount = 0;
    const failedItems: { itemId: string; error: string }[] = [];

    for (const item of pendingItems) {
      try {
        await applyInventoryDelta(ctx, item.productId, item.requestedDelta);
        await ctx.db.patch(item._id, {
          status: "approved",
          approvedBy: approver._id,
          approvedAt: now,
        });
        approvedCount++;
      } catch (err: any) {
        failedItems.push({ itemId: item._id, error: err.message });
      }
    }

    return { success: true, approvedCount, failedItems };
  },
});

export const rejectStockRequestBatch = trackedMutation("stockRequests.rejectStockRequestBatch", {
  args: {
    token: v.string(),
    requestId: v.id("stockRequests"),
    rejectedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: approver } = await verifyStaffSession(ctx, args.token, ["admin"]);

    const items = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect();

    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      throw new Error("No pending items on this request to reject");
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
