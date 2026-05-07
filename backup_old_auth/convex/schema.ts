import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    onboardingComplete: v.optional(v.boolean()),
    emailVerificationTime: v.optional(v.number()),
  }).index("email", ["email"]),
  
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
  brands: defineTable({
    name: v.string(),
    id: v.string(),
    logo: v.string(),
    discount: v.string(),
  }),
  products: defineTable({
    name: v.string(),
    brand: v.string(),
    price: v.string(),
    wasPrice: v.optional(v.string()),
    image: v.string(),
    tier: v.string(),
    stage: v.string(),
    isCurated: v.optional(v.boolean()),
    isMostLoved: v.optional(v.boolean()),
    minMonth: v.optional(v.number()),
    maxMonth: v.optional(v.number()),
    minWeek: v.optional(v.number()),
    maxWeek: v.optional(v.number()),
    category: v.string(),
    tags: v.array(
      v.object({
        type: v.string(),
        text: v.string(),
      })
    ),
    description: v.string(),
    specifications: v.array(
      v.object({
        label: v.string(),
        value: v.string(),
      })
    ),
    reviews: v.array(
      v.object({
        author: v.string(),
        rating: v.number(),
        childAge: v.string(),
        text: v.string(),
      })
    ),
    ageScale: v.object({
      current: v.number(),
      label: v.string(),
    }),
  }),
  stages: defineTable({
    type: v.string(),
    title: v.string(),
    eyebrow: v.string(),
    copy: v.string(),
    image: v.string(),
    href: v.string(),
  }),
  tiers: defineTable({
    type: v.string(),
    title: v.string(),
    badge: v.string(),
    copy: v.string(),
    image: v.string(),
    href: v.string(),
  }),
  reels: defineTable({
    image: v.string(),
    label: v.string(),
    caption: v.string(),
    badge: v.optional(v.string()),
    multiChip: v.optional(v.string()),
    products: v.array(
      v.object({
        name: v.optional(v.string()),
        title: v.optional(v.string()),
        price: v.string(),
        image: v.optional(v.string()),
        options: v.optional(v.string()),
      })
    ),
  }),
  trustItems: defineTable({
    icon: v.string(),
    type: v.string(),
    title: v.string(),
    sub: v.string(),
  }),
  auth_links: defineTable({
    email: v.string(),
    url: v.string(),
    expires: v.number(),
  }).index("by_email", ["email"]),
});

