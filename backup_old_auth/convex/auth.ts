import { mutation } from "../../convex/_generated/server";
import { v } from "convex/values";
import { convexAuth, GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import { internal } from "../../convex/_generated/api";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    {
      id: "test-link",
      name: "Test Link",
      type: "email",
      options: {},
      async sendVerificationRequest(params: any, ...args: any[]) {
        const ctx = args[0] as GenericActionCtxWithAuthConfig<any>;
        const email = params.identifier;
        
        // Safely add the provider to the URL
        let url = params.url;
        if (url) {
          try {
            const urlObj = new URL(url);
            urlObj.searchParams.set("provider", "test-link");
            url = urlObj.toString();
          } catch (e) {
            console.error("[TEST-AUTH] Failed to parse URL:", url);
          }
        }

        console.log("-----------------------------------------");
        console.log(`[TEST-AUTH] NEW MAGIC LINK FOR: ${email}`);
        console.log(`[TEST-AUTH] URL: ${url}`);
        console.log("-----------------------------------------");

        await ctx.runMutation(internal.auth_test.storeLink, {
          email: email || "unknown@example.com",
          url: url || "",
          expires: Date.now() + 3600000,
        });
      },
    },
  ],
});

export const syncUser = mutation({
  args: {
    args: v.optional(v.any()),
  },
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }
    return userId;
  },
});
