import { v } from "convex/values";
import { query, MutationCtx } from "./_generated/server";
import { verifyStaffSession } from "./staffAuth";

export async function generateUniqueVoucherCode(ctx: MutationCtx): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = "GV-";
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += "-";
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const existing = await ctx.db
      .query("giftVouchers")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!existing) {
      return code;
    }
  }
  throw new Error("Failed to generate a unique voucher code after 8 attempts");
}

export const lookupVoucher = query({
  args: {
    token: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);
    const voucher = await ctx.db
      .query("giftVouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .first();
    if (!voucher) {
      return { found: false, redeemable: false };
    }
    const now = Date.now();
    const isExpired = now > voucher.expiresAt;
    let liveStatus = voucher.status;
    if (voucher.status === "active" && isExpired) {
      liveStatus = "expired";
    }
    const redeemable = liveStatus === "active" && voucher.remainingBalance > 0;
    return {
      found: true,
      remainingBalance: voucher.remainingBalance,
      originalAmount: voucher.originalAmount,
      expiresAt: voucher.expiresAt,
      status: liveStatus,
      redeemable,
    };
  },
});
