import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery } from "./lib/ioTracking";

const STAGE_LABELS: Record<string, string> = {
  expectant: "Expectant",
  newborn: "Newborn",
  toddler: "Toddler",
  not_a_mother: "Not a Mom",
};

/**
 * Unified "Leads" feed: shoppers who asked us to source a product we didn't
 * have (storeRequests), shoppers waiting on a back-in-stock alert
 * (wishlistItems with notifyBackInStock === true), and lead-capture signups
 * from the launch page / out-of-stock modal (registryNotifySignups, scoped
 * to source "launch"/"launch_oos"). Merged and sorted newest first;
 * resolved/unresolved filtering and counts are done client-side since this
 * is a small dataset (mirrors getCustomerList's pattern).
 */
export const getLeads = trackedQuery("leads.getLeads", {
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

    const notifyRequests = await ctx.db
      .query("wishlistItems")
      .withIndex("by_notifyBackInStock", (q) => q.eq("notifyBackInStock", true))
      .collect();
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

    const [launchSignups, launchOosSignups] = await Promise.all([
      ctx.db
        .query("registryNotifySignups")
        .withIndex("by_source", (q) => q.eq("source", "launch"))
        .collect(),
      ctx.db
        .query("registryNotifySignups")
        .withIndex("by_source", (q) => q.eq("source", "launch_oos"))
        .collect(),
    ]);
    const notifySignups = [...launchSignups, ...launchOosSignups];
    const notifySignupLeads = notifySignups.map((n) => {
      const stageLabel = n.stage ? STAGE_LABELS[n.stage] ?? n.stage : undefined;
      const detail =
        n.source === "launch_oos"
          ? `Wants restock notification for: ${n.specifications?.join(", ") || "an out-of-stock product"}`
          : `Signed up on the Launch page${stageLabel ? ` · Stage: ${stageLabel}` : ""}`;
      return {
        id: n._id,
        kind: "notifySignup" as const,
        userId: n.userId,
        name: `${n.firstName} ${n.lastName}`.trim(),
        email: n.email,
        phone: n.phone,
        detail,
        createdAt: n.createdAt,
        status: n.status ?? "new",
        resolvedAt: n.resolvedAt,
      };
    });

    // ── Pre-launch sign-ups ───────────────────────────────────────────────
    // Imported customers from the old pre-launch Convex project. They live
    // directly on the users table, identified by importSource = "pre_launch".
    const preLaunchUsers = await ctx.db
      .query("users")
      .withIndex("by_importSource", (q) => q.eq("importSource", "pre_launch"))
      .collect();

    const STAGE_DISPLAY: Record<string, string> = {
      expecting: "Expecting",
      parent: "Parent",
    };

    const preLaunchLeads = preLaunchUsers.map((u) => {
      const stageLabel = u.role ? STAGE_DISPLAY[u.role] : undefined;
      const detail = [
        stageLabel ? `Stage: ${stageLabel}` : null,
        u.customerNotes ?? null,
      ]
        .filter(Boolean)
        .join(" · ") || "Pre-launch sign-up";

      return {
        id: u._id,
        kind: "preLaunchSignup" as const,
        userId: u._id,        // always set → Notes & Reminder always enabled
        name: u.name ?? "—",
        email: u.email,
        phone: u.phone,
        detail,
        createdAt: u._creationTime,   // original sign-up timestamp preserved
        status: u.leadStatus ?? "new",
        resolvedAt: u.leadResolvedAt,
      };
    });

    return [
      ...storeRequestLeads,
      ...wishlistLeads,
      ...notifySignupLeads,
      ...preLaunchLeads,
    ].sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Marks a lead (a storeRequests row, a wishlistItems notify row, or a
 * registryNotifySignups row) resolved or unresolved.
 */
export const resolveLead = mutation({
  args: {
    token: v.string(),
    storeRequestId: v.optional(v.id("storeRequests")),
    wishlistItemId: v.optional(v.id("wishlistItems")),
    notifySignupId: v.optional(v.id("registryNotifySignups")),
    preLaunchUserId: v.optional(v.id("users")),
    resolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const id =
      args.storeRequestId ??
      args.wishlistItemId ??
      args.notifySignupId ??
      args.preLaunchUserId;

    if (!id) {
      throw new Error(
        "Either storeRequestId, wishlistItemId, notifySignupId, or preLaunchUserId is required."
      );
    }
    const row = await ctx.db.get(id);
    if (!row) {
      throw new Error("Lead not found.");
    }

    // Pre-launch leads resolve on the users table using lead-specific fields
    // so they don't collide with existing user status fields.
    if (args.preLaunchUserId) {
      await ctx.db.patch(args.preLaunchUserId, {
        leadStatus: args.resolved ? "resolved" : "new",
        leadResolvedAt: args.resolved ? Date.now() : undefined,
        leadResolvedByStaffId: args.resolved ? staffUser._id : undefined,
      });
    } else {
      await ctx.db.patch(id, {
        status: args.resolved ? "resolved" : "new",
        resolvedAt: args.resolved ? Date.now() : undefined,
        resolvedByStaffId: args.resolved ? staffUser._id : undefined,
      });
    }

    return { success: true };
  },
});
