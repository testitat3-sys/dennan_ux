import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const WHATSAPP_NUMBER = "256784733314";

function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString("en-US")}`;
}

function buildWhatsAppLink(receiptNumber: string | undefined): string {
  const message = receiptNumber
    ? `Hi Dennan, I have a question about my order #${receiptNumber}.`
    : "Hi Dennan, I have a question about my order.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const WHATSAPP_ICON_SVG =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">' +
  '<path d="M12.04 2.5C6.86 2.5 2.66 6.7 2.66 11.88c0 1.66.44 3.29 1.27 4.72L2.5 21.5l4.99-1.31a9.36 9.36 0 0 0 4.55 1.16h.01c5.18 0 9.38-4.2 9.38-9.38 0-2.51-.98-4.86-2.75-6.63a9.32 9.32 0 0 0-6.64-2.75Zm0 17.17h-.01a7.78 7.78 0 0 1-3.97-1.09l-.28-.17-2.96.78.79-2.89-.19-.3a7.8 7.8 0 0 1-1.2-4.12c0-4.31 3.51-7.82 7.83-7.82 2.09 0 4.05.81 5.53 2.3a7.76 7.76 0 0 1 2.29 5.53c0 4.31-3.51 7.78-7.83 7.78Zm4.29-5.85c-.24-.12-1.4-.69-1.61-.77-.22-.08-.38-.12-.53.12-.16.24-.61.77-.75.93-.14.16-.28.18-.51.06-.24-.12-1-.37-1.9-1.17-.7-.63-1.18-1.4-1.31-1.64-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.4-.14-.01-.3-.01-.46-.01a.9.9 0 0 0-.65.3c-.22.24-.85.83-.85 2.02 0 1.19.87 2.34 1 2.5.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28Z" fill="#25D366"/>' +
  "</svg>";

type ReceiptOrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

function buildReceiptEmail(args: {
  customerName: string;
  receiptNumber: string | undefined;
  createdAt: number;
  items: ReceiptOrderItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
}) {
  const orderDate = new Date(args.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const whatsappLink = buildWhatsAppLink(args.receiptNumber);

  const itemRows = args.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; font-size: 14px; color: #333333; border-bottom: 1px solid #ede9e5;">${item.productName}</td>
          <td style="padding: 10px 0; font-size: 14px; color: #333333; text-align: center; border-bottom: 1px solid #ede9e5;">${item.quantity}</td>
          <td style="padding: 10px 0; font-size: 14px; color: #333333; text-align: right; border-bottom: 1px solid #ede9e5;">${formatUgx(item.unitPrice * item.quantity)}</td>
        </tr>`
    )
    .join("");

  const summaryRows = [
    { label: "Subtotal", value: args.subtotal },
    ...(args.discountAmount > 0 ? [{ label: "Discount", value: -args.discountAmount }] : []),
    ...(args.deliveryFee > 0 ? [{ label: "Delivery fee", value: args.deliveryFee }] : []),
  ]
    .map(
      (row) => `
        <tr>
          <td colspan="2" style="padding: 4px 0; font-size: 13px; color: #888888; text-align: right;">${row.label}</td>
          <td style="padding: 4px 0; font-size: 13px; color: #888888; text-align: right;">${formatUgx(row.value)}</td>
        </tr>`
    )
    .join("");

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

        <h1 style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 26px; font-weight: 600; color: #111111; text-align: center; margin: 0 0 8px 0; letter-spacing: -0.02em;">Order Receipt</h1>

        <p style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #888888; text-align: center; margin: 0 0 32px 0;">
          ${args.receiptNumber ? `${args.receiptNumber} &middot; ` : ""}${orderDate}
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <thead>
            <tr>
              <th style="padding: 0 0 8px 0; font-size: 12px; color: #888888; text-align: left; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #ede9e5;">Item</th>
              <th style="padding: 0 0 8px 0; font-size: 12px; color: #888888; text-align: center; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #ede9e5;">Qty</th>
              <th style="padding: 0 0 8px 0; font-size: 12px; color: #888888; text-align: right; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #ede9e5;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${summaryRows}
          <tr>
            <td colspan="2" style="padding: 10px 0 0 0; font-size: 15px; font-weight: 700; color: #111111; text-align: right; border-top: 1px solid #ede9e5;">Total</td>
            <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: 700; color: #111111; text-align: right; border-top: 1px solid #ede9e5;">${formatUgx(args.grandTotal)}</td>
          </tr>
        </table>

        <p style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #555555; text-align: center; margin: 32px 0 0 0;">Thanks for shopping with us${args.customerName ? `, ${args.customerName}` : ""}!</p>

        <hr style="border: none; height: 1px; background-color: #ede9e5; margin: 32px 0;">

        <div style="text-align: center;">
          <a href="${whatsappLink}" style="display: inline-block; text-decoration: none; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #555555;">
            ${WHATSAPP_ICON_SVG}
            <span style="vertical-align: middle; margin-left: 6px;">Contact us on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Dennan - Order Receipt${args.receiptNumber ? ` (${args.receiptNumber})` : ""}`,
    orderDate,
    "",
    ...args.items.map((item) => `${item.productName} x${item.quantity} - ${formatUgx(item.unitPrice * item.quantity)}`),
    "",
    `Subtotal: ${formatUgx(args.subtotal)}`,
    ...(args.discountAmount > 0 ? [`Discount: -${formatUgx(args.discountAmount)}`] : []),
    ...(args.deliveryFee > 0 ? [`Delivery fee: ${formatUgx(args.deliveryFee)}`] : []),
    `Total: ${formatUgx(args.grandTotal)}`,
    "",
    `Thanks for shopping with us${args.customerName ? `, ${args.customerName}` : ""}!`,
    "",
    `Contact us on WhatsApp: ${whatsappLink}`,
  ].join("\n");

  return { html, text };
}

export const getOrderForReceipt = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const customer = await ctx.db.get(order.userId);
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      order: {
        receiptNumber: order.receiptNumber,
        createdAt: order.createdAt,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        receiptSentAt: order.receiptSentAt,
      },
      customerName: customer?.name,
      customerEmail: customer?.email,
      items: items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };
  },
});

export const markReceiptSent = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { receiptSentAt: Date.now() });
  },
});

export const sendOrderReceipt = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.receipts.getOrderForReceipt, { orderId: args.orderId });
    if (!data) {
      console.error(`[convex/receipts.ts] Order ${args.orderId} not found, skipping receipt`);
      return;
    }
    if (data.order.receiptSentAt) {
      return;
    }
    if (!data.customerEmail) {
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[convex/receipts.ts] RESEND_API_KEY is not set in environment variables");
      return;
    }

    const { html, text } = buildReceiptEmail({
      customerName: data.customerName ?? "",
      receiptNumber: data.order.receiptNumber,
      createdAt: data.order.createdAt,
      items: data.items,
      subtotal: data.order.subtotal,
      discountAmount: data.order.discountAmount,
      deliveryFee: data.order.deliveryFee,
      grandTotal: data.order.grandTotal,
    });

    const subject = data.order.receiptNumber
      ? `Your Dennan receipt - ${data.order.receiptNumber}`
      : "Your Dennan receipt";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dennan <login@mail.dennan.ug>",
        to: [data.customerEmail],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[convex/receipts.ts] Failed to send receipt email via Resend: ${error}`);
      return;
    }

    await ctx.runMutation(internal.receipts.markReceiptSent, { orderId: args.orderId });
  },
});
