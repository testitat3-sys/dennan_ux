import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/save-test-link",
  method: "POST",
    handler: httpAction(async (ctx, req) => {
      const { email, url } = await req.json();
      console.log(`[convex/http.ts] POST /api/save-test-link for ${email}`);
      await ctx.runMutation(internal.users.saveTestLink, { email, url });
      return new Response(null, { status: 200 });
    }),
});

export default http;
