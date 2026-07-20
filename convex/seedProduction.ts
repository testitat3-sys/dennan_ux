import { mutation } from "./_generated/server";
import { NEW_PRODUCTS } from "./seedProducts";
import { CLOSE_MATCHES_PRODUCTS } from "./seedCloseMatches";
import { slugify } from "./products";
import emlData from "../eml.json";

export const runProductionSeed = mutation({
  args: {},
  handler: async (ctx) => {
    let markedCount = 0;
    let upsertedCount = 0;

    // 1. Mark all existing products currently in the DB as actual_data = false
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) {
      if (p.actual_data !== false) {
        await ctx.db.patch(p._id, { actual_data: false });
        markedCount++;
      }
    }
    console.log(`Marked ${markedCount} existing products as actual_data = false.`);

    const isEssentialsSet = new Set(emlData.isEssentials);
    const isMustHaveSet = new Set(emlData.isMustHave);
    const isLuxurySet = new Set(emlData.isLuxury);
    const isMostLovedSet = new Set(emlData.isMostLoved);
    const isCuratedForYouSet = new Set(emlData.isCuratedForYou);

    // Helper to upsert a product list
    const upsertProducts = async (products: any[]) => {
      for (const item of products) {
        let existing = null;
        if (item.barcode) {
          existing = await ctx.db
            .query("products")
            .withIndex("by_barcode", (q) => q.eq("barcode", item.barcode))
            .unique();
        }
        if (!existing && item.slug) {
          existing = await ctx.db
            .query("products")
            .withIndex("by_slug", (q) => q.eq("slug", item.slug))
            .unique();
        }

        const barcode = item.barcode;
        const isEssentials = isEssentialsSet.has(barcode);
        const isMustHave = isMustHaveSet.has(barcode);
        const isLuxury = isLuxurySet.has(barcode);
        const isMostLoved = isMostLovedSet.has(barcode);
        const isCuratedForYou = isCuratedForYouSet.has(barcode);

        // Derive tier based on eml.json arrays, falling back to existing item.tier
        let derivedTier = item.tier;
        if (isEssentials) derivedTier = "essentials";
        else if (isMustHave) derivedTier = "musthaves";
        else if (isLuxury) derivedTier = "luxuries";

        const productFields: any = {
          name: item.name,
          brand: item.brand || "Generic",
          brandSlug: slugify(item.brand || "Generic"),
          size: item.size,
          color: item.color || "Default",
          slug: item.slug,
          sku: item.sku,
          barcode: item.barcode,
          weightGrams: item.weightGrams,
          dimensions: item.dimensions,
          price: item.price,
          wasPrice: item.wasPrice,
          originalPrice: item.originalPrice ?? item.price,
          discountPrice: item.discountPrice,
          discountExpiry: item.discountExpiry,
          image: item.image,
          images: item.images,
          stage: item.stage,
          tier: derivedTier,
          category: item.category,
          subCategory: item.subCategory,
          targetGender: item.targetGender,
          material: item.material,
          pattern: item.pattern,
          isCurated: item.isCurated,
          isMostLoved: isMostLoved,
          isEssentials,
          isMustHave,
          isLuxury,
          isCuratedForYou,
          minMonth: item.minMonth,
          maxMonth: item.maxMonth,
          minWeek: item.minWeek,
          maxWeek: item.maxWeek,
          description: item.description || "",
          tags: item.tags || [],
          specifications: item.specifications || [],
          isActive: true, // Force isActive to true
          actual_data: true, // Force actual_data to true
          inventory: item.inventory,
          unitsSold: item.unitsSold,
          costPrice: item.costPrice,
          reorderPoint: item.reorderPoint,
          allergens: item.allergens,
          usageInstructions: item.usageInstructions,
          expiryDate: item.expiryDate,
          shelfLifeDays: item.shelfLifeDays,
          refillPeriodDays: item.refillPeriodDays,
          unitsPerUse: item.unitsPerUse,
          recommendedFrequency: item.recommendedFrequency,
          productType: item.productType,
          refillReminderLeadDays: item.refillReminderLeadDays,
        };

        // Clean undefined fields to avoid Convex errors
        for (const key of Object.keys(productFields)) {
          if (productFields[key] === undefined) {
            delete productFields[key];
          }
        }

        if (existing) {
          await ctx.db.patch(existing._id, productFields);
        } else {
          await ctx.db.insert("products", productFields);
        }
        upsertedCount++;
      }
    };

    // 2. Upsert both sets of products
    await upsertProducts(NEW_PRODUCTS);
    await upsertProducts(CLOSE_MATCHES_PRODUCTS);

    console.log(`Successfully upserted ${upsertedCount} production products.`);
    return {
      success: true,
      markedAsLegacy: markedCount,
      newProductsUpserted: upsertedCount,
    };
  }
});

/**
 * Production-safe additive seed.
 *
 * For every product in NEW_PRODUCTS + CLOSE_MATCHES_PRODUCTS:
 *   - Found by barcode → only patch `actual_data: true`. Nothing else touched.
 *   - Not found       → insert the full product record from the seed file.
 *
 * Never marks any existing product as actual_data = false.
 * Safe to run against a live production deployment at any time.
 */
export const runProductionSeedAdditive = mutation({
  args: {},
  handler: async (ctx) => {
    let activatedCount = 0; // existing products flipped to actual_data: true
    let insertedCount = 0;  // brand-new products inserted
    let skippedCount = 0;   // already actual_data: true, no write needed

    const allProducts = [
      ...(NEW_PRODUCTS as any[]),
      ...(CLOSE_MATCHES_PRODUCTS as any[]),
    ];

    for (const item of allProducts) {
      // Look up by barcode only (primary identity key for stock)
      const existing = item.barcode
        ? await ctx.db
            .query("products")
            .withIndex("by_barcode", (q) => q.eq("barcode", item.barcode))
            .unique()
        : null;

      if (existing) {
        // Product already in prod — only flip the flag if needed.
        if (existing.actual_data !== true) {
          await ctx.db.patch(existing._id, { actual_data: true });
          activatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Genuinely new product — insert full record from seed file.
        const fields: any = {
          name: item.name,
          brand: item.brand || "Generic",
          brandSlug: slugify(item.brand || "Generic"),
          slug: item.slug,
          barcode: item.barcode,
          price: item.price,
          wasPrice: item.wasPrice,
          originalPrice: item.originalPrice ?? item.price,
          discountPrice: item.discountPrice,
          discountExpiry: item.discountExpiry,
          image: item.image,
          images: item.images,
          stage: item.stage,
          tier: item.tier,
          category: item.category,
          subCategory: item.subCategory,
          targetGender: item.targetGender,
          material: item.material,
          pattern: item.pattern,
          isCurated: item.isCurated,
          isMostLoved: item.isMostLoved,
          minMonth: item.minMonth,
          maxMonth: item.maxMonth,
          minWeek: item.minWeek,
          maxWeek: item.maxWeek,
          description: item.description || "",
          tags: item.tags || [],
          specifications: item.specifications || [],
          isActive: true,
          actual_data: true,
          inventory: item.inventory,
          unitsSold: item.unitsSold,
        };
        // Strip undefined fields — Convex rejects them
        for (const key of Object.keys(fields)) {
          if (fields[key] === undefined) delete fields[key];
        }
        await ctx.db.insert("products", fields);
        insertedCount++;
      }
    }

    console.log(
      `[runProductionSeedAdditive] activated=${activatedCount} inserted=${insertedCount} skipped=${skippedCount} total=${allProducts.length}`
    );
    return { activatedCount, insertedCount, skippedCount, total: allProducts.length };
  },
});
