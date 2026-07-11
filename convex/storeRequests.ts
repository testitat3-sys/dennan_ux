import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * Save a "request this item from our physical store" submission, shown to
 * shoppers whenever a search/filter combo returns zero results on the PLP.
 *
 * Every submitter becomes a real `users` row (find-or-create by phone, then
 * email, same as `placeGuestOrder` in orders.ts) so store-request leads can
 * be followed up on and re-targeted like any other customer.
 */
export const submitStoreRequest = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    stage: v.optional(
      v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid"))
    ),
    itemDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.firstName.trim() || !args.lastName.trim()) {
      throw new Error("First and last name are required.");
    }
    if (!args.email.trim()) {
      throw new Error("Email is required.");
    }
    if (!args.phone.trim()) {
      throw new Error("Phone number is required.");
    }

    // 1. Resolve the submitter to a user document: authenticated session,
    // else an existing user by phone, else by email, else create one.
    const authedUserId = await auth.getUserId(ctx);
    let user = authedUserId ? await ctx.db.get(authedUserId) : null;

    if (!user && args.phone) {
      const allUsers = await ctx.db.query("users").collect();
      user = allUsers.find((u) => u.phone === args.phone) || null;
    }

    if (!user && args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .first();
    }

    let userId = user?._id ?? null;
    if (!userId) {
      userId = await ctx.db.insert("users", {
        name: `${args.firstName} ${args.lastName}`.trim(),
        phone: args.phone,
        email: args.email,
        isWalkIn: true,
        isOnboarded: true,
      });
      user = await ctx.db.get(userId);
    }

    // 2. Insert the store request itself.
    const requestId = await ctx.db.insert("storeRequests", {
      userId: userId ?? undefined,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email.trim(),
      phone: args.phone.trim(),
      stage: args.stage,
      itemDescription: args.itemDescription?.trim() || undefined,
      createdAt: Date.now(),
    });

    // 3. Tag the user's `details` dictionary. Merge rather than overwrite —
    // `details` may already hold unrelated keys written by other features.
    if (userId) {
      await ctx.db.patch(userId, {
        details: {
          ...(user?.details ?? {}),
          storeRequestSubmitted: "true",
          lastStoreRequestId: requestId,
        },
      });
    }

    return { success: true };
  },
});
