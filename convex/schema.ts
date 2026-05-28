import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ─── Existing tables ────────────────────────────────────────────────────────

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    isOnboarded: v.optional(v.boolean()),
    username: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    lastSeen: v.optional(v.number()),
    emailVerificationTime: v.optional(v.number()),
    // Lazy onboarding profile fields
    role: v.optional(v.union(v.literal("expecting"), v.literal("parent"))),
    dueDate: v.optional(v.string()),
    children: v.optional(v.array(v.object({ dob: v.string() }))),
    momoPhone: v.optional(v.string()),
    deliveryLocations: v.optional(v.array(v.object({ name: v.string(), zone: v.string() }))),
  }).index("email", ["email"]),

  testLinks: defineTable({
    email: v.string(),
    url: v.string(),
    expiresAt: v.number(),
  }).index("by_email", ["email"]),

  // ─── Product catalogue ───────────────────────────────────────────────────────

  /**
   * products — source of truth for every purchasable item.
   *
   * price / wasPrice are stored as plain numbers (UGX).
   * The UI layer is responsible for formatting and currency symbols.
   *
   * reviews are NOT embedded here — they'll live in their own table later
   * to avoid hitting the 1 MB document limit as they grow.
   */
  products: defineTable({

    name: v.string(),
    brand: v.string(),//size if any
    size: v.optional(v.string()),
    color: v.optional(v.string()),//color if any

    /** URL-safe unique identifier, e.g. "closer-to-nature-baby-bottles" */
    slug: v.string(),

    /** Operational & Logistics */
    sku: v.optional(v.string()),
    barcode: v.string(), // Now strictly required in Phase 3
    weightGrams: v.optional(v.number()),
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
        unit: v.string(),
      })
    ),

    /** Pricing */
    price: v.number(),
    wasPrice: v.optional(v.number()),
    originalPrice: v.number(),
    discountPrice: v.optional(v.number()),
    discountExpiry: v.optional(v.number()),

    /** Media */
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),

    /** Taxonomy & Merchandising */
    stage: v.optional(v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid"))),
    tier: v.optional(v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries"))),
    category: v.union(
      v.literal("Expectant and New Mom Essentials"),
      v.literal("Newborn Essentials & Kids Apparel/Footwear"),
      v.literal("Nursery and Furnishing"),
      v.literal("Feeding/Nursing Essentials"),
      v.literal("Bathing and Changing"),
      v.literal("Baby Play and Safety Gear"),
      v.literal("Travel Must-Haves")
    ), // Now strictly limited to union in Phase 3
    subCategory: v.optional(v.string()),
    targetGender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unisex"))),

    /** Composition & Care */
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),

    /** Curation */
    isCurated: v.optional(v.boolean()),
    isMostLoved: v.optional(v.boolean()),

    /** Age Targeting */
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    minWeek: v.optional(v.number()),
    maxWeek: v.optional(v.number()),

    /** Content & Specifications */
    description: v.string(),
    tags: v.array(v.object({ type: v.string(), text: v.string() })),
    specifications: v.array(v.object({ label: v.string(), value: v.string() })),

    /** Status & Metrics */
    isActive: v.boolean(),
    inventory: v.optional(v.number()),
    unitsSold: v.optional(v.number()),
    actual_data: v.boolean(), // Now strictly required in Phase 3
  })
    .index("by_slug", ["slug"])
    .index("by_barcode", ["barcode"])
    .index("by_stage", ["stage"])
    .index("by_tier", ["tier"])
    .index("by_category", ["category"])
    .index("by_brand", ["brand"])
    .index("by_stage_and_tier", ["stage", "tier"])
    .index("by_category_tier_stage", ["category", "tier", "stage"]),

  // ─── Product Reviews ─────────────────────────────────────────────────────────

  /**
   * productReviews — user reviews for products.
   * Kept separate from the products table to avoid hitting the 1MB document limit.
   */
  productReviews: defineTable({
    productId: v.id("products"),
    author: v.string(),
    rating: v.number(),
    childAge: v.optional(v.string()),
    text: v.string(),
  }).index("by_product", ["productId"]),

  // ─── Lifecycle stages ────────────────────────────────────────────────────────

  /**
   * stages — metadata for the three lifecycle stage cards shown on the
   * homepage (mother, newborn, kid / toddler). Stored in Convex so copy
   * and images can be updated from the admin dashboard without a redeploy.
   */
  stages: defineTable({
    /** Slug used as FK on products.stage: "mother" | "newborn" | "kid" */
    type: v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid")),
    title: v.string(),
    eyebrow: v.string(),
    subtext: v.string(),
    heroImage: v.string(),
    href: v.string(),
    /** Display order on the homepage */
    order: v.number(),
  }).index("by_type", ["type"]),

  // ─── Product tiers ───────────────────────────────────────────────────────────

  /**
   * tiers — metadata for Essentials, Must-Haves, and Luxuries tier cards.
   */
  tiers: defineTable({
    /** Slug: "essentials" | "musthaves" | "luxuries" */
    type: v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries")),
    title: v.string(),
    badge: v.string(),
    copy: v.string(),
    image: v.string(),
    href: v.string(),
    order: v.number(),
  }).index("by_type", ["type"]),

  // ─── Social reels ────────────────────────────────────────────────────────────

  /**
   * reels — short-form video/image cards on the homepage.
   * Products linked to a reel live in the separate reelProducts child table.
   */
  reels: defineTable({
    /** Handle shown on card, e.g. "@dennan_curates" */
    label: v.string(),
    caption: v.string(),
    /** Asset path for the reel thumbnail */
    image: v.string(),
    /** CTA badge text, e.g. "UGX 199,000 — Buy now" */
    badge: v.optional(v.string()),
    /** Multi-product chip label, e.g. "3 products" */
    multiChip: v.optional(v.string()),
    order: v.number(),
  }),

  /**
   * reelProducts — normalised child rows so a reel can reference 1–N products
   * without embedding an unbounded array in the parent document.
   */
  reelProducts: defineTable({
    reelId: v.id("reels"),
    /** Null for placeholder / unnamed product slots */
    productId: v.optional(v.id("products")),
    /** Display title (may differ from the canonical product name) */
    title: v.string(),
    /** Display price string as shown on the reel, e.g. "UGX 199,000" */
    price: v.optional(v.string()),
    /** Variant label, e.g. "Color: White" */
    options: v.optional(v.string()),
    /** Optional image override for this reel slot */
    image: v.optional(v.string()),
  }).index("by_reel", ["reelId"]),

  // ─── Persisted cart ──────────────────────────────────────────────────────────

  /**
   * cartItems — server-persisted cart for authenticated users.
   *
   * Guest (unauthenticated) users use the in-memory CartContext backed by
   * localStorage. On sign-in, a mergeGuestCart mutation promotes those rows
   * here and clears localStorage.
   *
   * One row per (userId, productId, size) combination.
   */
  cartItems: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    /** Size or variant string, e.g. "M", "260ml". Null when not applicable. */
    size: v.optional(v.string()),
    /** Unix timestamp (ms) when the item was added */
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_product", ["userId", "productId"]),

  wishlistItems: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    /** True if user bookmarked when item was out of stock or explicitly subscribed to alerts */
    notifyBackInStock: v.optional(v.boolean()),
    /** Unix timestamp (ms) when the item was added */
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_product", ["userId", "productId"])
    .index("by_product", ["productId"]),

  // ─── Dashboard next-milestone cards ──────────────────────────────────────────

  /**
   * dashboardItems — next-milestone CTA cards shown on the user dashboard.
   * These drive the "Shop now" buttons that feed into the cart.
   *
   * Static content (milestone labels, badge definitions, checklists) stays
   * in db.json as it doesn't need a DB round-trip for cart purposes.
   *
   * stage: "expecting" | "newborn"
   * The optional week/month range determines which card is shown based on
   * the user's current pregnancy week or child's age in months.
   */
  dashboardItems: defineTable({
    stage: v.union(v.literal("expecting"), v.literal("newborn")),
    minWeek: v.optional(v.number()),
    maxWeek: v.optional(v.number()),
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    title: v.string(),
    desc: v.string(),
    action: v.string(),
    href: v.optional(v.string()),
    order: v.number(),
  }).index("by_stage_and_order", ["stage", "order"]),

  // ─── Brands catalogue ────────────────────────────────────────────────────────

  /**
   * brands — metadata for individual brand pages (mission, logo, story, banner).
   * Products for each brand are queried dynamically using products.brand index.
   */
  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.string(),
    banner: v.string(),
    discount: v.optional(v.string()),
    mission: v.string(),
    certifications: v.array(
      v.object({
        name: v.string(),
        icon: v.string(),
      })
    ),
    story: v.object({
      title: v.string(),
      content: v.string(),
      videoUrl: v.optional(v.string()),
    }),
    order: v.optional(v.number()),
  }).index("by_slug", ["slug"]),

  // ─── Coupons & Promotion system ──────────────────────────────────────────────
  coupons: defineTable({
    code: v.string(), // e.g. "MOMMYUG"
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(), // Percentage (e.g. 10) or fixed UGX value (e.g. 10000)
    minSpend: v.optional(v.number()), // Minimum spend requirement in UGX
    expiresAt: v.number(), // Unix timestamp (ms)
    isActive: v.boolean(),
    usageCount: v.number(),
    maxUsage: v.optional(v.number()),
  }).index("by_code", ["code"]),

  // ─── Order Processing & Invoicing ───────────────────────────────────────────
  orders: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("preparing"),
      v.literal("dispatched"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
    paymentMethod: v.string(), // "momo" | "card"
    momoPhone: v.optional(v.string()), // Ugandan mobile money number
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
    }),
    subtotal: v.number(),      // Server-calculated sum of product price * quantity
    discountAmount: v.number(), // Recalculated savings based on coupon
    deliveryFee: v.number(),   // Verified delivery fee
    grandTotal: v.number(),    // subtotal - discountAmount + deliveryFee
    couponApplied: v.optional(v.string()),
    pesapalTrackingId: v.optional(v.string()),
    pesapalMerchantReference: v.optional(v.string()),
    pesapalRedirectUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    size: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(), // Locked price at checkout
  }).index("by_order", ["orderId"]),

  registries: defineTable({
    userId: v.id("users"),
    ownerName: v.string(),
    eventName: v.string(),
    eventDate: v.string(),
    message: v.string(),
    privacy: v.union(v.literal("public"), v.literal("hidden"), v.literal("private")),
  }).index("by_user", ["userId"]),

  registryItems: defineTable({
    registryId: v.id("registries"),
    productId: v.id("products"),
    isMustHave: v.boolean(),
    isGroupGifting: v.boolean(),
    status: v.union(v.literal("available"), v.literal("purchased")),
    contributions: v.array(
      v.object({
        name: v.string(),
        amount: v.number(),
        date: v.string(),
      })
    ),
    purchasedBy: v.optional(
      v.object({
        name: v.string(),
        date: v.string(),
      })
    ),
  })
    .index("by_registry", ["registryId"])
    .index("by_registry_and_product", ["registryId", "productId"]),

  // ─── Homepage static elements ────────────────────────────────────────────────
  hero: defineTable({
    headline: v.string(),
    subcopy: v.string(),
    backgroundImage: v.string(),
    trending: v.object({
      label: v.string(),
      value: v.string(),
    }),
    heritageCards: v.array(
      v.object({
        id: v.number(),
        icon: v.string(),
        stat: v.string(),
        statClass: v.string(),
        label: v.string(),
        desc: v.string(),
      })
    ),
  }),

  trustItems: defineTable({
    icon: v.string(),
    type: v.string(),
    title: v.string(),
    sub: v.string(),
    order: v.number(),
  }),

  collections: defineTable({
    collectionId: v.string(),
    title: v.string(),
    subtext: v.string(),
    heroImage: v.string(),
  }).index("by_collectionId", ["collectionId"]),

  // ─── Dashboard Configuration ─────────────────────────────────────────────────
  dashboardMilestones: defineTable({
    stage: v.union(v.literal("expecting"), v.literal("newborn")),
    label: v.string(),
    week: v.optional(v.number()),
    month: v.optional(v.number()),
    order: v.number(),
  }).index("by_stage_and_order", ["stage", "order"]),

  dashboardBadges: defineTable({
    stage: v.union(v.literal("expecting"), v.literal("newborn")),
    badgeId: v.string(),
    label: v.string(),
    minWeek: v.optional(v.number()),
    minMonth: v.optional(v.number()),
    order: v.number(),
  }).index("by_stage_and_order", ["stage", "order"]),

  dashboardChecklists: defineTable({
    stage: v.union(v.literal("expecting"), v.literal("newborn")),
    checklistId: v.string(),
    label: v.string(),
    order: v.number(),
  }).index("by_stage_and_order", ["stage", "order"]),

  dashboardEditorial: defineTable({
    title: v.string(),
    text: v.string(),
    btnText: v.string(),
  }),

  // ─── Checkout Configuration ──────────────────────────────────────────────────
  checkoutSteps: defineTable({
    stepId: v.string(),
    label: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]),

  checkoutConfirmationPromos: defineTable({
    promoId: v.string(),
    title: v.string(),
    desc: v.string(),
    action: v.string(),
    order: v.number(),
  }).index("by_order", ["order"]),

  checkoutTrackingStages: defineTable({
    stageId: v.number(),
    title: v.string(),
    subtitle: v.string(),
  }).index("by_stageId", ["stageId"]),

  checkoutTrackingRider: defineTable({
    name: v.string(),
    photo: v.string(),
    bike: v.string(),
    rating: v.number(),
    phone: v.string(),
  }),

  deliveryZones: defineTable({
    name: v.string(),
    timeMinutes: v.number(),
  }).index("by_name", ["name"]),

  deliveryLandmarks: defineTable({
    name: v.string(),
    sub: v.string(),
    zone: v.string(),
  }),
});


