import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * Get the current authenticated user's details.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    console.log(`[convex/users.ts] Viewer query - userId: ${userId}`);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    console.log(`[convex/users.ts] Viewer query - user found: ${!!user}, onboarded: ${user?.isOnboarded}, admin: ${user?.isAdmin}`);
    if (!user) {
      return null;
    }

    // Dynamically calculate user stage matching the frontend UserContext calculation
    let stage: "mother" | "newborn" | "kid" | undefined = undefined;
    if (user.role === 'expecting') {
      stage = 'mother';
    } else if (user.role === 'parent' && user.children && user.children.length > 0) {
      const today = new Date();
      const birthdays = user.children.map((c: any) => new Date(c.dob).getTime());
      const youngestTime = Math.max(...birthdays);
      const youngest = new Date(youngestTime);
      const diffTime = today.getTime() - youngest.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const monthsOld = Math.floor(diffDays / 30.44);
      stage = monthsOld >= 6 ? 'kid' : 'newborn';
    }

    return { ...user, stage };
  },
});

/**
 * Get a user by email (for legacy or specific lookups).
 */
export const getUserByEmail = query({
  args: { email: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const email = args.email;
    if (!email) return null;
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
  },
});

/**
 * Ensure user has default fields (role: customer, isOnboarded: false).
 * This can be called after sign-in.
 */
export const ensureUserFields = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    console.log(`[convex/users.ts] ensureUserFields - userId: ${userId}`);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) {
      console.warn(`[convex/users.ts] ensureUserFields - user not found in DB for ID: ${userId}`);
      return null;
    }

    if (user.isAdmin === undefined || user.isOnboarded === undefined) {
      console.log(`[convex/users.ts] ensureUserFields - patching default fields for ${user.email}`);
      await ctx.db.patch(userId, {
        isAdmin: (user as any).isAdmin ?? false,
        isOnboarded: (user as any).isOnboarded ?? false,
      });
      console.log(`[convex/users.ts] ensureUserFields - patch complete for ${user.email}`);
    } else {
      console.log(`[convex/users.ts] ensureUserFields - fields already present for ${user.email}`);
    }
    
    return userId;
  },
});


/**
 * Check whether an email already has a confirmed (onboarded) account.
 * Called by OnboardingModal on email submit to decide whether to skip role/date steps.
 */
export const checkOnboardingStatus = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    return {
      exists: !!user,
      isOnboarded: user?.isOnboarded ?? false,
    };
  },
});

/**
 * Complete the onboarding process for the current user.
 * Accepts the core identity fields plus the lazy-onboarding profile fields
 * (role, dueDate, children) collected pre-auth and reconciled post-auth.
 */
export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    interests: v.array(v.string()),
    role: v.optional(v.union(v.literal("expecting"), v.literal("parent"))),
    dueDate: v.optional(v.string()),
    children: v.optional(
      v.array(
        v.object({
          dob: v.string(),
          gender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unspecified"))),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(userId, {
      name: args.name,
      username: args.username,
      interests: args.interests,
      role: args.role,
      dueDate: args.dueDate,
      children: args.children,
      isOnboarded: true,
    });
    console.log(`[convex/users.ts] completeOnboarding - onboarding status saved for user ID: ${userId}`);

    return userId;
  },
});

/**
 * Save onboarding journey details (role, dueDate, children) and mark as onboarded.
 */
export const saveOnboardingJourney = mutation({
  args: {
    role: v.union(v.literal("expecting"), v.literal("parent")),
    dueDate: v.optional(v.string()),
    children: v.optional(
      v.array(
        v.object({
          dob: v.string(),
          gender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unspecified"))),
        })
      )
    ),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const patch: any = {
      role: args.role,
      dueDate: args.dueDate,
      children: args.children,
      isOnboarded: true,
    };
    if (args.username !== undefined) {
      patch.username = args.username;
    }
    if (args.name !== undefined) {
      patch.name = args.name;
    }

    await ctx.db.patch(userId, patch);
    console.log(`[convex/users.ts] saveOnboardingJourney - journey saved for user ID: ${userId}`);

    // Update user's registries with the new owner name if provided
    if (args.name) {
      const registries = await ctx.db
        .query("registries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const registry of registries) {
        await ctx.db.patch(registry._id, { ownerName: args.name });
        console.log(`[convex/users.ts] saveOnboardingJourney - registry ${registry._id} ownerName updated to ${args.name}`);
      }
    }

    return userId;
  },
});

/**
 * Update the user profile details.
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(v.union(v.literal("expecting"), v.literal("parent"))),
    dueDate: v.optional(v.union(v.string(), v.null())),
    children: v.optional(
      v.array(
        v.object({
          dob: v.string(),
          gender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unspecified"))),
        })
      )
    ),
    interests: v.optional(v.array(v.string())),
    momoPhone: v.optional(v.union(v.string(), v.null())),
    deliveryLocations: v.optional(v.array(v.object({
      name: v.string(),
      zone: v.optional(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }))),
    dob: v.optional(v.union(v.string(), v.null())),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("unspecified"))),
    preferredContact: v.optional(v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"), v.literal("push"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.username !== undefined) patch.username = args.username;
    if (args.role !== undefined) patch.role = args.role;
    if (args.interests !== undefined) patch.interests = args.interests;
    if (args.momoPhone !== undefined) patch.momoPhone = args.momoPhone === null ? undefined : args.momoPhone;
    if (args.deliveryLocations !== undefined) patch.deliveryLocations = args.deliveryLocations;
    if (args.dob !== undefined) patch.dob = args.dob === null ? undefined : args.dob;
    if (args.gender !== undefined) patch.gender = args.gender;
    if (args.preferredContact !== undefined) patch.preferredContact = args.preferredContact;

    // Handle conditional fields based on active stage
    const activeRole = args.role !== undefined ? args.role : (await ctx.db.get(userId))?.role;
    
    if (activeRole === "expecting") {
      patch.dueDate = args.dueDate === null ? undefined : args.dueDate;
      patch.children = undefined;
    } else if (activeRole === "parent") {
      patch.children = args.children;
      patch.dueDate = undefined;
    } else {
      if (args.dueDate !== undefined) patch.dueDate = args.dueDate === null ? undefined : args.dueDate;
      if (args.children !== undefined) patch.children = args.children;
    }

    await ctx.db.patch(userId, patch);
    console.log(`[convex/users.ts] updateProfile - profile updated successfully for user ID: ${userId}`);
    return userId;
  },
});

/**
 * Get user profile internally.
 */
export const getUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

const REGION_TO_CITY_MAP: Record<string, string> = {
  "Kampala Central": "Kampala",
  "Nakawa": "Kampala",
  "Makindye": "Kampala",
  "Rubaga": "Kampala",
  "Kawempe": "Kampala",
  "Entebbe": "Entebbe City",
  "Kira": "Kira Municipality",
  "Mukono": "Mukono Town"
};

/**
 * Recalculate user preferences from historical checkout transactions and update cached profiling.
 */
export const recalculateUserBehavioralPreferences = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log(`[convex/users.ts] Recalculating preferences for user: ${args.userId}`);
    
    // 1. Fetch user orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (orders.length === 0) {
      console.log(`[convex/users.ts] No orders found for user: ${args.userId}. Skipping preference learning.`);
      return { success: false, reason: "no_orders" };
    }

    // 2. Fetch order items for these orders
    const allOrderItems = [];
    for (const order of orders) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      allOrderItems.push(...items);
    }

    if (allOrderItems.length === 0) {
      console.log(`[convex/users.ts] No order items found for user: ${args.userId}.`);
      return { success: false, reason: "no_items" };
    }

    // 3. Fetch products details for these items - dedupe by productId so a
    // repeatedly-reordered product is only fetched once.
    const uniqueProductIds = [...new Set(allOrderItems.map((item) => item.productId))];
    const productEntries = await Promise.all(
      uniqueProductIds.map(async (productId) => [productId, await ctx.db.get(productId)] as const)
    );
    const productById = new Map(productEntries);

    const productsList = [];
    for (const item of allOrderItems) {
      const product = productById.get(item.productId);
      if (product) {
        productsList.push({
          product,
          item
        });
      }
    }

    // 4. Calculate AOV and Price Preference
    let grandTotalSum = 0;
    let couponOrdersCount = 0;
    for (const order of orders) {
      grandTotalSum += order.grandTotal;
      if (order.couponApplied) {
        couponOrdersCount++;
      }
    }
    const aov = grandTotalSum / orders.length;
    const couponRatio = couponOrdersCount / orders.length;

    let pricePreference: "budget" | "mid-range" | "premium" = "mid-range";
    if (aov > 250000) {
      pricePreference = "premium";
    } else if (aov < 75000 || couponRatio >= 0.5) {
      pricePreference = "budget";
    }

    // 5. Calculate Preferred Categories (Top 3)
    const categoryCounts: Record<string, number> = {};
    for (const entry of productsList) {
      const cat = entry.product.category;
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }
    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
    const preferredCategories = sortedCategories.slice(0, 3);

    // 6. Calculate Preferred Brands (Top 3 Brand IDs)
    const brandCounts: Record<string, number> = {};
    for (const entry of productsList) {
      const brand = entry.product.brand; // string
      if (brand) {
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      }
    }
    const sortedBrands = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a]);
    const topBrandNames = sortedBrands.slice(0, 3);

    const preferredBrands: string[] = [];
    const allBrandsInDb = await ctx.db.query("brands").collect();
    for (const bName of topBrandNames) {
      const match = allBrandsInDb.find(b => b.name.toLowerCase() === bName.toLowerCase());
      if (match) {
        preferredBrands.push(match._id);
      }
    }

    // 7. Size Preference (Top 1)
    const sizeCounts: Record<string, number> = {};
    for (const entry of productsList) {
      const size = entry.item.size || entry.product.size;
      if (size) {
        sizeCounts[size] = (sizeCounts[size] || 0) + 1;
      }
    }
    const sortedSizes = Object.keys(sizeCounts).sort((a, b) => sizeCounts[b] - sizeCounts[a]);
    const sizePrefs = sortedSizes[0] || undefined;

    // 8. Color Preference (Top 1)
    const colorCounts: Record<string, number> = {};
    for (const entry of productsList) {
      const color = entry.product.color;
      if (color) {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }
    }
    const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
    const colorPrefs = sortedColors[0] || undefined;

    // 9. Patch user document
    const updates: any = {
      pricePreference,
      preferredCategories,
      preferredBrands,
    };
    if (sizePrefs) updates.sizePrefs = sizePrefs;
    if (colorPrefs) updates.colorPrefs = colorPrefs;

    // Extract default shipping region from the most recent order to sync Location fields
    const latestOrder = orders.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (latestOrder && latestOrder.deliveryAddress && latestOrder.deliveryAddress.zone) {
      const zone = latestOrder.deliveryAddress.zone;
      updates.region = zone;
      updates.city = REGION_TO_CITY_MAP[zone] || "Kampala";
    }

    await ctx.db.patch(args.userId, updates);
    console.log(`[convex/users.ts] Capped and patched user preferences successfully.`);

    return {
      success: true,
      pricePreference,
      preferredCategories,
      preferredBrandsCount: preferredBrands.length,
      sizePrefs,
      colorPrefs,
    };
  }
});

// ==========================================
// ENGAGEMENT SCORE & CHURN RISK ENGINE
// ==========================================
// Both scores are 0-100. engagementScore: higher = more engaged.
// churnRisk: higher = more likely to lapse. They are related but not
// mirror images of each other - see docs/crm_implementation_and_industry_comparison_report.html
// and docs/ux-audit-leads-customers.html for the rationale behind the weights below.

const DAY_MS = 24 * 60 * 60 * 1000;
/** Fallback expected reorder gap (days) for customers with fewer than 2 orders. */
const DEFAULT_REORDER_CADENCE_DAYS = 45;

function computeEngagementScore(
  orders: { createdAt: number }[],
  completedActivitiesInLast60Days: number
): number {
  const now = Date.now();

  // Recency (0-40): most recent order age, full marks <=14d, tapers to 0 at 120d+.
  let recencyScore = 0;
  if (orders.length > 0) {
    const lastOrderCreatedAt = Math.max(...orders.map((o) => o.createdAt));
    const daysSinceLastOrder = (now - lastOrderCreatedAt) / DAY_MS;
    if (daysSinceLastOrder <= 14) {
      recencyScore = 40;
    } else if (daysSinceLastOrder < 120) {
      recencyScore = 40 * (1 - (daysSinceLastOrder - 14) / (120 - 14));
    }
  }

  // Frequency (0-35): orders in trailing 180 days, capped at 5+.
  const ordersLast180Days = orders.filter((o) => now - o.createdAt <= 180 * DAY_MS).length;
  const frequencyScore = (Math.min(ordersLast180Days, 5) / 5) * 35;

  // CRM touch (0-25): completed staff interactions in trailing 60 days, capped at 3.
  const crmScore = (Math.min(completedActivitiesInLast60Days, 3) / 3) * 25;

  return Math.round(Math.min(100, recencyScore + frequencyScore + crmScore));
}

function computeChurnRisk(orders: { createdAt: number }[], engagementScore: number): number {
  // A customer who has never ordered isn't "churning" - they're a lead that
  // hasn't converted yet, which is a different problem the lead-scoring work
  // (UX audit § Surface a lead-priority signal) covers instead.
  if (orders.length === 0) return 0;

  const now = Date.now();
  const sortedAsc = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  const lastOrderCreatedAt = sortedAsc[sortedAsc.length - 1].createdAt;
  const daysSinceLastOrder = (now - lastOrderCreatedAt) / DAY_MS;

  // Expected reorder cadence: this customer's own historical average gap
  // once they have 2+ orders, else a global default.
  let cadenceDays = DEFAULT_REORDER_CADENCE_DAYS;
  if (sortedAsc.length >= 2) {
    let totalGapDays = 0;
    for (let i = 1; i < sortedAsc.length; i++) {
      totalGapDays += (sortedAsc[i].createdAt - sortedAsc[i - 1].createdAt) / DAY_MS;
    }
    cadenceDays = Math.max(totalGapDays / (sortedAsc.length - 1), 14);
  }

  // Recency-vs-cadence (0-50): 0 within 1x expected cadence, ramps to 50 at 3x.
  const cadenceRatio = daysSinceLastOrder / cadenceDays;
  let recencyRisk = 0;
  if (cadenceRatio > 1) {
    recencyRisk = Math.min(50, (50 * (cadenceRatio - 1)) / 2);
  }

  // Frequency trend (0-30): orders in the last 90 days vs. the 90 days before that.
  const ordersLast90Days = sortedAsc.filter((o) => now - o.createdAt <= 90 * DAY_MS).length;
  const ordersPrior90Days = sortedAsc.filter((o) => {
    const ageDays = (now - o.createdAt) / DAY_MS;
    return ageDays > 90 && ageDays <= 180;
  }).length;
  let trendRisk = 0;
  if (ordersPrior90Days > 0) {
    const dropRatio = Math.max(0, (ordersPrior90Days - ordersLast90Days) / ordersPrior90Days);
    trendRisk = Math.min(1, dropRatio) * 30;
  }

  // Engagement decay (0-20): low engagement compounds the risk score.
  const decayRisk = (100 - engagementScore) * 0.2;

  return Math.round(Math.min(100, recencyRisk + trendRisk + decayRisk));
}

/**
 * Recomputes engagementScore and churnRisk for a single customer from their
 * order history and recent CRM activity, and patches the result onto the
 * user document. Called after order completion and after a CRM activity is
 * logged/completed; also swept nightly (see crons.ts) so scores that should
 * decay purely from the passage of time - no new order, no new note - still
 * update for customers nobody has touched recently.
 */
export const recalculateEngagementAndChurn = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.accountRole) return { success: false, reason: "not_a_customer" };

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const sixtyDaysAgo = Date.now() - 60 * DAY_MS;
    const activities = await ctx.db
      .query("customerActivities")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.userId))
      .collect();
    const completedActivitiesInLast60Days = activities.filter(
      (a) => a.status === "completed" && (a.completedAt ?? a.createdAt) >= sixtyDaysAgo
    ).length;

    const engagementScore = computeEngagementScore(orders, completedActivitiesInLast60Days);
    const churnRisk = computeChurnRisk(orders, engagementScore);

    await ctx.db.patch(args.userId, { engagementScore, churnRisk });

    return { success: true, engagementScore, churnRisk };
  },
});

/**
 * Nightly sweep (see crons.ts) that recomputes engagementScore/churnRisk for
 * every customer, so scores decay for accounts nobody has interacted with
 * today. Mirrors the "recompute stock counters" cron's shape. At current
 * customer volumes a single `.collect()` is fine; if the customer table
 * grows large this should move to paginated batches like other admin list
 * queries already flag as a future scaling concern.
 */
export const recalculateEngagementAndChurnForAllCustomers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", undefined))
      .collect();

    let updatedCount = 0;
    for (const customer of customers) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_user", (q) => q.eq("userId", customer._id))
        .collect();

      const sixtyDaysAgo = Date.now() - 60 * DAY_MS;
      const activities = await ctx.db
        .query("customerActivities")
        .withIndex("by_customerId", (q) => q.eq("customerId", customer._id))
        .collect();
      const completedActivitiesInLast60Days = activities.filter(
        (a) => a.status === "completed" && (a.completedAt ?? a.createdAt) >= sixtyDaysAgo
      ).length;

      const engagementScore = computeEngagementScore(orders, completedActivitiesInLast60Days);
      const churnRisk = computeChurnRisk(orders, engagementScore);

      await ctx.db.patch(customer._id, { engagementScore, churnRisk });
      updatedCount++;
    }

    console.log(`[convex/users.ts] Nightly engagement/churn sweep updated ${updatedCount} customers.`);
    return { success: true, updatedCount };
  },
});

/**
 * Sweeps the authAccounts and authSessions tables for entries pointing to user IDs
 * that no longer exist in the `users` table, and removes them.
 */
export const cleanupOrphanedAuthAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    let deletedAccountsCount = 0;
    let deletedSessionsCount = 0;

    const accounts = await ctx.db.query("authAccounts").collect();
    for (const account of accounts) {
      const user = await ctx.db.get(account.userId);
      if (!user) {
        await ctx.db.delete(account._id);
        deletedAccountsCount++;
      }
    }

    const sessions = await ctx.db.query("authSessions").collect();
    for (const session of sessions) {
      const user = await ctx.db.get(session.userId);
      if (!user) {
        await ctx.db.delete(session._id);
        deletedSessionsCount++;
      }
    }

    console.log(
      `[convex/users.ts] Cleaned up ${deletedAccountsCount} orphaned auth accounts and ${deletedSessionsCount} orphaned auth sessions.`
    );

    return {
      deletedAccountsCount,
      deletedSessionsCount,
    };
  },
});

/**
 * Safely deletes a user document and all associated authAccounts and authSessions documents.
 */
export const deleteUserCascade = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, reason: "User not found" };
    }

    // 1. Delete associated authAccounts
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // 2. Delete associated authSessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // 3. Delete user document
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

