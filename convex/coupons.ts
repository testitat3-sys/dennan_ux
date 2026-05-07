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
