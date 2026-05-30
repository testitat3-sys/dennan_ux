import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { normalizeProductPrice } from "./products";

/**
 * Get active user's registry. Creates a default registry if none exists.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Find user's registry
    const registry = await ctx.db
      .query("registries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!registry) {
      return null;
    }

    // Get items
    const rawItems = await ctx.db
      .query("registryItems")
      .withIndex("by_registry", (q) => q.eq("registryId", registry!._id))
      .collect();

    // Hydrate items with product details
    const items = [];
    for (const rawItem of rawItems) {
      const rawProduct = await ctx.db.get(rawItem.productId);
      if (rawProduct) {
        const product = normalizeProductPrice(rawProduct);
        items.push({
          id: rawItem._id, // item ID
          productId: rawItem.productId,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          isMustHave: rawItem.isMustHave,
          isGroupGifting: rawItem.isGroupGifting,
          status: rawItem.status,
          contributions: rawItem.contributions || [],
          purchasedBy: rawItem.purchasedBy,
        });
      }
    }

    // Return profile structure
    return {
      profile: {
        id: registry._id,
        ownerName: registry.ownerName,
        eventName: registry.eventName,
        eventDate: registry.eventDate,
        message: registry.message,
        privacy: registry.privacy,
        eventType: registry.eventType ?? null,
      },
      items,
    };
  },
});

/**
 * Ensure user has a registry. Creates a default registry if none exists.
 */
export const ensureRegistry = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let registry = await ctx.db
      .query("registries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!registry) {
      const defaultEventDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]; // 60 days in the future

      const defaultRegistryId = await ctx.db.insert("registries", {
        userId,
        ownerName: user.name || "Sarah & Mike",
        eventName: "Our Baby Registry",
        eventDate: defaultEventDate,
        message: "Thank you for supporting our nursery journey!",
        privacy: "public",
      });

      registry = await ctx.db.get(defaultRegistryId);
    }

    return registry?._id;
  },
});

/**
 * Get shared registry for guests.
 */
export const getShared = query({
  args: { registryId: v.id("registries") },
  handler: async (ctx, args) => {
    const registry = await ctx.db.get(args.registryId);
    if (!registry) {
      return null;
    }

    // Check privacy
    if (registry.privacy === "private") {
      return null;
    }

    const rawItems = await ctx.db
      .query("registryItems")
      .withIndex("by_registry", (q) => q.eq("registryId", args.registryId))
      .collect();

    const items = [];
    for (const rawItem of rawItems) {
      const rawProduct = await ctx.db.get(rawItem.productId);
      if (rawProduct) {
        const product = normalizeProductPrice(rawProduct);
        items.push({
          id: rawItem._id,
          productId: rawItem.productId,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          isMustHave: rawItem.isMustHave,
          isGroupGifting: rawItem.isGroupGifting,
          status: rawItem.status,
          contributions: rawItem.contributions || [],
          purchasedBy: rawItem.purchasedBy,
        });
      }
    }

    return {
      profile: {
        id: registry._id,
        ownerName: registry.ownerName,
        eventName: registry.eventName,
        eventDate: registry.eventDate,
        message: registry.message,
        privacy: registry.privacy,
        eventType: registry.eventType ?? null,
      },
      items,
    };
  },
});

/**
 * Save the event type chosen in the Add Event Modal for the authenticated user's registry.
 * Creates the registry first if it does not exist yet.
 */
export const setEventType = mutation({
  args: {
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    let registry = await ctx.db
      .query("registries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!registry) {
      const user = await ctx.db.get(userId);
      const defaultDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const newId = await ctx.db.insert("registries", {
        userId,
        ownerName: user?.name ?? "My Registry",
        eventName: args.eventType + " Registry",
        eventDate: defaultDate,
        message: "",
        privacy: "public",
        eventType: args.eventType,
      });
      return newId;
    }

    await ctx.db.patch(registry._id, {
      eventType: args.eventType,
      eventName: args.eventType + " Registry",
    });
    return registry._id;
  },
});

/**
 * Update registry profile.
 */
export const updateProfile = mutation({
  args: {
    registryId: v.id("registries"),
    ownerName: v.optional(v.string()),
    eventName: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    message: v.optional(v.string()),
    privacy: v.optional(v.union(v.literal("public"), v.literal("hidden"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const registry = await ctx.db.get(args.registryId);
    if (!registry || registry.userId !== userId) {
      throw new Error("Unauthorized or registry not found");
    }

    const patch: any = {};
    if (args.ownerName !== undefined) patch.ownerName = args.ownerName;
    if (args.eventName !== undefined) patch.eventName = args.eventName;
    if (args.eventDate !== undefined) patch.eventDate = args.eventDate;
    if (args.message !== undefined) patch.message = args.message;
    if (args.privacy !== undefined) patch.privacy = args.privacy;

    await ctx.db.patch(args.registryId, patch);
    return { success: true };
  },
});

/**
 * Add product to user's registry.
 */
export const addItem = mutation({
  args: {
    productId: v.id("products"),
    isMustHave: v.optional(v.boolean()),
    isGroupGifting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Find registry, create if needed
    let registry = await ctx.db
      .query("registries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!registry) {
      const user = await ctx.db.get(userId);
      const defaultEventDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const defaultRegistryId = await ctx.db.insert("registries", {
        userId,
        ownerName: user?.name || "Sarah & Mike",
        eventName: "Our Baby Registry",
        eventDate: defaultEventDate,
        message: "Thank you for supporting our nursery journey!",
        privacy: "public",
      });

      registry = await ctx.db.get(defaultRegistryId);
    }

    if (!registry) {
      throw new Error("Could not find or create registry");
    }

    const rawProduct = await ctx.db.get(args.productId);
    if (!rawProduct) {
      throw new Error("Product not found");
    }
    const product = normalizeProductPrice(rawProduct);

    // Check if product already exists in this registry
    const existing = await ctx.db
      .query("registryItems")
      .withIndex("by_registry_and_product", (q) =>
        q.eq("registryId", registry!._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Automatic group gifting for items above 100k UGX
    const autoGroupGifting = product.price > 100000;

    const insertedId = await ctx.db.insert("registryItems", {
      registryId: registry._id,
      productId: args.productId,
      isMustHave: args.isMustHave ?? false,
      isGroupGifting: args.isGroupGifting ?? autoGroupGifting,
      status: "available",
      contributions: [],
    });

    return insertedId;
  },
});

/**
 * Remove product from registry.
 */
export const removeItem = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const registry = await ctx.db
      .query("registries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!registry) {
      throw new Error("Registry not found");
    }

    const existing = await ctx.db
      .query("registryItems")
      .withIndex("by_registry_and_product", (q) =>
        q.eq("registryId", registry._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

/**
 * Toggle must-have status.
 */
export const toggleMustHave = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const registry = await ctx.db
      .query("registries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!registry) {
      throw new Error("Registry not found");
    }

    const existing = await ctx.db
      .query("registryItems")
      .withIndex("by_registry_and_product", (q) =>
        q.eq("registryId", registry._id).eq("productId", args.productId)
      )
      .first();

    if (!existing) {
      throw new Error("Item not in registry");
    }

    await ctx.db.patch(existing._id, {
      isMustHave: !existing.isMustHave,
    });

    return { success: true, isMustHave: !existing.isMustHave };
  },
});

/**
 * Add a fractional group-gifting contribution.
 */
export const addContribution = mutation({
  args: {
    registryId: v.id("registries"),
    productId: v.id("products"),
    contributorName: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const registryItem = await ctx.db
      .query("registryItems")
      .withIndex("by_registry_and_product", (q) =>
        q.eq("registryId", args.registryId).eq("productId", args.productId)
      )
      .first();

    if (!registryItem) {
      throw new Error("Registry item not found");
    }

    const rawProduct = await ctx.db.get(args.productId);
    if (!rawProduct) {
      throw new Error("Product not found");
    }
    const product = normalizeProductPrice(rawProduct);

    const currentContributions = registryItem.contributions || [];
    const newContributions = [
      ...currentContributions,
      {
        name: args.contributorName,
        amount: args.amount,
        date: new Date().toISOString(),
      },
    ];

    const totalContributed = newContributions.reduce((acc, c) => acc + c.amount, 0);
    const isFullyPaid = totalContributed >= product.price;

    await ctx.db.patch(registryItem._id, {
      contributions: newContributions,
      status: isFullyPaid ? "purchased" : "available",
    });

    return { success: true, totalContributed, status: isFullyPaid ? "purchased" : "available" };
  },
});

/**
 * Mark a registry item as purchased/gifted.
 */
export const markPurchased = mutation({
  args: {
    registryId: v.id("registries"),
    productId: v.id("products"),
    purchaserName: v.string(),
  },
  handler: async (ctx, args) => {
    const registryItem = await ctx.db
      .query("registryItems")
      .withIndex("by_registry_and_product", (q) =>
        q.eq("registryId", args.registryId).eq("productId", args.productId)
      )
      .first();

    if (!registryItem) {
      throw new Error("Registry item not found");
    }

    await ctx.db.patch(registryItem._id, {
      status: "purchased",
      purchasedBy: {
        name: args.purchaserName,
        date: new Date().toISOString(),
      },
    });

    return { success: true };
  },
});
