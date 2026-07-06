import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "onboarding@resend.dev", // Replace with your verified sender
      async sendVerificationRequest(params, ctx: any) {
        const { identifier: email, url } = params;
        console.log(`[convex/auth.ts] Resolving verification email for ${email}`);

        // Search for user to see if they already exist in the database
        const user = await ctx.runQuery(api.users.getUserByEmail, { email });
        const isNewUser = user === null;

        // Resolve the frontend origin (defaults to localhost:5173 in development)
        const frontendOrigin = process.env.SITE_URL || "http://localhost:5173";
        // Gmail proxies all images and cannot reach localhost. For development, we fall back
        // to a public GitHub raw URL so the logo renders perfectly during local testing!
        const logoUrl = process.env.SITE_URL
          ? `${frontendOrigin}/dennan_logo_final_compressed.png`
          : "https://raw.githubusercontent.com/lordinmayiga/Dennan_ux/main/public/dennan_logo_final_compressed.png";

        // Style guidelines & copies based on user boarding status
        const subject = isNewUser
          ? "Complete your Dennan registration"
          : "Welcome back to Dennan — Log in to your account";

        const heading = isNewUser ? "Begin Your Journey" : "Welcome Back";

        const bodyCopy = isNewUser
          ? "Welcome to Dennan. Click the button below to sign in and complete your registration."
          : "Click the button below to log in to your Dennan account and continue curating your journey.";

        const buttonText = isNewUser ? "Complete Registration" : "Log In to Dennan";

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dennan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f8; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #faf9f8; padding: 40px 10px; min-height: 100%;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 48px 40px; box-shadow: 0 4px 20px rgba(17, 17, 17, 0.03); box-sizing: border-box;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="${logoUrl}" alt="Dennan Logo" width="130" height="auto" style="display: inline-block; margin-bottom: 8px; border: none; outline: none; max-width: 100%;">
        <div style="font-family: 'Newsreader', Georgia, Cambria, 'Times New Roman', Times, serif; font-size: 14px; font-style: italic; color: #d35097; letter-spacing: 0.05em;">the tactile curator</div>
      </div>
      
      <h1 style="font-family: 'Newsreader', Georgia, Cambria, 'Times New Roman', Times, serif; font-size: 28px; font-weight: 400; color: #111111; text-align: center; margin: 0 0 16px 0; letter-spacing: -0.02em;">${heading}</h1>
      
      <p style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #555555; text-align: center; margin: 0 0 32px 0;">${bodyCopy}</p>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 6px; box-shadow: 0 4px 12px rgba(17, 17, 17, 0.1); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${buttonText}</a>
      </div>
      
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #888888; text-align: center; margin-bottom: 40px; word-break: break-all; line-height: 1.5;">
        Or copy and paste this link into your browser:<br>
        <a href="${url}" style="color: #d35097; text-decoration: none;">${url}</a>
      </div>
      
      <hr style="border: none; height: 1px; background-color: #ede9e5; margin: 32px 0;">
      
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #888888; text-align: center; line-height: 1.5;">
        This secure link is valid for 24 hours.<br>
        If you did not request this sign-in, you can safely ignore this email.
      </div>
    </div>
  </div>
</body>
</html>`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: [email],
            subject,
            text: `${heading}: ${bodyCopy} — ${url}`,
            html,
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

