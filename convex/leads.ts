import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery } from "./lib/ioTracking";

const STAGE_LABELS: Record<string, string> = {
  mother: "Pregnant",
  expectant: "Pregnant",
  newborn: "Newborn",
  kid: "Toddler+",
  toddler: "Toddler",
  not_a_mother: "Not a Mom",
  not_a_mum: "Not a Mom",
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
    const storeRequestLeads = await Promise.all(
      storeRequests.map(async (r) => {
        let userId = r.userId;
        let validUser = userId ? await ctx.db.get(userId) : null;

        if (!validUser && (r.phone || r.email)) {
          if (r.phone) {
            validUser = await ctx.db
              .query("users")
              .withIndex("by_phone", (q) => q.eq("phone", r.phone))
              .first();
          }
          if (!validUser && r.email) {
            validUser = await ctx.db
              .query("users")
              .withIndex("email", (q) => q.eq("email", r.email))
              .first();
          }
        }

        const stageLabel = r.stage ? STAGE_LABELS[r.stage] ?? r.stage : undefined;
        const itemDesc = r.itemDescription || "No item description provided.";
        const detail = stageLabel ? `${itemDesc} · Stage: ${stageLabel}` : itemDesc;

        return {
          id: r._id,
          kind: "storeRequest" as const,
          userId: validUser ? validUser._id : undefined,
          name: `${r.firstName} ${r.lastName}`.trim(),
          email: r.email,
          phone: r.phone,
          stage: r.stage,
          stageLabel,
          itemDescription: r.itemDescription,
          detail,
          createdAt: r.createdAt,
          status: r.status ?? "new",
          resolvedAt: r.resolvedAt,
        };
      })
    );

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
          userId: user ? user._id : undefined,
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
    const notifySignupLeads = await Promise.all(
      notifySignups.map(async (n) => {
        let userId = n.userId;
        let validUser = userId ? await ctx.db.get(userId) : null;

        if (!validUser && (n.phone || n.email)) {
          if (n.phone) {
            validUser = await ctx.db
              .query("users")
              .withIndex("by_phone", (q) => q.eq("phone", n.phone))
              .first();
          }
          if (!validUser && n.email) {
            validUser = await ctx.db
              .query("users")
              .withIndex("email", (q) => q.eq("email", n.email))
              .first();
          }
        }

        const stageLabel = n.stage ? STAGE_LABELS[n.stage] ?? n.stage : undefined;
        const detail =
          n.source === "launch_oos"
            ? `Wants restock notification for: ${n.specifications?.join(", ") || "an out-of-stock product"}`
            : `Signed up on the Launch page${stageLabel ? ` · Stage: ${stageLabel}` : ""}`;
        return {
          id: n._id,
          kind: "notifySignup" as const,
          userId: validUser ? validUser._id : undefined,
          name: `${n.firstName} ${n.lastName}`.trim(),
          email: n.email,
          phone: n.phone,
          detail,
          createdAt: n.createdAt,
          status: n.status ?? "new",
          resolvedAt: n.resolvedAt,
        };
      })
    );

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

    const allLeads = [
      ...storeRequestLeads,
      ...wishlistLeads,
      ...notifySignupLeads,
      ...preLaunchLeads,
    ].filter((lead) => Boolean(lead.email?.trim() || lead.phone?.trim()));

    // ── Scheduled-event / contacted enrichment ─────────────────────────────
    // For every lead linked to a users row, pull its CRM activities so the
    // Leads table can surface "has a scheduled follow-up" and, once that
    // date has passed, whether the lead was actually contacted (activity
    // completed) or not (still pending). Batched per unique userId so leads
    // sharing a customer only fetch activities once.
    const uniqueUserIds = [...new Set(allLeads.map((l) => l.userId).filter(Boolean))];
    const activityEntries = await Promise.all(
      uniqueUserIds.map(async (userId) => [
        userId,
        await ctx.db
          .query("customerActivities")
          .withIndex("by_customerId", (q) => q.eq("customerId", userId as any))
          .collect(),
      ] as const)
    );
    const activitiesByUser = new Map(activityEntries);

    const todayStr = new Date().toISOString().slice(0, 10);

    const enrichedLeads = allLeads.map((lead) => {
      const activities = lead.userId ? activitiesByUser.get(lead.userId) ?? [] : [];

      // Soonest still-pending scheduled activity, if any.
      const pendingScheduled = activities
        .filter((a) => a.status === "pending" && a.scheduledDate)
        .sort((a, b) => (a.scheduledDate! < b.scheduledDate! ? -1 : a.scheduledDate! > b.scheduledDate! ? 1 : 0));

      let eventStatus: "none" | "upcoming" | "overdue" | "contacted" = "none";
      let eventDate: string | undefined;
      let eventTime: string | undefined;
      let eventType: string | undefined;
      let eventNote: string | undefined;
      let eventCompletionNote: string | undefined;

      if (pendingScheduled.length > 0) {
        const next = pendingScheduled[0];
        eventDate = next.scheduledDate;
        eventTime = next.scheduledTime;
        eventType = next.type;
        eventNote = next.note;
        eventStatus = next.scheduledDate! < todayStr ? "overdue" : "upcoming";
      } else {
        // No pending scheduled activity left - if the most recently
        // completed one had a scheduled date, treat it as "contacted".
        const lastCompletedScheduled = activities
          .filter((a) => a.status === "completed" && a.scheduledDate)
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
        if (lastCompletedScheduled.length > 0) {
          const last = lastCompletedScheduled[0];
          eventDate = last.scheduledDate;
          eventTime = last.scheduledTime;
          eventType = last.type;
          eventNote = last.note;
          eventCompletionNote = last.completionNote;
          eventStatus = "contacted";
        }
      }

      return { ...lead, eventStatus, eventDate, eventTime, eventType, eventNote, eventCompletionNote };
    });

    return enrichedLeads.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Ensures a lead has a valid linked customer user record in the `users` table
 * so that notes and activity logs can be attached to them.
 */
export const ensureLeadUser = mutation({
  args: {
    token: v.string(),
    leadKind: v.union(
      v.literal("storeRequest"),
      v.literal("restockNotify"),
      v.literal("notifySignup"),
      v.literal("preLaunchSignup")
    ),
    leadId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    if (args.leadKind === "preLaunchSignup") {
      const user = await ctx.db.get(args.leadId as any);
      if (!user) throw new Error("Lead customer not found in users table.");
      return { userId: user._id };
    }

    let email: string | undefined;
    let phone: string | undefined;
    let name: string | undefined;
    let existingUserId: any;

    if (args.leadKind === "storeRequest") {
      const row = await ctx.db.get(args.leadId as any);
      if (!row) throw new Error("Store request lead not found.");
      existingUserId = row.userId;
      email = row.email;
      phone = row.phone;
      name = `${row.firstName} ${row.lastName}`.trim();
    } else if (args.leadKind === "restockNotify") {
      const row = await ctx.db.get(args.leadId as any);
      if (!row) throw new Error("Restock notification lead not found.");
      existingUserId = row.userId;
      const user = existingUserId ? await ctx.db.get(existingUserId) : null;
      if (user) return { userId: user._id };
    } else if (args.leadKind === "notifySignup") {
      const row = await ctx.db.get(args.leadId as any);
      if (!row) throw new Error("Notify signup lead not found.");
      existingUserId = row.userId;
      email = row.email;
      phone = row.phone;
      name = `${row.firstName} ${row.lastName}`.trim();
    }

    // Check if existingUserId is valid in users table
    if (existingUserId) {
      const user = await ctx.db.get(existingUserId);
      if (user) return { userId: user._id };
    }

    if (!email?.trim() && !phone?.trim()) {
      throw new Error("Cannot process a lead that has no email or phone number.");
    }

    // Try finding by phone or email
    let user = null;
    if (phone) {
      user = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first();
    }
    if (!user && email) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
    }

    let userId = user?._id;
    if (!userId) {
      // Create user record for this lead
      userId = await ctx.db.insert("users", {
        name: name || email || phone || "Lead Customer",
        phone,
        email,
        isWalkIn: true,
        isOnboarded: true,
      });
    }

    // Patch source lead record with the resolved/created userId
    if (args.leadKind === "storeRequest") {
      await ctx.db.patch(args.leadId as any, { userId });
    } else if (args.leadKind === "notifySignup") {
      await ctx.db.patch(args.leadId as any, { userId });
    }

    return { userId };
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
