import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "Dennan <login@mail.dennan.ug>", // Replace with your verified sender
      async sendVerificationRequest(params: any, ctx?: any) {
        const { identifier: email, url } = params;
        console.log(`[convex/auth.ts] Resolving verification email for ${email}`);

        // Search for user to see if they already exist in the database
        const user = await ctx.runQuery(api.users.getUserByEmail, { email });
        const isNewUser = user === null;

        // Style guidelines & copies based on user boarding status
        const subject = isNewUser
          ? "Complete your Dennan registration"
          : "Welcome back to Dennan — Log in to your account";

        const heading = isNewUser ? "Begin Your Journey" : "Welcome Back";

        const bodyCopy = isNewUser
          ? "Welcome to Dennan. Click the button below to sign in and complete your registration."
          : "Click the button below to log in to your Dennan account.";

        const buttonText = isNewUser ? "Complete Registration" : "Log In";

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dennan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f8; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #faf9f8; padding: 48px 16px;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(17, 17, 17, 0.06); box-sizing: border-box;">

      <!-- Header band -->
      <div style="background-color: #111111; padding: 28px 40px; text-align: center;">
        <span style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #ffffff;">Dennan</span>
      </div>

      <!-- Pink accent bar -->
      <div style="height: 4px; background-color: #d35097;"></div>

      <!-- Body -->
      <div style="padding: 48px 40px 40px;">

        <h1 style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 26px; font-weight: 600; color: #111111; text-align: center; margin: 0 0 14px 0; letter-spacing: -0.02em;">${heading}</h1>

        <p style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #555555; text-align: center; margin: 0 0 36px 0;">${bodyCopy}</p>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 18px 36px; border-radius: 6px; box-shadow: 0 4px 12px rgba(17, 17, 17, 0.1); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${buttonText}</a>
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
            from: "Dennan <login@mail.dennan.ug>",
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
  ],
});

