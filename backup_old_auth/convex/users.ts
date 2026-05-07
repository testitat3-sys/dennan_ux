import { query, mutation } from "../../convex/_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const viewer = query({
  args: {},
  handler: async (ctx: any) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      console.log("[AUTH-DEBUG] Viewer query: Not logged in");
      return null;
    }
    const user = await ctx.db.get(userId);
    console.log("[AUTH-DEBUG] Verification successful! Logged in as:", user?.email || userId);
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    // For specific onboarding data
    dueDate: v.optional(v.string()),
    children: v.optional(v.array(v.object({ id: v.number(), dob: v.string() }))),
  },
  handler: async (ctx: any, args: any) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    await ctx.db.patch(userId, args);
  },
});
