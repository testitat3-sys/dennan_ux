import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";

/**
 * Unified "Leads" feed: shoppers who asked us to source a product we didn't
 * have (storeRequests) plus shoppers waiting on a back-in-stock alert
 * (wishlistItems with notifyBackInStock === true). Merged and sorted newest
 * first; resolved/unresolved filtering and counts are done client-side since
 * this is a small dataset (mirrors getCustomerList's pattern).
 */
export const getLeads = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const storeRequests = await ctx.db.query("storeRequests").collect();
    const storeRequestLeads = storeRequests.map((r) => ({
      id: r._id,
      kind: "storeRequest" as const,
      userId: r.userId,
      name: `${r.firstName} ${r.lastName}`.trim(),
      email: r.email,
      phone: r.phone,
      detail: r.itemDescription || "No item description provided.",
      createdAt: r.createdAt,
      status: r.status ?? "new",
      resolvedAt: r.resolvedAt,
    }));

    const notifyRequests = (await ctx.db.query("wishlistItems").collect()).filter(
      (w) => w.notifyBackInStock === true
    );
    const wishlistLeads = await Promise.all(
      notifyRequests.map(async (w) => {
        const [user, product] = await Promise.all([
          ctx.db.get(w.userId),
          ctx.db.get(w.productId),
        ]);
        return {
          id: w._id,
          kind: "restockNotify" as const,
          userId: w.userId,
          name: user?.name ?? "Unknown Customer",
          email: user?.email,
          phone: user?.phone,
          detail: product?.name ?? "Unknown product",
          createdAt: w.addedAt,
          status: w.status ?? "new",
          resolvedAt: w.resolvedAt,
        };
      })
    );

    return [...storeRequestLeads, ...wishlistLeads].sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Marks a lead (either a storeRequests row or a wishlistItems notify row)
 * resolved or unresolved.
 */
export const resolveLead = mutation({
  args: {
    token: v.string(),
    storeRequestId: v.optional(v.id("storeRequests")),
    wishlistItemId: v.optional(v.id("wishlistItems")),
    resolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const id = args.storeRequestId ?? args.wishlistItemId;
    if (!id) {
      throw new Error("Either storeRequestId or wishlistItemId is required.");
    }
    const row = await ctx.db.get(id);
    if (!row) {
      throw new Error("Lead not found.");
    }

    await ctx.db.patch(id, {
      status: args.resolved ? "resolved" : "new",
      resolvedAt: args.resolved ? Date.now() : undefined,
      resolvedByStaffId: args.resolved ? staffUser._id : undefined,
    });

    return { success: true };
  },
});
