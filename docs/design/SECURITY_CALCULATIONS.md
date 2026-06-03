# E-Commerce Security: Server-Side Calculation & Validation Guidelines

This document establishes the security principles and implementation patterns for financial, inventory, and discount calculations within the Dennan application. 

> [!IMPORTANT]
> **Core Principle: "Never Trust the Client"**
> The client-side browser is strictly for display, routing, and user interaction. All calculations impacting money, inventory, order totals, and legal compliance **must** be performed, validated, and finalized on the server (Convex). 

---

## 1. Threat Model & Prevention Strategies

### A. Price Spoofing
*   **The Threat:** A malicious user opens the browser console or intercept/modifies the HTTP payload to alter a product's price from `UGX 100,000` to `UGX 1,000` before submitting the order.
*   **The Prevention:** The backend must **never** accept a price or total from the frontend. The checkout payload must only contain product IDs and quantities. The backend looks up the price directly from the database and performs the multiplication.

### B. Coupon Code Manipulation & Stacking
*   **The Threat:** A user overrides client-side JavaScript checks to apply multiple coupons that aren't meant to stack, uses an expired coupon, or bypasses the "minimum spend" requirement.
*   **The Prevention:** While the frontend can display a temporary discount for visual confirmation, the server must fetch the coupon definition from the database, verify expiration, active status, and recalculate the cart total to ensure eligibility before saving the order.

### C. Stock & Quantity Tampering
*   **The Threat:** A user bypasses inventory checks to order more items than exist in stock, or inputs a negative quantity (e.g., `-5` items) to reduce their order total.
*   **The Prevention:** The server must validate that quantities are positive integers, verify against current real-time inventory, and decrement the stock atomically inside a transaction.

---

## 2. Security Audit of Dennan's Current Cart Logic

We audited the active codebase to verify compliance with these rules. Below is our current status:

### Frontend: [CartContext.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/context/CartContext.jsx)
*   **Status:** **SECURE (with design caveats)**
*   **Analysis:** `CartContext.jsx` calculates the `subtotal` on lines 167–174 to show real-time, responsive feedback to the user in the sliding cart drawer. This is standard frontend practice. It is safe because this client-side subtotal is **only** used for display. It is never transmitted as a source-of-truth payment amount to the database.

### Backend: [cart.ts](file:///c:/Users/HP/Desktop/dennan/dennan_ux/convex/cart.ts)
*   **Status:** **SECURE (Passes Check)**
*   **Analysis:** The database persistence layer follows the secure pattern perfectly:
    1.  `addToCart` (lines 34–86) accepts only `productId` and `quantity`. It fetches the authoritative product document directly from the database using `ctx.db.get(args.productId)` to retrieve the true price and verify inventory server-side.
    2.  `cartItems` schema stores **only** the `productId`, `userId`, `quantity`, and `size`. The price is never persisted in the cart table, preventing any vector of price-tampering in the cart state itself.
    3.  `getCartItems` (lines 5–32) dynamically hydrates and joins the products on the backend, using the authoritative, up-to-date database prices.

### Checkout Page: [CheckoutPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/CheckoutPage.jsx)
*   **Status:** **MOCK (Action Required on Transition)**
*   **Analysis:** Currently, checkout is a mock state that does not write to the database (it simulates confirmation with a client-side timeout). The moment we migrate checkout from mock endpoints (`db.json`) to our production Convex backend, we **must** adhere to the server-side validation implementation blueprint detailed below.

---

## 3. Implementation Blueprint for Secure Checkout & Coupons

When implementing the real checkout system in Convex, use the following database schemas and server mutations to ensure absolute financial security.

### A. Database Schemas (`convex/schema.ts`)
Add the following table schemas to represent Coupons and Orders securely:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables ...

  // Authoritative collection of coupon codes
  coupons: defineTable({
    code: v.string(), // e.g. "MOMMYUG"
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(), // Percentage (e.g. 15) or fixed UGX value (e.g. 10000)
    minSpend: v.optional(v.number()), // Minimum cart value (UGX) to qualify
    expiresAt: v.number(), // Unix timestamp (ms)
    isActive: v.boolean(),
    usageCount: v.number(),
    maxUsage: v.optional(v.number()),
  }).index("by_code", ["code"]),

  // Securely persisted orders
  orders: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("preparing"),
      v.literal("dispatched"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    paymentMethod: v.string(), // "momo" | "card"
    momoPhone: v.optional(v.string()), // Ugandan number
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
    }),
    
    // Auth-calculated financial summary (Source of Truth)
    subtotal: v.number(),      // Sum of item price * quantity
    discountAmount: v.number(), // Subtracted coupon savings
    deliveryFee: v.number(),
    grandTotal: v.number(),    // subtotal - discountAmount + deliveryFee
    
    couponApplied: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Order items snapshot (locks the price at time of purchase)
  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    size: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(), // Checked and locked at checkout time
  }).index("by_order", ["orderId"]),
});
```

---

## 4. Secure Convex Server Logic

Here are the secure backend implementations to validate coupons and process orders safely.

### A. Coupon Validation Utility (Convex Helper)
This function can be imported and shared across your checkout and order queries.

```typescript
// convex/coupons.ts
import { v } from "convex/values";
import { query, MutationCtx, QueryCtx } from "./_generated/server";

export async function validateCouponInternal(
  ctx: QueryCtx | MutationCtx,
  code: string,
  currentSubtotal: number
) {
  const coupon = await ctx.db
    .query("coupons")
    .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
    .first();

  if (!coupon || !coupon.isActive) {
    return { valid: false, error: "Invalid coupon code." };
  }

  if (Date.now() > coupon.expiresAt) {
    return { valid: false, error: "This coupon has expired." };
  }

  if (coupon.maxUsage !== undefined && coupon.usageCount >= coupon.maxUsage) {
    return { valid: false, error: "This coupon code is fully used." };
  }

  if (coupon.minSpend !== undefined && currentSubtotal < coupon.minSpend) {
    return { 
      valid: false, 
      error: `Minimum spend of UGX ${coupon.minSpend.toLocaleString()} required.` 
    };
  }

  // Calculate discount based on server-provided rules
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = Math.round((currentSubtotal * coupon.discountValue) / 100);
  } else {
    discount = coupon.discountValue;
  }

  return {
    valid: true,
    coupon,
    discountAmount: Math.min(discount, currentSubtotal), // Ensure discount doesn't exceed subtotal
  };
}

// Public query to let the frontend safely check if a coupon is valid for UI display
export const checkCoupon = query({
  args: {
    code: v.string(),
    cartSubtotal: v.number(), // Sent for UI preview only, will be re-computed on checkout
  },
  handler: async (ctx, args) => {
    return await validateCouponInternal(ctx, args.code, args.cartSubtotal);
  },
});
```

### B. Secure Order Placement Mutation
This is the critical mutation that recalculates everything from the ground up, guaranteeing price security.

```typescript
// convex/orders.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { validateCouponInternal } from "./coupons";

export const placeOrder = mutation({
  args: {
    paymentMethod: v.string(),
    momoPhone: v.optional(v.string()),
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
    }),
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // 1. Fetch active cart items directly from the database (DO NOT trust cart details from frontend!)
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cannot place an order with an empty cart");
    }

    // 2. Compute subtotal directly using DB prices and perform stock validation
    let computedSubtotal = 0;
    const itemsToOrder = [];

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} is no longer available.`);
      }

      // Verify and decrement inventory
      if (product.inventory !== undefined) {
        if (product.inventory < item.quantity) {
          throw new Error(`Inadequate inventory for ${product.name}. Only ${product.inventory} left.`);
        }
        // Deduct inventory atomically
        await ctx.db.patch(product._id, {
          inventory: product.inventory - item.quantity,
        });
      }

      computedSubtotal += product.price * item.quantity;
      itemsToOrder.push({
        productId: item.productId,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price, // Lock the current database price
      });
    }

    // 3. Process Server-Side Coupon / Discount
    let discountAmount = 0;
    let appliedCoupon = undefined;

    if (args.couponCode) {
      const couponResult = await validateCouponInternal(ctx, args.couponCode, computedSubtotal);
      if (couponResult.valid && couponResult.coupon) {
        discountAmount = couponResult.discountAmount;
        appliedCoupon = couponResult.coupon.code;

        // Increment usage count of coupon code
        await ctx.db.patch(couponResult.coupon._id, {
          usageCount: couponResult.coupon.usageCount + 1,
        });
      } else {
        // If a coupon code was sent but was invalid, reject the transaction
        throw new Error(`Failed to apply coupon: ${couponResult.error}`);
      }
    }

    // 4. Calculate Delivery Feeauthoritatively
    let deliveryFee = 0; // Or fetch based on zone e.g. Kampala Central = 0, others = 5000
    if (args.deliveryAddress.zone !== "Kololo") {
       deliveryFee = 5000; // Securely calculated fee
    }

    const grandTotal = computedSubtotal - discountAmount + deliveryFee;

    // 5. Create the Order securely
    const orderId = await ctx.db.insert("orders", {
      userId,
      status: "pending_payment",
      paymentMethod: args.paymentMethod,
      momoPhone: args.momoPhone,
      deliveryAddress: args.deliveryAddress,
      subtotal: computedSubtotal,
      discountAmount,
      deliveryFee,
      grandTotal,
      couponApplied: appliedCoupon,
      createdAt: Date.now(),
    });

    // 6. Save line items snapshots (locks price and details at checkout)
    for (const item of itemsToOrder) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // 7. Clear the user's cart on completion
    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }

    return {
      success: true,
      orderId,
      grandTotal,
    };
  },
});
```

---

## Summary Checklist for Developers

- [x] **Adding Items:** Checked. Price is never sent. Only product ID and quantity are passed to Convex.
- [ ] **Modifying Prices:** Disabled. Client-side state changes in console can change what is displayed, but they do not affect DB lookups during operations.
- [ ] **Checkout Validation:** Pending. When replacing mock billing code, ensure order totals, taxes, shipping, and coupons are calculated **from scratch** inside the `placeOrder` mutation using direct database state. Do not send client-side subtotals to any API.
