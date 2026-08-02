import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { verifyStaffSession } from "./staffAuth";
import { applyInventoryDelta, executeCreateProduct, executeBulkCreateStoreOnlyProducts } from "./products";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";

/**
 * Submits a new product creation request directly for admin approval.
 */
export const requestCreateProduct = trackedMutation("stockRequests.requestCreateProduct", {
  args: {
    token: v.string(),
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    originalPrice: v.number(),
    price: v.optional(v.number()),
    category: v.union(
      v.literal("Expectant and New Mom Essentials"),
      v.literal("Newborn Essentials & Kids Apparel/Footwear"),
      v.literal("Nursery and Furnishing"),
      v.literal("Feeding/Nursing Essentials"),
      v.literal("Bathing and Changing"),
      v.literal("Baby Play and Safety Gear"),
      v.literal("Travel Must-Haves")
    ),
    stage: v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid")),
    tier: v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries")),
    targetGender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unisex"))),
    subCategory: v.optional(v.string()),
    size: v.optional(v.string()),
    color: v.optional(v.string()),
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    isActive: v.boolean(),
    isStoreOnly: v.boolean(),
    initialInventory: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    const requestedName = args.name.trim();
    if (!requestedName) {
      throw new Error("Product name cannot be empty");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("stockRequests", {
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      createdAt: now,
      submittedAt: now,
    });

    const initialInventory = Math.max(0, args.initialInventory ?? 0);
    const itemId = await ctx.db.insert("stockRequestItems", {
      requestId,
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      productName: requestedName,
      currentInventoryAtStage: 0,
      requestedDelta: initialInventory,
      requestedInventory: initialInventory,
      kind: "create_product",
      productData: args,
      status: "pending",
      createdAt: now,
    });

    return { success: true, requestId, itemId };
  },
});

/**
 * Submits a bulk upload (.xlsx) request directly for admin approval.
 */
export const requestBulkUpload = trackedMutation("stockRequests.requestBulkUpload", {
  args: {
    token: v.string(),
    rows: v.array(
      v.object({
        name: v.string(),
        brand: v.optional(v.string()),
        color: v.optional(v.string()),
        quantity: v.optional(v.number()),
        price: v.number(),
        costPrice: v.optional(v.number()),
        barcode: v.optional(v.string()),
        category: v.optional(v.string()),
        stage: v.optional(v.string()),
        tier: v.optional(v.string()),
        description: v.optional(v.string()),
        image: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    if (args.rows.length === 0) {
      throw new Error("Bulk upload payload cannot be empty");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("stockRequests", {
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      createdAt: now,
      submittedAt: now,
    });

    const itemId = await ctx.db.insert("stockRequestItems", {
      requestId,
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      productName: `Bulk Upload (${args.rows.length} product${args.rows.length === 1 ? "" : "s"})`,
      currentInventoryAtStage: 0,
      requestedDelta: 0,
      requestedInventory: 0,
      kind: "bulk_upload",
      productData: { rows: args.rows },
      status: "pending",
      createdAt: now,
    });

    return { success: true, requestId, itemId };
  },
});

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

    const draftsForProduct = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_productId_and_staffId_and_status", (q) =>
        q.eq("productId", args.productId).eq("staffId", user._id).eq("status", "draft")
      )
      .collect();
    const existingDraft = draftsForProduct.find((d) => d.kind !== "name_change");

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
      kind: "inventory_decrease",
      status: "draft",
      createdAt: now,
    });

    return { success: true, draftId };
  },
});

/**
 * Submits a product-name change request directly for admin approval — unlike
 * inventory decreases, renames aren't incremental, so there's no draft/stage
 * step: one submission produces one pending request the admin must approve
 * before the product's name actually changes.
 */
export const requestNameChange = trackedMutation("stockRequests.requestNameChange", {
  args: {
    token: v.string(),
    productId: v.id("products"),
    requestedName: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["stockManager"]);

    const requestedName = args.requestedName.trim();
    if (!requestedName) {
      throw new Error("Product name cannot be empty");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    if (requestedName === product.name) {
      throw new Error("Requested name matches the current name");
    }

    const existingItems = await ctx.db
      .query("stockRequestItems")
      .withIndex("by_productId_and_staffId_and_status", (q) => q.eq("productId", args.productId))
      .collect();
    const alreadyPending = existingItems.some(
      (item) => item.kind === "name_change" && item.status === "pending"
    );
    if (alreadyPending) {
      throw new Error("A name change request for this product is already pending admin approval.");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("stockRequests", {
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      createdAt: now,
      submittedAt: now,
    });

    const itemId = await ctx.db.insert("stockRequestItems", {
      requestId,
      staffId: user._id,
      staffName: user.name ?? "Stock Manager",
      productId: args.productId,
      productName: product.name,
      barcode: product.barcode,
      currentInventoryAtStage: product.inventory ?? 0,
      requestedDelta: 0,
      requestedInventory: product.inventory ?? 0,
      kind: "name_change",
      currentName: product.name,
      requestedName,
      status: "pending",
      createdAt: now,
    });

    return { success: true, requestId, itemId };
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

    const now = Date.now();
    if (item.kind === "name_change") {
      if (!item.productId) throw new Error("Product ID is required for name change");
      if (!item.requestedName) throw new Error("Name change request is missing the requested name");
      await ctx.db.patch(item.productId, { name: item.requestedName, updatedAt: now });
      await ctx.db.patch(args.itemId, {
        status: "approved",
        approvedBy: approver._id,
        approvedAt: now,
      });
    } else if (item.kind === "create_product") {
      if (!item.productData) throw new Error("Product creation payload is missing");
      const created = await executeCreateProduct(ctx, item.productData);
      await ctx.db.patch(args.itemId, {
        productId: created.productId,
        barcode: created.barcode,
        status: "approved",
        approvedBy: approver._id,
        approvedAt: now,
      });
    } else if (item.kind === "bulk_upload") {
      if (!item.productData?.rows) throw new Error("Bulk upload payload is missing");
      await executeBulkCreateStoreOnlyProducts(ctx, item.productData.rows, { actorId: approver._id, actorName: approver.name });
      await ctx.db.patch(args.itemId, {
        status: "approved",
        approvedBy: approver._id,
        approvedAt: now,
      });
    } else {
      if (!item.productId) throw new Error("Product ID is required for inventory decrease");
      await applyInventoryDelta(ctx, item.productId, item.requestedDelta, {
        actorId: approver._id,
        actorName: approver.name,
        source: "stock_request_approval",
        note: `Approved stock decrease requested by ${item.staffName}`,
      });
      await ctx.db.patch(args.itemId, {
        status: "approved",
        approvedBy: approver._id,
        approvedAt: now,
      });
    }

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
        if (item.kind === "name_change") {
          if (!item.productId) throw new Error("Product ID is required for name change");
          if (!item.requestedName) throw new Error("Name change request is missing the requested name");
          await ctx.db.patch(item.productId, { name: item.requestedName, updatedAt: now });
          await ctx.db.patch(item._id, {
            status: "approved",
            approvedBy: approver._id,
            approvedAt: now,
          });
        } else if (item.kind === "create_product") {
          if (!item.productData) throw new Error("Product creation payload is missing");
          const created = await executeCreateProduct(ctx, item.productData);
          await ctx.db.patch(item._id, {
            productId: created.productId,
            barcode: created.barcode,
            status: "approved",
            approvedBy: approver._id,
            approvedAt: now,
          });
        } else if (item.kind === "bulk_upload") {
          if (!item.productData?.rows) throw new Error("Bulk upload payload is missing");
          await executeBulkCreateStoreOnlyProducts(ctx, item.productData.rows, { actorId: approver._id, actorName: approver.name });
          await ctx.db.patch(item._id, {
            status: "approved",
            approvedBy: approver._id,
            approvedAt: now,
          });
        } else {
          if (!item.productId) throw new Error("Product ID is required for inventory decrease");
          await applyInventoryDelta(ctx, item.productId, item.requestedDelta, {
            actorId: approver._id,
            actorName: approver.name,
            source: "stock_request_approval",
            note: `Approved stock decrease requested by ${item.staffName}`,
          });
          await ctx.db.patch(item._id, {
            status: "approved",
            approvedBy: approver._id,
            approvedAt: now,
          });
        }
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
