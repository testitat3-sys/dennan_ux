import { action, internalAction, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function getPesapalBaseUrl() {
  const env = process.env.PESAPAL_ENV || "sandbox";
  return env === "production"
    ? "https://pay.pesapal.com/v3/api"
    : "https://cybqa.pesapal.com/pesapalv3/api";
}

async function getPesapalToken() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("Pesapal credentials not configured in environment variables");
  }

  const response = await fetch(`${getPesapalBaseUrl()}/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with Pesapal: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (data.error || !data.token) {
    throw new Error(`Pesapal Auth Error: ${data.error?.message || data.error?.code || 'Unknown error'}`);
  }
  
  return data.token;
}

async function registerIPN(token: string) {
  // We use Convex's site URL for HTTP webhook endpoints
  const siteUrl = process.env.VITE_CONVEX_SITE_URL || process.env.SITE_URL;
  if (!siteUrl) {
    throw new Error("VITE_CONVEX_SITE_URL or SITE_URL is not defined");
  }
  
  const ipnUrl = `${siteUrl}/api/pesapal/ipn`;

  const response = await fetch(`${getPesapalBaseUrl()}/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "POST",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Pesapal RegisterIPN Error: ${errorText} (Status: ${response.status})`);
    throw new Error(`Failed to register IPN with Pesapal: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (data.error) {
    console.error(`Pesapal RegisterIPN Error Data:`, data.error);
    throw new Error(`Pesapal RegisterIPN Error: ${data.error.message}`);
  }
  return data.ipn_id;
}

export const initiatePayment = action({
  args: {
    orderId: v.id("orders"),
    callbackUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 1. Get order details via internal query/mutation or db (Wait, actions can't use db directly without runQuery)
    // We should create an internal query to get order details
    const order = await ctx.runQuery(internal.orders.getOrderForPayment, { orderId: args.orderId });
    if (!order) {
      throw new Error("Order not found");
    }

    // 2. Get user details
    const user = await ctx.runQuery(internal.users.getUserProfile, { userId });
    
    // 3. Get token
    const token = await getPesapalToken();

    // 4. Register IPN (in production, we might want to cache this id to avoid registering on every order)
    const ipnId = await registerIPN(token);

    // 5. Submit Order
    const callbackUrl = args.callbackUrl;

    // Pesapal requires amounts in local currency, Uganda shillings typically don't have decimals, but pesapal expects a decimal amount.
    const amount = order.grandTotal;

    const requestBody = {
      id: order._id,
      currency: "UGX",
      amount: amount,
      description: `Payment for order ${order._id}`,
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: user?.email || "customer@example.com",
        phone_number: order.momoPhone || "",
        country_code: "UG",
        first_name: user?.name?.split(" ")[0] || "Customer",
        middle_name: "",
        last_name: user?.name?.split(" ").slice(1).join(" ") || "",
        line_1: order.deliveryAddress?.name || "Kampala",
        line_2: "",
        city: order.deliveryAddress?.zone || "Kampala",
        state: "",
        postal_code: "",
        zip_code: ""
      }
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
      console.error("Pesapal error response:", errorText);
      throw new Error(`Failed to submit order to Pesapal: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
       throw new Error(`Pesapal Error: ${data.error.message}`);
    }

    const trackingId = data.order_tracking_id;
    const merchantReference = data.merchant_reference;
    const redirectUrl = data.redirect_url;

    // 6. Save tracking ID and redirect URL to the order
    await ctx.runMutation(internal.orders.updateOrderWithPesapalDetails, {
      orderId: args.orderId,
      pesapalTrackingId: trackingId,
      pesapalMerchantReference: merchantReference,
      pesapalRedirectUrl: redirectUrl,
    });

    return { redirectUrl };
  },
});

export const getTransactionStatus = internalAction({
  args: {
    orderTrackingId: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await getPesapalToken();

    const response = await fetch(`${getPesapalBaseUrl()}/Transactions/GetTransactionStatus?orderTrackingId=${args.orderTrackingId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get transaction status: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
});
