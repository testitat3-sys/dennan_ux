import { mutation } from "./_generated/server";
import { NEW_PRODUCTS } from "./seedProducts";
import { CLOSE_MATCHES_PRODUCTS } from "./seedCloseMatches";

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

        const productFields: any = {
          name: item.name,
          brand: item.brand || "Generic",
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
