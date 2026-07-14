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
    children: v.optional(
      v.array(
        v.object({
          dob: v.string(),
          gender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unspecified"))),
        })
      )
    ),
    momoPhone: v.optional(v.string()),
    deliveryLocations: v.optional(v.array(v.object({
      name: v.string(),
      zone: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }))),

    // ==========================================
    // NEW PERSONALISATION & AUTOMATION FIELDS
    // ==========================================
    phone: v.optional(v.string()),
    accountStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("suspended"),
        v.literal("deleted")
      )
    ),
    preferredContact: v.optional(
      v.union(
        v.literal("email"),
        v.literal("sms"),
        v.literal("whatsapp"),
        v.literal("push")
      )
    ),
    dob: v.optional(v.string()),
    gender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("unspecified")
      )
    ),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    householdSize: v.optional(v.number()),
    pricePreference: v.optional(
      v.union(v.literal("budget"), v.literal("mid-range"), v.literal("premium"))
    ),
    preferredCategories: v.optional(v.array(v.string())),
    preferredBrands: v.optional(v.array(v.id("brands"))),
    sizePrefs: v.optional(v.string()),
    colorPrefs: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    communicationPrefs: v.optional(
      v.union(
        v.literal("all"),
        v.literal("promotions_only"),
        v.literal("order_updates_only")
      )
    ),
    loyaltyTier: v.optional(
      v.union(
        v.literal("bronze"),
        v.literal("silver"),
        v.literal("gold"),
        v.literal("platinum")
      )
    ),
    loyaltyPoints: v.optional(v.number()),
    shoppingStyle: v.optional(
      v.union(
        v.literal("impulsive"),
        v.literal("careful_comparer"),
        v.literal("loyal_repeat")
      )
    ),
    churnRisk: v.optional(v.number()),
    engagementScore: v.optional(v.number()),
    recentlyViewed: v.optional(v.array(v.id("products"))), // Capped array of recently viewed product IDs
    password: v.optional(v.string()),
    accountRole: v.optional(v.union(v.literal("staff"), v.literal("admin"), v.literal("accounting"), v.literal("stockManager"))),
    customerNotes: v.optional(v.string()),
    isWalkIn: v.optional(v.boolean()),
    // Free-form dictionary for tagging account-level facts that don't warrant
    // their own column. Every key ever written here must be documented in
    // docs/user-details-schema.md.
    details: v.optional(v.record(v.string(), v.string())),

    // ==========================================
    // PRE-LAUNCH IMPORT & LEAD-RESOLUTION FIELDS
    // ==========================================
    /** Old-DB _id from the pre-launch Convex project; used for idempotent re-imports. */
    preLaunchId: v.optional(v.string()),
    /** Marks how this user row was created. "pre_launch" = imported from pre-launch site. */
    importSource: v.optional(
      v.union(v.literal("pre_launch"), v.literal("manual"))
    ),
    /** Lead-resolution tracking for pre-launch sign-ups shown in the Leads panel. */
    leadStatus: v.optional(v.union(v.literal("new"), v.literal("resolved"))),
    leadResolvedAt: v.optional(v.number()),
    leadResolvedByStaffId: v.optional(v.id("users")),
  })
    .index("email", ["email"])
    .index("by_accountRole", ["accountRole"])
    .index("by_importSource", ["importSource"])
    .index("by_preLaunchId", ["preLaunchId"]),

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
    category: v.optional(
      v.union(
        v.literal("Expectant and New Mom Essentials"),
        v.literal("Newborn Essentials & Kids Apparel/Footwear"),
        v.literal("Nursery and Furnishing"),
        v.literal("Feeding/Nursing Essentials"),
        v.literal("Bathing and Changing"),
        v.literal("Baby Play and Safety Gear"),
        v.literal("Travel Must-Haves")
      )
    ), // Now strictly limited to union in Phase 3 and optional
    subCategory: v.optional(v.string()),
    targetGender: v.optional(v.union(v.literal("boy"), v.literal("girl"), v.literal("unisex"))),

    /** Composition & Care */
    material: v.optional(v.string()),
    pattern: v.optional(v.string()),

    /** Curation */
    isCurated: v.optional(v.boolean()),
    isMostLoved: v.optional(v.boolean()),
    isEssentials: v.optional(v.boolean()),
    isMustHave: v.optional(v.boolean()),
    isLuxury: v.optional(v.boolean()),
    isCuratedForYou: v.optional(v.boolean()),

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

    /**
     * Last-write timestamp, stamped by every mutation that patches a product
     * (including stock deduction on order fulfillment). Powers incremental
     * "what changed since X" sync for the offline POS product cache - see
     * getProductsUpdatedSince in convex/products.ts.
     */
    updatedAt: v.optional(v.number()),

    // ==========================================
    // NEW LOGISTICS & REFILL AUTOMATION FIELDS
    // ==========================================
    costPrice: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    allergens: v.optional(v.array(v.string())),
    usageInstructions: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    shelfLifeDays: v.optional(v.number()),
    refillPeriodDays: v.optional(v.number()),
    unitsPerUse: v.optional(v.number()),
    recommendedFrequency: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
    productType: v.optional(
      v.union(v.literal("physical"), v.literal("digital"), v.literal("service"))
    ),
    refillReminderLeadDays: v.optional(v.number()),

    /**
     * Freeform, append-only classification tags. Lets new one-off product
     * classifications (e.g. "sold_via_exchange") be introduced without a
     * schema migration — see convex/attributes.ts and convex/ATTRIBUTES.md.
     */
    attributes: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.optional(v.string()),
          setAt: v.number(),
        })
      )
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_barcode", ["barcode"])
    .index("by_stage", ["stage"])
    .index("by_tier", ["tier"])
    .index("by_category", ["category"])
    .index("by_brand", ["brand"])
    .index("by_stage_and_tier", ["stage", "tier"])
    .index("by_category_tier_stage", ["category", "tier", "stage"])
    .index("by_sku", ["sku"])
    .index("by_updatedAt", ["updatedAt"])
    .searchIndex("search_name", { searchField: "name" }),

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
    /** Unix timestamp (ms) when a back-in-stock email was last sent for the current restock; cleared when inventory drops back to 0 */
    notifiedAt: v.optional(v.number()),
    /** Unix timestamp (ms) when the item was added */
    addedAt: v.number(),
    /** Lead-resolution tracking, only meaningful when notifyBackInStock is true. Undefined = "new". */
    status: v.optional(v.union(v.literal("new"), v.literal("resolved"))),
    resolvedAt: v.optional(v.number()),
    resolvedByStaffId: v.optional(v.id("users")),
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

  /**
   * productBrandNames — lightweight name+slug list powering the admin brand
   * dropdown/combobox on the product create/edit forms. Deliberately separate
   * from `brands` (marketing content for brand landing pages) since products
   * just need a plain brand name string, not the heavier marketing fields.
   */
  productBrandNames: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_name", ["name"]).index("by_slug", ["slug"]),

  /**
   * stockCounters — single-row denormalized {ok, low, out} count of products
   * by stock status, kept in sync incrementally by every mutation that writes
   * a product's inventory or reorderPoint (see convex/stockCounters.ts). This
   * lets the Stock Manager summary chips stay accurate without ever scanning
   * the full products table.
   */
  stockCounters: defineTable({
    ok: v.number(),
    low: v.number(),
    out: v.number(),
  }),

  /**
   * barcodeCounters — one row per calendar year, tracking the last-issued
   * sequence number for admin-generated barcodes ("{year}{seq}", e.g.
   * "2026087"). Incremented atomically by createProduct (see
   * convex/products.ts) so new barcodes never require scanning the
   * products table.
   */
  barcodeCounters: defineTable({
    year: v.number(),
    lastSeq: v.number(),
  }).index("by_year", ["year"]),

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
      v.literal("pending_cod"),
      v.literal("preparing"),
      v.literal("packing"),
      v.literal("dispatched"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("failed"),
      v.literal("returned"),
      v.literal("partially_returned")
    ),
    paymentMethod: v.string(), // "momo" | "card" | "cod"
    momoPhone: v.optional(v.string()), // Ugandan mobile money number
    deliveryAddress: v.object({
      name: v.string(),
      zone: v.string(),
      deliveryFee: v.optional(v.number()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      distance: v.optional(v.number()),
      etaMinutes: v.optional(v.number()),
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
    
    // Staff/Fulfillment fields
    claimedBy: v.optional(v.id("users")),
    claimedAt: v.optional(v.number()),
    dispatchedAt: v.optional(v.number()),
    deliveryPersonName: v.optional(v.string()),
    riderPhone: v.optional(v.string()),
    expectedDeliveryTime: v.optional(v.number()),
    timeToClaim: v.optional(v.number()),
    timeToDispatch: v.optional(v.number()),
    timeToDeliver: v.optional(v.number()),
    history: v.optional(
      v.array(
        v.object({
          status: v.string(),
          timestamp: v.number(),
          note: v.string(),
        })
      )
    ),
    completedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    isOnline: v.optional(v.boolean()),
    isWalkIn: v.optional(v.boolean()),
    note: v.optional(v.string()),
    cardOrderId: v.optional(v.string()),
    receiptNumber: v.optional(v.string()), // Human-readable receipt number (walk-in orders)
    receiptSentAt: v.optional(v.number()), // set once the email receipt has been sent, prevents duplicate sends
    channel: v.optional(
      v.union(v.literal("online"), v.literal("walk_in"), v.literal("whatsapp"))
    ),
    /** Client-generated id for walk-in orders placed via the offline POS queue (admin/src/lib/offlineDb.js). Lets createPhysicalOrder detect and no-op a resubmitted sync instead of creating a duplicate order + stock decrement. */
    offlineOrderId: v.optional(v.string()),

    /** Freeform, append-only classification tags — see convex/attributes.ts and convex/ATTRIBUTES.md. */
    attributes: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.optional(v.string()),
          setAt: v.number(),
        })
      )
    ),
  }).index("by_user", ["userId"])
    .index("by_claimedBy", ["claimedBy"])
    .index("by_createdAt", ["createdAt"])
    .index("by_offlineOrderId", ["offlineOrderId"]),

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
    /** Frontend-chosen event label, e.g. "Birthday", "Christening", custom string */
    eventType: v.optional(v.string()),
    selectedPackagingPattern: v.optional(v.string()),
    selectedPackagingColor: v.optional(v.string()),
    packagingStatus: v.optional(v.union(v.literal("available"), v.literal("purchased"))),
    packagingPurchasedBy: v.optional(
      v.object({
        name: v.string(),
        date: v.string(),
        email: v.optional(v.string()),
      })
    ),
  }).index("by_user", ["userId"]),

  registryNotifySignups: defineTable({
    userId: v.optional(v.id("users")),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    stage: v.optional(
      v.union(
        v.literal("expectant"),
        v.literal("newborn"),
        v.literal("toddler"),
        v.literal("not_a_mother")
      )
    ),
    source: v.string(), // e.g. "registry_coming_soon"
    specifications: v.optional(v.array(v.string())),
    createdAt: v.number(),
    /** Lead-resolution tracking. Undefined = "new". */
    status: v.optional(v.union(v.literal("new"), v.literal("resolved"))),
    resolvedAt: v.optional(v.number()),
    resolvedByStaffId: v.optional(v.id("users")),
  }).index("by_user", ["userId"]).index("by_email", ["email"]),

  storeRequests: defineTable({
    userId: v.optional(v.id("users")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    // Matches products.stage, not registryNotifySignups' 4-value enum.
    stage: v.optional(
      v.union(v.literal("mother"), v.literal("newborn"), v.literal("kid"))
    ),
    itemDescription: v.optional(v.string()),
    createdAt: v.number(),
    /** Lead-resolution tracking. Undefined = "new". */
    status: v.optional(v.union(v.literal("new"), v.literal("resolved"))),
    resolvedAt: v.optional(v.number()),
    resolvedByStaffId: v.optional(v.id("users")),
  }).index("by_user", ["userId"]).index("by_email", ["email"]),

  referralSources: defineTable({
    userId: v.optional(v.id("users")),
    orderId: v.optional(v.id("orders")),
    source: v.union(
      v.literal("tiktok"),
      v.literal("instagram"),
      v.literal("friend"),
      v.literal("google"),
      v.literal("chatgpt"),
      v.literal("other")
    ),
    otherDetail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_order", ["orderId"]),

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
        email: v.optional(v.string()),
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

  registryContributionPayments: defineTable({
    registryId: v.id("registries"),
    /** Real product id (as a string) or the literal "virtual-packaging" */
    productId: v.string(),
    contributorName: v.string(),
    contributorEmail: v.string(),
    contributorPhone: v.string(),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    pesapalTrackingId: v.optional(v.string()),
    pesapalMerchantReference: v.optional(v.string()),
    pesapalRedirectUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_registry", ["registryId"]),

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
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    // Fee-calculation fields (optional so existing rows remain valid; see convex/delivery.ts)
    keywords: v.optional(v.array(v.string())),
    baseDistanceKm: v.optional(v.number()),
    baseFee: v.optional(v.number()),
    minFee: v.optional(v.number()),
    maxFee: v.optional(v.number()),
  }).index("by_name", ["name"]),

  deliveryLandmarks: defineTable({
    name: v.string(),
    sub: v.string(),
    zone: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  }),

  // ─── Customer Personalisation & Automation ──────────────────────────────

  subscriptions: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("cancelled")),
    nextRefillDate: v.number(), // Unix timestamp (ms)
    reminderTriggered: v.boolean(),
    lastPurchaseDate: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_nextRefill", ["nextRefillDate", "reminderTriggered"]),

  searchHistory: defineTable({
    userId: v.id("users"),
    query: v.string(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  supportTickets: defineTable({
    userId: v.id("users"),
    category: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  referrals: defineTable({
    referrerId: v.id("users"),
    refereeId: v.id("users"),
    rewardStatus: v.union(v.literal("pending"), v.literal("issued"), v.literal("redeemed")),
    createdAt: v.number(),
  }).index("by_referrer", ["referrerId"]),

  npsScores: defineTable({
    userId: v.id("users"),
    score: v.number(), // 0 to 10
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  surveyResponses: defineTable({
    userId: v.id("users"),
    surveyId: v.string(),
    answers: v.array(v.object({ questionId: v.string(), answer: v.string() })),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  cartAbandoned: defineTable({
    userId: v.id("users"),
    cartItems: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        size: v.optional(v.string()),
      })
    ),
    abandonedAt: v.number(),
    recovered: v.boolean(),
  }).index("by_user", ["userId"]),

  loyaltyTransactions: defineTable({
    userId: v.id("users"),
    points: v.number(),
    type: v.union(v.literal("earned"), v.literal("redeemed"), v.literal("adjusted")),
    description: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  refunds: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
  }).index("by_order", ["orderId"]),

  productRelations: defineTable({
    productId: v.id("products"),
    relatedProductId: v.id("products"),
    type: v.union(v.literal("frequently_bought_together"), v.literal("related_categories")),
    score: v.number(), // Co-occurrence metric
  })
    .index("by_product", ["productId"])
    .index("by_type_score", ["type", "score"]),

  staffSessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"])
    .index("by_userId", ["userId"]),

  returns: defineTable({
    orderId: v.id("orders"),
    // Legacy embedded shape — no longer written by submitReturn; kept optional so old
    // rows still validate. New code treats `returnItems` as the source of truth.
    returnedItems: v.optional(
      v.array(
        v.object({
          productId: v.id("products"),
          name: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
        })
      )
    ),
    refundAmount: v.number(),
    note: v.optional(v.string()),
    staffId: v.id("users"),
    staffName: v.string(),
    createdAt: v.number(),

    // Exchange fields — populated by submitExchange, undefined for legacy rows.
    exchangeTotal: v.optional(v.number()),
    returnedTotal: v.optional(v.number()),
    topUpAmount: v.optional(v.number()),
    topUpMethod: v.optional(
      v.union(v.literal("physical"), v.literal("momo"), v.literal("card"))
    ),
    topUpMomoPhone: v.optional(v.string()),
    topUpCardOrderId: v.optional(v.string()),
  }).index("by_order", ["orderId"])
    .index("by_createdAt", ["createdAt"]),

  returnItems: defineTable({
    returnId: v.id("returns"),
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    reason: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    source: v.union(v.literal("manual_return"), v.literal("delivery_failure")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    /** Whether the item was restocked to the shelf when approved. Undefined for legacy rows. */
    restocked: v.optional(v.boolean()),
    rejectedReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_return", ["returnId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"]),

  /** Products given to the customer in exchange for a return — see returns.submitExchange. */
  returnExchangeItems: defineTable({
    returnId: v.id("returns"),
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    createdAt: v.number(),
  })
    .index("by_return", ["returnId"])
    .index("by_order", ["orderId"]),

  customerActivities: defineTable({
    customerId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    type: v.union(v.literal("note"), v.literal("call"), v.literal("meeting"), v.literal("email"), v.literal("other")),
    note: v.string(),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("cancelled")),
    staffId: v.id("users"),
    staffName: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    /** Old-DB _id from the pre-launch Convex project; used for idempotent re-imports. */
    preLaunchId: v.optional(v.string()),
    /** "pre_launch" when this row was imported from the pre-launch site. */
    importSource: v.optional(v.string()),
  }).index("by_customerId", ["customerId"])
    .index("by_scheduledDate", ["scheduledDate"])
    .index("by_status", ["status"])
    .index("by_orderId", ["orderId"])
    .index("by_preLaunchId", ["preLaunchId"]),

  giftVouchers: defineTable({
    code: v.string(),
    originalAmount: v.number(),
    remainingBalance: v.number(),
    expiresAt: v.number(),
    status: v.union(v.literal("active"), v.literal("depleted"), v.literal("expired"), v.literal("cancelled")),
    issuedOrderId: v.id("orders"),
    recipientName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    purchaserUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    createdByStaffId: v.id("users"),
  })
    .index("by_code", ["code"])
    .index("by_issuedOrderId", ["issuedOrderId"]),

  voucherRedemptions: defineTable({
    voucherId: v.id("giftVouchers"),
    orderId: v.id("orders"),
    amount: v.number(),
    balanceAfter: v.number(),
    redeemedAt: v.number(),
    staffId: v.id("users"),
  })
    .index("by_voucher", ["voucherId"])
    .index("by_order", ["orderId"]),

  orderPayments: defineTable({
    orderId: v.id("orders"),
    method: v.union(v.literal("physical"), v.literal("momo"), v.literal("card"), v.literal("voucher")),
    amount: v.number(),
    momoPhone: v.optional(v.string()),
    cardOrderId: v.optional(v.string()),
    voucherId: v.optional(v.id("giftVouchers")),
    voucherCode: v.optional(v.string()),
  })
    .index("by_order", ["orderId"]),

  /**
   * errorLogs — client-reported errors (render crashes, unhandled rejections)
   * from the admin/staff app. Rows are de-duplicated by fingerprint (same
   * error within 24h increments occurrenceCount instead of inserting a new
   * row) and the table is kept bounded by pruning the oldest rows past a
   * fixed cap on every new-fingerprint insert — see convex/errorLogs.ts.
   */
  errorLogs: defineTable({
    fingerprint: v.string(),
    message: v.string(),
    details: v.optional(v.string()),
    suggestion: v.optional(v.string()),
    source: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    accountRole: v.optional(v.string()),
    occurrenceCount: v.number(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_fingerprint", ["fingerprint"])
    .index("by_lastSeenAt", ["lastSeenAt"]),

  /**
   * dbIOCounters — per (functionName, day) denormalized read-count counters
   * powering the admin DB I/O baseline dashboard. Kept in sync incrementally
   * (get-or-init then patch, same idiom as stockCounters) by
   * convex/lib/ioTracking.ts's bumpIOCounters — never scanned/recomputed from
   * raw per-call logs.
   */
  dbIOCounters: defineTable({
    functionName: v.string(),
    day: v.string(), // "YYYY-MM-DD", server-local
    reads: v.number(),
    invocations: v.number(),
  })
    .index("by_functionName_and_day", ["functionName", "day"])
    .index("by_day", ["day"]),

  /**
   * dbIOAllTimeCounters — one row per functionName, running total across all
   * days. Updated in the same write as dbIOCounters so the admin dashboard's
   * "cumulative" figure is always an O(#functions) read, never a scan across
   * historical days.
   */
  dbIOAllTimeCounters: defineTable({
    functionName: v.string(),
    reads: v.number(),
    invocations: v.number(),
  }).index("by_functionName", ["functionName"]),
});


