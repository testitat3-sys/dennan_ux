import { mutation } from "./_generated/server";

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
      const currentCategory = product.category;
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
