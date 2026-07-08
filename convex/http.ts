import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/import-products",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const authHeader = req.headers.get("Authorization");
      const expectedToken = `Bearer ${process.env.STAFF_AUTH_SALT || "dennan-secure-salt-2026"}`;
      if (authHeader !== expectedToken) {
        console.warn("[convex/http.ts] Unauthorized import attempt");
        return new Response("Unauthorized", { status: 401 });
      }

      const { products } = await req.json();
      console.log(`[convex/http.ts] POST /api/import-products received batch of size ${products?.length || 0}`);
      
      if (!Array.isArray(products)) {
        return new Response("Bad Request: products must be an array", { status: 400 });
      }

      const result = await ctx.runMutation(internal.importProducts.upsertProductsBatch, { products });
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[convex/http.ts] Import error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});


http.route({
  path: "/api/pesapal/ipn",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const url = new URL(req.url);
      const searchParams = url.searchParams;
      
      // Pesapal might send data in query params or body depending on version/config.
      // Let's try to parse body first.
      let orderTrackingId = searchParams.get("OrderTrackingId");
      let orderMerchantReference = searchParams.get("OrderMerchantReference");
      
      try {
        const body = await req.json();
        if (body.OrderTrackingId) orderTrackingId = body.OrderTrackingId;
        if (body.OrderMerchantReference) orderMerchantReference = body.OrderMerchantReference;
      } catch (e) {
        // ignore JSON parse error, might be form data or just query params
      }

      console.log(`[convex/http.ts] Pesapal IPN received for tracking ID: ${orderTrackingId}`);

      if (!orderTrackingId || !orderMerchantReference) {
        return new Response("Missing parameters", { status: 400 });
      }

      // Verify the transaction status using our internal action
      const statusData = await ctx.runAction(internal.pesapal.getTransactionStatus, {
        orderTrackingId: orderTrackingId as string
      });

      console.log(`[convex/http.ts] Pesapal transaction status for ${orderTrackingId}:`, statusData.payment_status_description);

      const statusDesc = statusData.payment_status_description?.toUpperCase() || "";
      let newStatus: "preparing" | "failed" | null = null;

      if (statusDesc === "COMPLETED") {
        newStatus = "preparing"; // Paid
      } else if (statusDesc === "FAILED" || statusDesc === "INVALID") {
        newStatus = "failed";
      }

      if (newStatus) {
        // orderMerchantReference is actually the Convex orderId as we passed it in SubmitOrderRequest
        await ctx.runMutation(internal.orders.updateOrderStatus, {
          orderId: orderMerchantReference as any,
          status: newStatus,
        });
      }

      return new Response(JSON.stringify({ status: "success" }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    } catch (error) {
      console.error("[convex/http.ts] Pesapal IPN Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

http.route({
  path: "/api/pesapal/ipn",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get("OrderTrackingId");
    const orderMerchantReference = url.searchParams.get("OrderMerchantReference");
    const frontendUrl = url.searchParams.get("frontendUrl") || "";

    if (!orderTrackingId || !orderMerchantReference) {
      return new Response("Missing parameters", { status: 400 });
    }

    try {
      const statusData = await ctx.runAction(internal.pesapal.getTransactionStatus, {
        orderTrackingId,
      });

      const statusDesc = statusData.payment_status_description?.toUpperCase() || "";
      let newStatus: "preparing" | "failed" | null = null;
      if (statusDesc === "COMPLETED") {
        newStatus = "preparing";
      } else if (statusDesc === "FAILED" || statusDesc === "INVALID") {
        newStatus = "failed";
      }

      if (newStatus) {
        await ctx.runMutation(internal.orders.updateOrderStatus, {
          orderId: orderMerchantReference as any,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error("[convex/http.ts] Pesapal GET IPN status check failed:", error);
    }

    const callbackParams = new URLSearchParams({
      OrderTrackingId: orderTrackingId,
      OrderMerchantReference: orderMerchantReference,
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}/checkout/callback?${callbackParams.toString()}`,
      },
    });
  }),
});

http.route({
  path: "/api/pesapal/status",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const result = await ctx.runQuery(internal.orders.getOrderStatusById, {
      orderId: orderId as any,
    });

    return new Response(JSON.stringify({ status: result?.status ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }),
});

http.route({
  path: "/api/pesapal/status",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/api/pesapal/contribution-ipn",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const url = new URL(req.url);
      const searchParams = url.searchParams;

      let orderTrackingId = searchParams.get("OrderTrackingId");
      let orderMerchantReference = searchParams.get("OrderMerchantReference");

      try {
        const body = await req.json();
        if (body.OrderTrackingId) orderTrackingId = body.OrderTrackingId;
        if (body.OrderMerchantReference) orderMerchantReference = body.OrderMerchantReference;
      } catch (e) {
        // ignore JSON parse error, might be form data or just query params
      }

      console.log(`[convex/http.ts] Pesapal contribution IPN received for tracking ID: ${orderTrackingId}`);

      if (!orderTrackingId || !orderMerchantReference) {
        return new Response("Missing parameters", { status: 400 });
      }

      const statusData = await ctx.runAction(internal.pesapal.getTransactionStatus, {
        orderTrackingId: orderTrackingId as string,
      });

      const statusDesc = statusData.payment_status_description?.toUpperCase() || "";

      if (statusDesc === "COMPLETED") {
        await ctx.runMutation(internal.registry.completeContributionPayment, {
          paymentId: orderMerchantReference as any,
        });
      } else if (statusDesc === "FAILED" || statusDesc === "INVALID") {
        await ctx.runMutation(internal.registry.failContributionPayment, {
          paymentId: orderMerchantReference as any,
        });
      }

      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[convex/http.ts] Pesapal contribution IPN Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});

http.route({
  path: "/api/pesapal/contribution-ipn",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const orderTrackingId = url.searchParams.get("OrderTrackingId");
    const orderMerchantReference = url.searchParams.get("OrderMerchantReference");
    const frontendUrl = url.searchParams.get("frontendUrl") || "";
    const registryId = url.searchParams.get("registryId") || "";

    if (!orderTrackingId || !orderMerchantReference) {
      return new Response("Missing parameters", { status: 400 });
    }

    try {
      const statusData = await ctx.runAction(internal.pesapal.getTransactionStatus, {
        orderTrackingId,
      });

      const statusDesc = statusData.payment_status_description?.toUpperCase() || "";

      if (statusDesc === "COMPLETED") {
        await ctx.runMutation(internal.registry.completeContributionPayment, {
          paymentId: orderMerchantReference as any,
        });
      } else if (statusDesc === "FAILED" || statusDesc === "INVALID") {
        await ctx.runMutation(internal.registry.failContributionPayment, {
          paymentId: orderMerchantReference as any,
        });
      }
    } catch (error) {
      console.error("[convex/http.ts] Pesapal contribution GET IPN status check failed:", error);
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}/registry/${registryId}`,
      },
    });
  }),
});

http.route({
  path: "/api/pesapal/contribution-status",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId");
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "Missing paymentId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const result = await ctx.runQuery(internal.registry.getPendingContributionPayment, {
      paymentId: paymentId as any,
    });

    return new Response(JSON.stringify({ status: result?.status ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }),
});

http.route({
  path: "/api/pesapal/contribution-status",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/api/webhooks/products",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // 1. Verify Authorization header
      const authHeader = req.headers.get("Authorization");
      const secret = process.env.ERP_WEBHOOK_SECRET;

      if (!secret) {
        console.warn("ERP_WEBHOOK_SECRET environment variable is not set!");
      }

      const expectedToken = `Bearer ${secret || ""}`;
      if (!authHeader || !secret || authHeader !== expectedToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 2. Parse JSON body
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Normalize single object to array and validate each product
      const isArrayInput = Array.isArray(body);
      const productsList = isArrayInput ? body : [body];

      const ALLOWED_CATEGORIES = new Set([
        "Expectant and New Mom Essentials",
        "Newborn Essentials & Kids Apparel/Footwear",
        "Nursery and Furnishing",
        "Feeding/Nursing Essentials",
        "Bathing and Changing",
        "Baby Play and Safety Gear",
        "Travel Must-Haves"
      ]);

      for (const product of productsList) {
        if (!product || typeof product !== "object") {
          return new Response(
            JSON.stringify({ error: "Bad Request. Expected product object(s) in body." }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const { name, price, slug, barcode, category, originalPrice, discountPrice, discountExpiry } = product;

        // Enforce required primary fields (including barcode and originalPrice, with slug, price and discount fields being optional but type-checked if provided)
        if (
          typeof name !== "string" ||
          (price !== undefined && typeof price !== "number") ||
          (slug !== undefined && typeof slug !== "string") ||
          typeof barcode !== "string" ||
          typeof originalPrice !== "number" ||
          (discountPrice !== undefined && typeof discountPrice !== "number") ||
          (discountExpiry !== undefined && typeof discountExpiry !== "number" && typeof discountExpiry !== "string")
        ) {
          return new Response(
            JSON.stringify({
              error: "Bad Request. Each product must contain 'name' (string), 'barcode' (string), and 'originalPrice' (number). 'price' (number), 'slug' (string), and discount fields are optional but must have valid types.",
              offendingProduct: product,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Enforce restricted categories union
        if (category !== undefined && !ALLOWED_CATEGORIES.has(category)) {
          return new Response(
            JSON.stringify({
              error: `Bad Request. Category must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`,
              offendingProduct: product,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // 4. Run transactional mutation to perform idempotent upsert for the batch
      const results = await ctx.runMutation(internal.products.upsertBatchFromWebhook, {
        products: productsList,
      });

      // 5. Structure response dynamically to remain backwards compatible for single inputs
      const responseData = isArrayInput
        ? { success: true, count: results.length, products: results }
        : { success: true, ...results[0] };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[convex/http.ts] ERP Webhook Error:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", details: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
