"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const send = action({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    html: v.optional(v.string()),
    from: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: args.from ?? "Dennan <login@mail.dennan.ug>",
      to: [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  },
});
