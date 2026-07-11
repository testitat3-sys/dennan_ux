import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Category mapping helper to convert legacy category strings to their strict union equivalents
const CATEGORY_MAP: Record<string, string> = {
  // Comfort, Nursing, Recovery -> Expectant and New Mom Essentials
  "comfort": "Expectant and New Mom Essentials",
  "nursing": "Expectant and New Mom Essentials",
  "recovery": "Expectant and New Mom Essentials",
  
  // Apparel, Clothing -> Newborn Essentials & Kids Apparel/Footwear
  "apparel": "Newborn Essentials & Kids Apparel/Footwear",
  "clothing": "Newborn Essentials & Kids Apparel/Footwear",
  
  // Sleep -> Nursery and Furnishing
  "sleep": "Nursery and Furnishing",
  
  // Bath & Care -> Bathing and Changing
  "bath & care": "Bathing and Changing",
  
  // Essentials, Weaning, Test -> Feeding/Nursing Essentials
  "essentials": "Feeding/Nursing Essentials",
  "weaning": "Feeding/Nursing Essentials",
  "test": "Feeding/Nursing Essentials",
  
  // Play & Learn, Safety -> Baby Play and Safety Gear
  "play & learn": "Baby Play and Safety Gear",
  "safety": "Baby Play and Safety Gear",
  
  // On the Move -> Travel Must-Haves
  "on the move": "Travel Must-Haves"
};

const ALLOWED_CATEGORIES = new Set([
  "Expectant and New Mom Essentials",
  "Newborn Essentials & Kids Apparel/Footwear",
  "Nursery and Furnishing",
  "Feeding/Nursing Essentials",
  "Bathing and Changing",
  "Baby Play and Safety Gear",
  "Travel Must-Haves"
]);

/**
 * Migration Mutation: Backfills all existing products in the catalog.
 * Generates unique barcodes, maps legacy categories to strict union categories, and sets actual_data: false.
 */
export const backfillLegacyProducts = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch all products
    const products = await ctx.db.query("products").collect();
    console.log(`[migrations.ts] Found ${products.length} products to migrate.`);

    let updatedCount = 0;

    for (const product of products) {
      const updates: any = {};

      // 2. Generate a unique, readable barcode based on slug if missing
      if (!product.barcode) {
        updates.barcode = `BAR-${product.slug.toUpperCase().substring(0, 20)}`;
      }

      // 3. Mark existing products as legacy/fake data (actual_data = false)
      if (product.actual_data === undefined) {
        updates.actual_data = false;
      }

      // 4. Map category to strict union values if it doesn't match already
      const currentCategory = product.category || "";
      if (!ALLOWED_CATEGORIES.has(currentCategory)) {
        const mapped = CATEGORY_MAP[currentCategory.toLowerCase()];
        if (mapped) {
          updates.category = mapped;
        } else {
          // Default fallback category if unknown
          updates.category = "Feeding/Nursing Essentials";
          console.warn(`[migrations.ts] Product ${product.slug} has unmapped category: "${currentCategory}". Falling back.`);
        }
      }

      // 5. Seed default logistics and automation values
      if (product.costPrice === undefined) {
        updates.costPrice = product.price * 0.60;
      }
      if (product.productType === undefined) {
        updates.productType = "physical";
      }
      if (product.refillReminderLeadDays === undefined) {
        updates.refillReminderLeadDays = 3;
      }
      if (product.reorderPoint === undefined) {
        updates.reorderPoint = 5;
      }

      // 6. Save updates to database
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(product._id, updates);
        updatedCount++;
      }
    }

    console.log(`[migrations.ts] Successfully backfilled ${updatedCount} products.`);
    return { success: true, totalFound: products.length, updatedCount };
  }
});

/**
 * Migration Mutation: Backfills all existing users in the database.
 * Sets default/placeholder values and copies checkout momoPhone to top-level phone field.
 */
export const backfillLegacyUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch all users
    const users = await ctx.db.query("users").collect();
    console.log(`[migrations.ts] Found ${users.length} users to migrate.`);

    let updatedCount = 0;

    for (const user of users) {
      const updates: any = {};

      // 2. Map checkout-level momoPhone to new general phone field
      if (user.phone === undefined && user.momoPhone !== undefined) {
        updates.phone = user.momoPhone;
      }

      // 3. Set default account status
      if (user.accountStatus === undefined) {
        updates.accountStatus = "active";
      }

      // 4. Set default gender fallback
      if (user.gender === undefined) {
        updates.gender = "unspecified";
      }

      // 5. Set default communication preferences
      if (user.communicationPrefs === undefined) {
        updates.communicationPrefs = "all";
      }

      // 6. Seed starting loyalty tiers & points
      if (user.loyaltyTier === undefined) {
        updates.loyaltyTier = "bronze";
      }
      if (user.loyaltyPoints === undefined) {
        updates.loyaltyPoints = 0;
      }

      // 7. Save updates to database
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
        updatedCount++;
      }
    }

    console.log(`[migrations.ts] Successfully backfilled ${updatedCount} users.`);
    return { success: true, totalFound: users.length, updatedCount };
  }
});

/**
 * Migration Mutation: Backfills `updatedAt` on products missing it (mainly
 * rows created/patched via the ERP webhook ingestion path, which never
 * stamped it). Without `updatedAt`, a product can never satisfy the
 * getProductsUpdatedSince delta-sync query's `.gt("updatedAt", since)`
 * check, so it's permanently invisible to the offline POS/exchange product
 * cache after the device's first bootstrap - this backfill makes every
 * affected product eligible again on the next sync.
 */
export const backfillProductUpdatedAt = mutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    // Batched + self-scheduling: the products table is large enough (5000+
    // rows) that a single .collect() over all of it exceeds Convex's
    // per-execution read limit.
    const BATCH_SIZE = 200;
    const result = await ctx.db
      .query("products")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let updatedCount = 0;
    for (const product of result.page) {
      if (product.updatedAt === undefined) {
        await ctx.db.patch(product._id, { updatedAt: product._creationTime });
        updatedCount++;
      }
    }

    console.log(
      `[migrations.ts] backfillProductUpdatedAt: updated ${updatedCount} of ${result.page.length} scanned this batch${result.isDone ? " (final batch)" : ""}.`
    );

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.migrations.backfillProductUpdatedAt, {
        cursor: result.continueCursor,
      });
    }

    return { batchScanned: result.page.length, batchUpdated: updatedCount, isDone: result.isDone };
  }
});

/**
 * Migration Mutation: Backfills `returnItems` rows for legacy `returns` documents
 * that still carry their line items embedded in the (deprecated) `returnedItems`
 * array instead of as separate `returnItems` rows. The admin Returns panel only
 * reads from `returnItems`, so these legacy returns are otherwise invisible and
 * can never be approved/rejected.
 */
export const backfillLegacyReturnItems = mutation({
  args: {},
  handler: async (ctx) => {
    const returns = await ctx.db.query("returns").collect();
    console.log(`[migrations.ts] Found ${returns.length} returns to scan.`);

    let returnsBackfilled = 0;
    let itemsInserted = 0;

    for (const ret of returns) {
      if (!ret.returnedItems || ret.returnedItems.length === 0) continue;

      const existingItems = await ctx.db
        .query("returnItems")
        .withIndex("by_return", (q) => q.eq("returnId", ret._id))
        .collect();
      if (existingItems.length > 0) continue;

      for (const item of ret.returnedItems) {
        await ctx.db.insert("returnItems", {
          returnId: ret._id,
          orderId: ret.orderId,
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          status: "pending",
          source: "manual_return",
          createdAt: ret.createdAt,
        });
        itemsInserted++;
      }
      returnsBackfilled++;
    }

    console.log(`[migrations.ts] Backfilled ${returnsBackfilled} returns, inserted ${itemsInserted} returnItems.`);
    return { success: true, returnsScanned: returns.length, returnsBackfilled, itemsInserted };
  }
});
