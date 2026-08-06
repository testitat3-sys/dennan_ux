import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";
import { slugify } from "./products";
import { trackedQuery, trackedMutation } from "./lib/ioTracking";

/**
 * Lists all known expense names for the admin "create or choose existing"
 * combobox. Unbounded collect is safe here — this table only grows via
 * explicit "+ Add new" actions, same idiom as productBrandNames.
 */
export const listExpenseNames = trackedQuery("businessExpenses.listExpenseNames", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);
    return await ctx.db.query("expenseNames").withIndex("by_name").take(500);
  },
});

export const createExpenseName = trackedMutation("businessExpenses.createExpenseName", {
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);

    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Expense name is required.");
    }

    const existing = await ctx.db
      .query("expenseNames")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .unique();
    if (existing) {
      return { nameId: existing._id, name: existing.name, alreadyExisted: true };
    }

    const baseSlug = slugify(trimmed);
    let slug = baseSlug;
    let counter = 1;
    while (
      await ctx.db
        .query("expenseNames")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const nameId = await ctx.db.insert("expenseNames", { name: trimmed, slug });
    return { nameId, name: trimmed, alreadyExisted: false };
  },
});

/** Most recent business expenses, newest first. */
export const listBusinessExpenses = trackedQuery("businessExpenses.listBusinessExpenses", {
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);
    return await ctx.db.query("businessExpenses").withIndex("by_createdAt").order("desc").take(200);
  },
});

export const createBusinessExpense = trackedMutation("businessExpenses.createBusinessExpense", {
  args: {
    token: v.string(),
    voucherNumber: v.string(),
    name: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);

    const voucherNumber = args.voucherNumber.trim();
    const name = args.name.trim();
    const note = args.note?.trim() || undefined;

    if (!voucherNumber) {
      throw new Error("Voucher number is required.");
    }
    if (!name) {
      throw new Error("Expense name is required.");
    }
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Amount must be a positive number.");
    }

    return await ctx.db.insert("businessExpenses", {
      voucherNumber,
      name,
      amount: args.amount,
      note,
      staffId: user._id,
      staffName: user.name || "Unknown",
      createdAt: Date.now(),
    });
  },
});

export const voidBusinessExpense = trackedMutation("businessExpenses.voidBusinessExpense", {
  args: {
    token: v.string(),
    expenseId: v.id("businessExpenses"),
    voidReason: v.string(),
    voidNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Business expense not found.");
    }
    if (expense.isVoided) {
      throw new Error("Voucher is already voided.");
    }

    const reason = args.voidReason.trim();
    if (!reason) {
      throw new Error("A void reason is required for financial audit compliance.");
    }

    await ctx.db.patch(args.expenseId, {
      isVoided: true,
      voidedBy: user._id,
      voidedByName: user.name || "Unknown Staff",
      voidedAt: Date.now(),
      voidReason: reason,
      voidNote: args.note ? args.note.trim() : args.voidNote ? args.voidNote.trim() : undefined,
    });

    return null;
  },
});

export const deleteBusinessExpense = trackedMutation("businessExpenses.deleteBusinessExpense", {
  args: { token: v.string(), expenseId: v.id("businessExpenses") },
  handler: async (ctx, args) => {
    const { user } = await verifyStaffSession(ctx, args.token, ["admin", "accounting"]);
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      return null;
    }

    // Perform audit-compliant soft void instead of permanent deletion
    await ctx.db.patch(args.expenseId, {
      isVoided: true,
      voidedBy: user._id,
      voidedByName: user.name || "Unknown Staff",
      voidedAt: Date.now(),
      voidReason: "Deleted by staff",
    });

    return null;
  },
});
