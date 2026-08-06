import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { slugify, computeSearchText } from "./products";

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
 * Migration Mutation: corrects backfillProductUpdatedAt above, which stamped
 * `updatedAt: product._creationTime` - a timestamp in the past. Delta sync
 * (getProductsUpdatedSince) only returns products where `updatedAt` is
 * greater than a device's `lastSyncedAt`, which is bumped to "now" on every
 * sync; a past creation time is almost always older than that, so the
 * original backfill never actually became visible to an
 * already-bootstrapped device. This unconditionally re-stamps every product
 * to the current time, which is guaranteed newer than any device's recorded
 * `lastSyncedAt`, so the very next delta sync on every device picks up the
 * complete, correct catalog.
 */
export const touchAllProductsUpdatedAt = mutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 200;
    const result = await ctx.db
      .query("products")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    const now = Date.now();
    for (const product of result.page) {
      await ctx.db.patch(product._id, { updatedAt: now });
    }

    console.log(
      `[migrations.ts] touchAllProductsUpdatedAt: touched ${result.page.length} products this batch${result.isDone ? " (final batch)" : ""}.`
    );

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.migrations.touchAllProductsUpdatedAt, {
        cursor: result.continueCursor,
      });
    }

    return { batchTouched: result.page.length, isDone: result.isDone };
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

/**
 * Migration Mutation: Backfills `isWalkIn: false` on legacy orders that
 * predate the field (isWalkIn is `undefined` rather than `false`). Needed so
 * the new `by_isWalkIn_and_createdAt` index (see convex/orders.ts,
 * getOrdersForStaff) can be queried with `.eq("isWalkIn", false)` and
 * actually match every non-walk-in order, not just ones explicitly stamped
 * `false` after this field was introduced.
 *
 * STATUS: run against dev on 2026-07-15 (completed, isDone: true). Still
 * needs to be run against production once Refactor 1 is deployed there —
 * `npx convex run migrations:backfillOrdersIsWalkIn '{}' --prod`.
 */
export const backfillOrdersIsWalkIn = mutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 200;
    const result = await ctx.db
      .query("orders")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let updatedCount = 0;
    for (const order of result.page) {
      if (order.isWalkIn === undefined) {
        await ctx.db.patch(order._id, { isWalkIn: false });
        updatedCount++;
      }
    }

    console.log(
      `[migrations.ts] backfillOrdersIsWalkIn: updated ${updatedCount} of ${result.page.length} scanned this batch${result.isDone ? " (final batch)" : ""}.`
    );

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.migrations.backfillOrdersIsWalkIn, {
        cursor: result.continueCursor,
      });
    }

    return { batchScanned: result.page.length, batchUpdated: updatedCount, isDone: result.isDone };
  }
});

/**
 * Migration Mutation: Backfills `brandSlug` (slugified copy of `brand`) on
 * existing products missing it. Needed so brands.getBrandBySlug's
 * no-brands-row fallback can look products up via the new `by_brandSlug`
 * index instead of scanning the whole `products` table and normalizing
 * `brand` in JS on every request. New/edited products get `brandSlug` set
 * at write time (createProduct, upsertSingleProduct, updateProduct) — this
 * migration only needs to run once to cover pre-existing rows.
 *
 * STATUS: not yet run against dev or production as of 2026-07-15 — run
 * `npx convex run migrations:backfillProductBrandSlug '{}'` against dev
 * first, then `--prod` once this refactor is deployed there.
 */
export const backfillProductBrandSlug = mutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 200;
    const result = await ctx.db
      .query("products")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let updatedCount = 0;
    for (const product of result.page) {
      if (product.brandSlug === undefined) {
        await ctx.db.patch(product._id, { brandSlug: slugify(product.brand) });
        updatedCount++;
      }
    }

    console.log(
      `[migrations.ts] backfillProductBrandSlug: updated ${updatedCount} of ${result.page.length} scanned this batch${result.isDone ? " (final batch)" : ""}.`
    );

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.migrations.backfillProductBrandSlug, {
        cursor: result.continueCursor,
      });
    }

    return { batchScanned: result.page.length, batchUpdated: updatedCount, isDone: result.isDone };
  }
});

/**
 * Migration Mutation: Backfills the `searchText` composite full-text field
 * for existing product documents so they are immediately available in the
 * `search_text` search index.
 */
export const backfillProductSearchText = mutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 200;
    const result = await ctx.db
      .query("products")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let updatedCount = 0;
    for (const product of result.page) {
      if (product.searchText === undefined) {
        const text = computeSearchText({
          name: product.name,
          brand: product.brand,
          category: product.category,
          subCategory: product.subCategory,
          description: product.description,
          tags: product.tags,
        });
        await ctx.db.patch(product._id, { searchText: text });
        updatedCount++;
      }
    }

    console.log(
      `[migrations.ts] backfillProductSearchText: updated ${updatedCount} of ${result.page.length} scanned this batch${result.isDone ? " (final batch)" : ""}.`
    );

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.migrations.backfillProductSearchText, {
        cursor: result.continueCursor,
      });
    }

    return { batchScanned: result.page.length, batchUpdated: updatedCount, isDone: result.isDone };
  }
});



