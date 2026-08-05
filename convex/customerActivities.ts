import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { trackedQuery } from "./lib/ioTracking";
import { internal } from "./_generated/api";

/**
 * Retrieves a list of all customers (users without an accountRole),
 * enriched with their total order count and CRM activity count.
 */
export const getCustomerList = trackedQuery("customerActivities.getCustomerList", {
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify admin or staff role
    await verifyStaffSession(ctx, args.token, ["admin", "staff"]);

    // 2. Fetch only customers (users with no accountRole set) via the indexed field
    const customers = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", undefined))
      .collect();

    // 3. Count orders/activities per customer via their indexes, run
    // concurrently. Scans the whole orders/customerActivities tables
    // subscribe this query to every write in the store, not just
    // customer-relevant ones - indexed per-customer ranges keep the
    // read set (and reactive invalidation) bounded to actual customer data.
    return await Promise.all(
      customers.map(async (c) => {
        const [orders, activities] = await Promise.all([
          ctx.db.query("orders").withIndex("by_user", (q) => q.eq("userId", c._id)).collect(),
          ctx.db.query("customerActivities").withIndex("by_customerId", (q) => q.eq("customerId", c._id)).collect(),
        ]);
        return {
          id: c._id,
          name: c.name ?? "Unnamed Customer",
          email: c.email,
          phone: c.phone,
          customerNotes: c.customerNotes,
          ordersCount: orders.length,
          activitiesCount: activities.length,
          createdAt: c._creationTime,
          loyaltyTier: c.loyaltyTier ?? "bronze",
          churnRisk: c.churnRisk,
          engagementScore: c.engagementScore,
        };
      })
    );
  },
});

/**
 * Patches the customerNotes field on a customer's user document.
 */
export const updateCustomerNotes = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    customerNotes: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify staff or admin session
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Customer user not found");
    }

    if (targetUser.accountRole) {
      throw new Error("Cannot update notes for a staff/admin user");
    }

    await ctx.db.patch(args.userId, {
      customerNotes: args.customerNotes,
    });

    return { success: true };
  },
});

/**
 * Fetches all CRM activities for a specific customer, sorted chronologically descending.
 */
export const getActivitiesByCustomer = trackedQuery("customerActivities.getActivitiesByCustomer", {
  args: {
    token: v.string(),
    customerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify staff or admin session
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const activities = await ctx.db
      .query("customerActivities")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .collect();

    // Sort descending by creation time (newest first)
    return activities.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Inserts a new pending CRM activity record for a customer.
 */
export const addActivity = mutation({
  args: {
    token: v.string(),
    customerId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    type: v.union(v.literal("note"), v.literal("call"), v.literal("meeting"), v.literal("email"), v.literal("other")),
    note: v.string(),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    // Verify staff or admin session
    const { user: staffUser } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const targetUser = await ctx.db.get(args.customerId);
    if (!targetUser) {
      throw new Error("Customer user not found");
    }

    const activityId = await ctx.db.insert("customerActivities", {
      customerId: args.customerId,
      orderId: args.orderId,
      type: args.type,
      note: args.note,
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      priority: args.priority ?? "normal",
      status: args.type === "note" ? "completed" : "pending",
      staffId: staffUser._id,
      staffName: staffUser.name ?? "Staff",
      createdAt: Date.now(),
    });

    if (args.type === "note") {
      await ctx.db.patch(args.customerId, {
        customerNotes: args.note,
      });
    }

    // A "note" logs as immediately completed, which counts toward the CRM-touch
    // component of engagementScore - recompute right away. Scheduled activities
    // (call/meeting/etc.) start "pending" and only count once completeActivity runs.
    if (args.type === "note") {
      try {
        await ctx.runMutation(internal.users.recalculateEngagementAndChurn, { userId: args.customerId });
      } catch (err) {
        console.error("[customerActivities.ts] Failed to recalculate engagement/churn:", err);
      }
    }

    return { success: true, activityId };
  },
});

/**
 * Returns pending activities due today or earlier, enriched with customer
 * contact info, sorted soonest-and-highest-priority first. Used to drive the
 * "up to 3 reminders" dashboard widget and the sidebar due-count badge.
 */
export const getDueActivities = trackedQuery("customerActivities.getDueActivities", {
  args: {
    token: v.string(),
    currentDate: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const allPending = await ctx.db
      .query("customerActivities")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const due = allPending.filter((a) => a.scheduledDate && a.scheduledDate <= args.currentDate);

    const priorityRank = { high: 0, normal: 1, low: 2 };

    // Dedupe customer lookups: due activities sharing a customer only fetch it once.
    const uniqueCustomerIds = [...new Set(due.map((a) => a.customerId))];
    const customerEntries = await Promise.all(
      uniqueCustomerIds.map(async (customerId) => [customerId, await ctx.db.get(customerId)] as const)
    );
    const customerById = new Map(customerEntries);

    const enriched = due.map((activity) => {
      const customer = customerById.get(activity.customerId);
      return {
        ...activity,
        customerName: customer?.name ?? "Unknown Customer",
        customerPhone: customer?.phone,
      };
    });

    return enriched.sort((a, b) => {
      const dateCompare = (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "");
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "");
      if (timeCompare !== 0) return timeCompare;
      return priorityRank[a.priority ?? "normal"] - priorityRank[b.priority ?? "normal"];
    });
  },
});

/**
 * Returns CRM activities linked to a specific order (e.g. a follow-up
 * reminder scheduled at walk-in checkout), newest first.
 */
export const getActivitiesByOrder = trackedQuery("customerActivities.getActivitiesByOrder", {
  args: {
    token: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const activities = await ctx.db
      .query("customerActivities")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    return activities.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Returns every CRM activity (any status), enriched with customer contact
 * info, for the Calendar tab's month view.
 */
export const getAllActivities = trackedQuery("customerActivities.getAllActivities", {
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    // Bounded and most-recent-first, so this can't grow unbounded as activity
    // volume increases over time.
    const allActivities = await ctx.db.query("customerActivities").order("desc").take(2000);

    // Dedupe customer lookups: activities sharing a customer only fetch it once.
    const uniqueCustomerIds = [...new Set(allActivities.map((a) => a.customerId))];
    const customerEntries = await Promise.all(
      uniqueCustomerIds.map(async (customerId) => [customerId, await ctx.db.get(customerId)] as const)
    );
    const customerById = new Map(customerEntries);

    return allActivities.map((activity) => {
      const customer = customerById.get(activity.customerId);
      return {
        ...activity,
        customerName: customer?.name ?? "Unknown Customer",
        customerPhone: customer?.phone,
      };
    });
  },
});

/**
 * Marks a pending CRM activity as completed, updating the status and setting completedAt.
 */
export const completeActivity = mutation({
  args: {
    token: v.string(),
    activityId: v.id("customerActivities"),
  },
  handler: async (ctx, args) => {
    // Verify staff or admin session
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("CRM activity not found");
    }

    if (activity.status !== "pending") {
      throw new Error("CRM activity is already completed or cancelled");
    }

    await ctx.db.patch(args.activityId, {
      status: "completed",
      completedAt: Date.now(),
    });

    try {
      await ctx.runMutation(internal.users.recalculateEngagementAndChurn, { userId: activity.customerId });
    } catch (err) {
      console.error("[customerActivities.ts] Failed to recalculate engagement/churn:", err);
    }

    return { success: true };
  },
});

/**
 * Deletes a CRM activity.
 */
export const deleteActivity = mutation({
  args: {
    token: v.string(),
    activityId: v.id("customerActivities"),
  },
  handler: async (ctx, args) => {
    // Verify staff or admin session
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("CRM activity not found");
    }

    await ctx.db.delete(args.activityId);

    return { success: true };
  },
});

/**
 * Real-time, resource-efficient customer search by name or phone.
 * Uses search_name search index for name search and by_phone index for phone search.
 * Bounded with .take(6) and deduplicated.
 */
export const searchCustomers = trackedQuery("customerActivities.searchCustomers", {
  args: {
    token: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const cleanQuery = args.query.trim();
    if (cleanQuery.length < 2) {
      return [];
    }

    // 1. Search by name using searchIndex (case-insensitive full-text search)
    const nameMatches = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", cleanQuery))
      .take(6);

    // 2. Search by phone using by_phone index
    let phoneMatches: typeof nameMatches = [];
    const cleanPhoneDigits = cleanQuery.replace(/[^\d+]/g, "");
    if (cleanPhoneDigits.length >= 3) {
      phoneMatches = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", cleanQuery))
        .take(6);

      // If exact phone match yielded nothing and query has enough digits, check partial phone match
      if (phoneMatches.length === 0 && cleanPhoneDigits.length >= 4) {
        const customers = await ctx.db
          .query("users")
          .withIndex("by_accountRole", (q) => q.eq("accountRole", undefined))
          .take(100);
        phoneMatches = customers.filter(
          (c) => c.phone && c.phone.replace(/[^\d]/g, "").includes(cleanPhoneDigits)
        );
      }
    }

    // 3. Combine and deduplicate, retaining only non-staff customers
    const combinedMap = new Map();
    [...nameMatches, ...phoneMatches].forEach((u) => {
      if (!u.accountRole) {
        combinedMap.set(u._id.toString(), u);
      }
    });

    return Array.from(combinedMap.values())
      .slice(0, 6)
      .map((c) => ({
        _id: c._id,
        name: c.name ?? "Unnamed Customer",
        phone: c.phone ?? "",
        email: c.email ?? "",
        isWalkIn: !!c.isWalkIn,
        customerNotes: c.customerNotes ?? "",
      }));
  },
});

/**
 * Updates a customer's phone number or name directly.
 */
export const patchCustomerContact = mutation({
  args: {
    token: v.string(),
    customerId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const targetUser = await ctx.db.get(args.customerId);
    if (!targetUser) {
      throw new Error("Customer user not found");
    }
    if (targetUser.accountRole) {
      throw new Error("Cannot update contact info for staff/admin user");
    }

    const updates: Record<string, any> = {};
    if (args.name !== undefined && args.name.trim() !== "") {
      updates.name = args.name.trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim() || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.customerId, updates);
    }

    return { success: true };
  },
});
