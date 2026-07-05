import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getPesapalBaseUrl, getPesapalToken, registerIPN } from "./pesapal";

/**
 * Initiates a real Pesapal payment for a registry contribution. Unlike the
 * checkout flow, this does NOT require authentication — contributors are
 * frequently guests who reach the registry via a public share link.
 */
export const initiateContributionPayment = action({
  args: {
    registryId: v.id("registries"),
    productId: v.string(), // real product id or "virtual-packaging"
    contributorName: v.string(),
    contributorEmail: v.string(),
    contributorPhone: v.string(),
    amount: v.number(),
    frontendUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.runMutation(internal.registry.createPendingContributionPayment, {
      registryId: args.registryId,
      productId: args.productId,
      contributorName: args.contributorName,
      contributorEmail: args.contributorEmail,
      contributorPhone: args.contributorPhone,
      amount: args.amount,
    });

    const token = await getPesapalToken();
    const ipnId = await registerIPN(token, "/api/pesapal/contribution-ipn");

    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new Error("CONVEX_SITE_URL is not defined");
    }
    const callbackUrl = `${siteUrl}/api/pesapal/contribution-ipn?frontendUrl=${encodeURIComponent(args.frontendUrl)}&registryId=${args.registryId}`;

    const nameParts = (args.contributorName || "Guest").trim().split(" ");

    const requestBody = {
      id: paymentId,
      currency: "UGX",
      amount: args.amount,
      description: "Registry contribution",
      callback_url: callbackUrl,
      notification_id: ipnId,
      redirect_mode: "TOP_WINDOW",
      billing_address: {
        email_address: args.contributorEmail,
        phone_number: args.contributorPhone,
        country_code: "UG",
        first_name: nameParts[0] || "Guest",
        middle_name: "",
        last_name: nameParts.slice(1).join(" "),
        line_1: "Kampala",
        line_2: "",
        city: "Kampala",
        state: "",
        postal_code: "",
        zip_code: "",
      },
    };

    const response = await fetch(`${getPesapalBaseUrl()}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pesapal contribution error response:", errorText);
      throw new Error(`Failed to submit contribution to Pesapal: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Pesapal Error: ${data.error.message}`);
    }

    const trackingId = data.order_tracking_id;
    const merchantReference = data.merchant_reference;
    const redirectUrl = data.redirect_url;

    await ctx.runMutation(internal.registry.updatePendingContributionPayment, {
      paymentId,
      pesapalTrackingId: trackingId,
      pesapalMerchantReference: merchantReference,
      pesapalRedirectUrl: redirectUrl,
    });

    return { redirectUrl, paymentId };
  },
});
