import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "onboarding@resend.dev", // Replace with your verified sender
      async sendVerificationRequest({ identifier: email, url }) {
        console.log(`[convex/auth.ts] Sending Resend magic link to ${email}: ${url}`);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: [email],
            subject: "Sign in to Numama",
            text: `Sign in with this link: ${url}`,
            html: `<p>Sign in with this link: <a href="${url}">${url}</a></p>`,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          console.error(`[convex/auth.ts] Failed to send email via Resend: ${error}`);
          throw new Error("Failed to send verification email");
        }
        console.log(`[convex/auth.ts] Email sent successfully to ${email}`);
      },
    }),
    {
      id: "test",
      type: "email",
      name: "Test Link",
      from: "testing@example.com",
      maxAge: 60 * 60,
      async sendVerificationRequest({ identifier: email, url }) {
        console.log(`[convex/auth.ts] Generating Test link for ${email}: ${url}`);
        // Call our internal HTTP bridge to save the link
        const siteUrl = process.env.CONVEX_SITE_URL;
        if (siteUrl) {
          try {
            await fetch(`${siteUrl}/api/save-test-link`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, url }),
            });
            console.log(`[convex/auth.ts] Successfully notified HTTP bridge for ${email}`);
          } catch (e) {
            console.error(`[convex/auth.ts] ERROR notifying HTTP bridge:`, e);
          }
        } else {
          console.warn("[convex/auth.ts] CONVEX_SITE_URL not set, cannot notify HTTP bridge");
        }
      },
    },
  ],
});
