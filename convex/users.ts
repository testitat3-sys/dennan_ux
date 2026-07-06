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
    return user;
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
 * Save a test link (internal).
 */
export const saveTestLink = internalMutation({
  args: { email: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    console.log(`[convex/users.ts] saveTestLink - Saving link for ${args.email}`);
    // Delete any existing links for this email to keep it clean
    const existing = await ctx.db
      .query("testLinks")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    
    if (existing.length > 0) {
      console.log(`[convex/users.ts] saveTestLink - Cleaning up ${existing.length} old links`);
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
    }

    await ctx.db.insert("testLinks", {
      email: args.email,
      url: args.url,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
    console.log(`[convex/users.ts] saveTestLink - Link saved successfully`);
  },
});

/**
 * Get the latest test link for an email.
 */
export const getTestLink = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("testLinks")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .first();

    if (!link || link.expiresAt < Date.now()) {
      return null;
    }

    return link.url;
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

    await ctx.db.patch(userId, patch);
    console.log(`[convex/users.ts] saveOnboardingJourney - journey saved for user ID: ${userId}`);
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
      zone: v.string(),
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

    // 3. Fetch products details for these items
    const productsList = [];
    for (const item of allOrderItems) {
      const product = await ctx.db.get(item.productId);
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
