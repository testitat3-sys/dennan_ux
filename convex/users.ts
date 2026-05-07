import { internalMutation, mutation, query } from "./_generated/server";
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
    if (!args.email) return null;
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
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
    children: v.optional(v.array(v.object({ dob: v.string() }))),
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
