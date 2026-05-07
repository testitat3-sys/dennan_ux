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
    brand: v.string(),
    /** URL-safe unique identifier, e.g. "closer-to-nature-baby-bottles" */
    slug: v.string(),
    /** Price in UGX as a plain number */
    price: v.number(),
    /** Original / was-price for sale strikethrough, in UGX */
    wasPrice: v.optional(v.number()),
    /** Asset path or absolute URL */
    image: v.string(),
    /** "mother" | "newborn" | "kid" */
    stage: v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid")),
    /** "essentials" | "musthaves" | "luxuries" */
    tier: v.union(v.literal("essentials"), v.literal("musthaves"), v.literal("luxuries")),
    /** e.g. "Feeding", "Sleep", "Apparel", "Play", "Comfort", "On the Move" */
    category: v.string(),
    isCurated: v.optional(v.boolean()),
    isMostLoved: v.optional(v.boolean()),
    /** Age range in months — used for newborn / kid stage products */
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    /** Age range in weeks — used for mother / expecting stage products */
    minWeek: v.optional(v.number()),
    maxWeek: v.optional(v.number()),
    description: v.string(),
    /** Display badge chips, e.g. [{ type: "primary", text: "1k+ sold" }] */
    tags: v.array(v.object({ type: v.string(), text: v.string() })),
    /** Spec-sheet rows, e.g. [{ label: "BPA Free", value: "Yes" }] */
    specifications: v.array(v.object({ label: v.string(), value: v.string() })),
    /** Soft-delete / visibility toggle */
    isActive: v.boolean(),
    /** Current available stock quantity */
    inventory: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
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
      v.literal("cancelled")
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
});


