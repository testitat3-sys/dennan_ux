# Data Sourcing Guide — Denan Kids Personalisation & Automation

## Purpose

This document maps every data point from the `CUSTOMER DATA TYPES FOR BETTER PERSONALISATION.md` inventory against the Convex `schema.ts`. For each point it states whether it's already stored, newly added, derivable at query time, or belongs in an external tool — with the "how to obtain it" explanation.

---

## Legend

| Tag | Meaning |
|---|---|
| ✅ **Stored** | Already defined in `schema.ts` |
| ➕ **Added** | Newly added to `schema.ts` in this update |
| 🔢 **Derived** | Computed from existing stored data — no new storage needed |
| 📊 **External** | Belongs in analytics tool (PostHog, GA4) or email/push provider — not in Convex |
| ❌ **Omitted** | Not recommended for storage at this stage |

---

## 1. CUSTOMER DATA – Identity & Profile

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Customer ID** | ✅ Users.\_id | Convex auto-generated on document creation. |
| **Name** | ✅ users.name | User provides at sign-up or during onboarding. |
| **Email** | ✅ users.email | User provides at sign-up. Indexed for uniqueness. |
| **Phone number** | ➕ users.phone | Renamed from `momoPhone` (which was checkout-specific) to a general `phone` field. User provides during sign-up or profile setup. Can be verified with OTP. |
| **Date joined** | ✅ \_creationTime | Convex system field on every document — no work needed. |
| **Account status** | ➕ users.accountStatus | Enforced at auth gate. Default `"active"`. Set to `"inactive"` after N days without login (cron job). `"suspended"` / `"deleted"` set by admin dashboard. |
| **Preferred contact method** | ➕ users.preferredContact | User selects during onboarding or in account settings. Drives which channel automation uses for reminders (email vs SMS vs WhatsApp vs push). |

---

## 2. CUSTOMER DATA – Demographic & Segmentation

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Date of birth / age** | ➕ users.dob | Optional onboarding field. Enables birthday-offer automation and age-based lifecycle stage calculations. |
| **Gender** | ➕ users.gender | Optional onboarding field. Used to personalise product suggestions where gender-relevant (e.g. apparel). |
| **Location** | ➕ users.city / users.region | Capture city/region during onboarding or checkout. Enables local offers and shipping-time estimates separate from delivery addresses. |
| **Household size** | ➕ users.householdSize | Quick dropdown during onboarding Q&A. Helps recommend bundle sizes, family packs, and consumption-rate defaults. |
| **Income bracket / price sensitivity** | 🔢 users.pricePreference stored; bracket derived from 6m order history | Binary approach: (a) user self-selects `pricePreference` during onboarding (budget/mid/premium); (b) backend cross-checks against AOV trend + discount usage frequency from order data. |

---

## 3. CUSTOMER DATA – Transactional & Purchase

All of these are **derived** from existing `orders` + `orderItems` data. None require new storage.

| Data Point | Derivation |
|---|---|
| **Date of first purchase** | `MIN(orders.createdAt) WHERE orders.userId = X` |
| **Date of most recent purchase** | `MAX(orders.createdAt) WHERE orders.userId = X` |
| **Purchase frequency** | `COUNT(orders) / (days between first and last order) * 30` (monthly rate) |
| **Total number of orders** | `COUNT(orders) WHERE orders.userId = X` |
| **Lifetime spend (LTV)** | `SUM(orders.grandTotal) WHERE orders.userId = X` |
| **Average order value (AOV)** | `SUM(orders.grandTotal) / COUNT(orders)` |
| **Last 10–20 orders** | `orders` query by userId, ORDER BY createdAt DESC, LIMIT N |
| **Products ever purchased** | `DISTINCT orderItems.productId` joined across user's orders |
| **Categories purchased from** | `DISTINCT products.category` joined via orderItems |
| **Brands purchased from** | `DISTINCT products.brand` joined via orderItems |
| **Payment method preference** | Most frequent value of `orders.paymentMethod` per user |
| **Discount/promo code usage** | Count of `orders` where `couponApplied` is not null, per user |
| **Refund/return history** | ➕ New `refunds` table — see Section 11 |

---

## 4. CUSTOMER DATA – Behavioral & Engagement

These are high-volume, high-frequency events. Most belong in an analytics platform, not Convex. We store only the most impactful subset.

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Pages viewed** | 📊 External | Log to PostHoc/GA4 via pageview events. Not stored in Convex — volume too high, value per event too low. |
| **Products viewed** | 📊 + ➕ recentlyViewed | **Primary**: analytics tool. **Optional supplement**: store a capped array `users.recentlyViewed: [productId]` (max 20) on each page view for immediate in-app "recently viewed" widgets. Updated client-side on product detail page load. |
| **Products added to cart (not bought)** | ➕ cartAbandoned table | When cart idle >30 min (or user leaves checkout), snapshot cart contents to `cartAbandoned` table. Powers "You left these behind" email automation. |
| **Products removed from cart** | ❌ Omitted | Too granular for Convex. If needed later, add as event in analytics tool. |
| **Products wishlisted / saved** | ✅ wishlistItems | Already stored. No change needed. |
| **Time spent on site/page** | 📊 External | Analytics tool only. |
| **Search queries** | ➕ searchHistory | Store each user search in `searchHistory` table (capped at 50 per user). Powers search-result personalisation and query-based recommendation signals. |
| **Items clicked in email/push** | 📊 External | Tracked in email provider (Mailchimp, SendGrid, etc.) and push provider (Firebase, OneSignal). |
| **Email open/click rate** | 📊 External | Stored and computed by email provider. |
| **Push notification interaction** | 📊 External | Stored by push provider. |
| **Device type** | 📊 External | Derived from User-Agent. Logged in analytics tool. If needed for push targeting, capture at login and store in a session table. |
| **Browser / OS** | 📊 External | Same as above. |
| **Connection speed** | ❌ Omitted | Too volatile, low value for Convex storage. |

---

## 5. CUSTOMER DATA – Preference & Zero-Party

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Preferred categories** | ➕ users.preferredCategories | Replaced generic `users.interests` with explicit category-IDs array. Collected via onboarding Q&A ("What are you shopping for today?"). |
| **Preferred brands** | ➕ users.preferredBrands | Array of brand IDs. User picks favourite brands during onboarding. Used for personalised brand shelves. |
| **Product preferences (size, color)** | ➕ users.sizePrefs / users.colorPrefs | User sets default sizes and colours during profile setup. Auto-applied on product pages. |
| **Allergies / sensitivities** | ➕ users.allergies | Critical for baby/parenting store. User enters during onboarding. Used to filter out unsafe product recommendations and flag on product pages. |
| **Communication preferences** | ➕ users.communicationPrefs | "all" \| "promotions_only" \| "order_updates_only". User selects at sign-up. Automation engine checks this before sending any non-transactional message. |
| **Subscription preferences** | ➕ subscriptions table | Separate table with per-product subscription config (frequency, status, next delivery). Core to the refill automation vision. |
| **Price preference** | ➕ users.pricePreference | "budget" \| "mid-range" \| "premium". Self-reported during onboarding. Product suggestions filtered to match. |
| **Shopping style** | 🔢 Derived | Computed from behaviour: `impulsive` = short time-to-purchase (<5 min browsing before first order), `careful_comparer` = many product views + returns, `loyal_repeat` = >3 repeat purchases. Computed via periodic batch function. |
| **Feedback / survey responses** | ➕ surveyResponses table | Store surveyId + answers per user. Separate from NPS for data isolation. |
| **NPS (Net Promoter Score)** | ➕ npsScores table | Score 0–10 + optional comment + date. Sent as post-purchase or periodic survey. |

---

## 6. CUSTOMER DATA – Loyalty & Relationship

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Loyalty tier** | ➕ users.loyaltyTier | Computed periodically (cron: daily) based on LTV or order count. Tiers: bronze → silver → gold → platinum with threshold config. |
| **Loyalty points balance** | ➕ users.loyaltyPoints + loyaltyTransactions table | Points earned on every purchase (e.g. 1 point per 1,000 UGX). Spent on discounts. Transaction log ensures audit trail. |
| **Referral count** | ➕ referrals table | `referrerId → refereeId` mapping with reward status. Referral link generated at account level; code applied at checkout or sign-up. |
| **Customer support tickets** | ➕ supportTickets table | Ticket created via in-app "Contact us" or WhatsApp. Linked to user ID. Category + status tracked. Used for churn flagging. |
| **Churn risk score** | 🔢 Computed | Batch function runs nightly: logistic regression (recency_days, frequency, return_count, ticket_count, nps). Score 0–1 stored as `users.churnRisk`. |
| **Engagement score** | 🔢 Computed | Composite: last_visit_days, email_click_rate, purchase_frequency, wishlist_active. Stored as `users.engagementScore`. |

---

## 7. PRODUCT DATA – Basic Info & Attributes

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Product ID** | ✅ products.\_id | Convex auto-generated. |
| **Name, Description, Brand, SKU, Barcode** | ✅ Already in products | Admin catalogue entry. |
| **Category, SubCategory** | ✅ products.category (union), subCategory | Admin selects from predefined list. |
| **Cost price** | ➕ products.costPrice | Admin-only field. Hidden from storefront. Enables margin analysis and profitability-based recommendation tuning. |
| **Stock status** | 🔢 Derived | `inventory > 0 ? "in_stock" : "out_of_stock"`; add `"low_stock"` when inventory <= `reorderPoint`. Computed in queries. |
| **Reorder point** | ➕ products.reorderPoint | Admin sets threshold. When inventory drops below, trigger internal restock alert — and optionally a customer refill reminder. |
| **Product type** | ➕ products.productType | "physical" \| "digital" \| "service". Differentiates flows: physical needs shipping, digital can be emailed, service needs scheduling. |
| **Allergens** | ➕ products.allergens | Array of strings. Cross-referenced with `users.allergies` at recommendation time to exclude unsafe items. |
| **Usage instructions** | ➕ products.usageInstructions | Text field. Could be shown post-purchase or in refill reminders as usage tips. |
| **Expiry / best-by date** | ➕ products.expiryDate + shelfLifeDays | expiryDate: fixed date (e.g. for perishables). shelfLifeDays: integer (e.g. 365 for formula). Used in refill timing: if shelfLifeDays != refillPeriodDays, the shorter wins for the alert. |
| **Profit margin** | 🔢 Derived | `(price - costPrice) / price * 100`. Computed, not stored. |

---

## 8. PRODUCT DATA – Refill & Consumption

This is the core new capability for your "automation triggers automatically" vision.

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Refill period (days)** | ➕ products.refillPeriodDays | Admin sets per product. E.g. diapers = 20 days, baby wipes = 30 days, formula = 14 days. The primary field for refill timing. |
| **Units per use / consumption rate** | ➕ products.unitsPerUse | E.g. "1 tablet/day" for supplements. Combined with `refillPeriodDays` to estimate exact run-out date. |
| **Recommended frequency** | ➕ products.recommendedFrequency | "daily" \| "weekly" \| "monthly". Used as default when subscription is created. |
| **Avg days until reorder (per customer)** | 🔢 Derived | Compute per (userId, productId) from purchase intervals. Used to personalise the refill period per customer if product default doesn't fit. |
| **Last purchase date (per customer–product)** | 🔢 Derived | `MAX(orders.createdAt)` for each user+product combo. No new storage needed. |
| **Next expected refill date** | ➕ subscriptions.nextRefillDate | Computed: `lastPurchaseDate + products.refillPeriodDays - reminderLeadDays`. Stored on the subscription row for efficient cron queries. |
| **Subscription status** | ➕ subscriptions.status | "active" \| "paused" \| "cancelled". Powers the subscription/refill flow UI. |

### Refill Automation Data Flow (from the original doc)

```
1. Purchase happens → store lastPurchaseDate on subscription row
2. Compute nextRefillDate = lastPurchaseDate + refillPeriodDays - reminderLeadDays
3. Daily cron: find subscriptions where nextRefillDate = today AND reminderTriggered = false
4. Send reminder (email/SMS/WhatsApp based on users.preferredContact)
5. Mark reminderTriggered = true
6. If no repurchase by nextRefillDate + refillPeriodDays → escalate (stronger message, alternative suggestions)
```

---

## 9. PRODUCT DATA – Performance & Engagement

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Total units sold** | ✅ products.unitsSold | Already stored, incremented on each order. |
| **Revenue per product** | 🔢 Derived | `SUM(orderItems.unitPrice * orderItems.quantity)` GROUP BY productId. |
| **Return rate** | 🔢 Derived | `COUNT(refunds) / COUNT(orderItems)` per product. Requires the new `refunds` table. |
| **Average rating** | 🔢 Derived | `AVG(productReviews.rating)` GROUP BY productId. |
| **Number of reviews** | 🔢 Derived | `COUNT(productReviews)` GROUP BY productId. |
| **Conversion rate** | 🔢 Derived | `(purchases_of_product / views_of_product)`. Views need analytics or `recentlyViewed` table. |
| **View-to-buy ratio** | 🔢 Derived | Same as conversion rate, more explicit name. |
| **Frequently bought together** | 🔢 Computed (batch) | Market-basket analysis on `orderItems`. Run as periodic Python batch job (not real-time). Store results in a `productRelations` table or serve from a cached report. |
| **Related products** | 🔢 Computed (batch) | Collaborative filtering or category-co-occurrence from order data. Same batch approach as above. |

---

## 10. DATE/TIME & DERIVED FIELDS

| Data Point | Status | Sourcing Explanation |
|---|---|---|
| **Days since last purchase** | 🔢 Derived | `(now - MAX(orders.createdAt)) in days`. Used in RFM scoring. |
| **Days since last interaction** | 🔢 Derived | `(now - lastLogin or MAX(pageView) or MAX(order))`. Which "interaction" depends on business rule. |
| **Next expected purchase date** | 🔢 Derived | Computed per user: average purchase interval + last purchase date. No storage. |
| **Refill reminder date** | ➕ subscriptions.nextRefillDate | Stored on subscription row (see Section 8). |
| **Reminder lead time** | ➕ products.refillReminderLeadDays | e.g. remind 3 days before expected run-out. Admin-configurable per product, falls back to a global default (3). |
| **Run-out date** | 🔢 Derived | `lastPurchaseDate + refillPeriodDays`. Used in messaging: "You'll run out on [date]". |
| **Purchase interval (average)** | 🔢 Derived | `AVG(days_between_consecutive_orders)` per user. Personalises refill timing. |
| **Days since account inactivity** | 🔢 Derived | `(now - users.lastSeen) in days`. Used for win-back automation trigger. |

---

## 11. New Tables Added to schema.ts

| Table | Purpose |
|---|---|
| **refunds** | Track product returns: orderId, productId, reason, date, status. Enables return-rate calculation and dissatisfaction detection. |
| **subscriptions** | Per-user per-product subscription: frequency, status, nextRefillDate, reminderTriggered. Core to refill automation. |
| **searchHistory** | Search queries per user with timestamp. Powers query-based recommendations and search result personalisation. |
| **supportTickets** | Customer support interactions per user. Links to churn-risk computation. |
| **referrals** | Referrer → referee mapping. Enables loyalty program tracking. |
| **npsScores** | NPS survey responses per user. Used for promoter/detractor segmentation. |
| **surveyResponses** | General survey responses (separate from NPS). Flexible key-value answers. |
| **cartAbandoned** | Snapshot of cart when user leaves items idle. Powers cart-abandonment email/SMS automation. |
| **loyaltyTransactions** | Points earned/spent ledger. Ensures audit trail for loyalty points. |
| **productRelations** | (Optional) Pre-computed "frequently bought together" and "related products" pairs from batch analysis. |

---

## 12. New Fields on Existing Tables

### users (added fields)

```typescript
phone: v.optional(v.string()),
accountStatus: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"), v.literal("deleted"))),
preferredContact: v.optional(v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"), v.literal("push"))),
dob: v.optional(v.string()),
gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("non-binary"), v.literal("prefer_not_to_say"))),
city: v.optional(v.string()),
region: v.optional(v.string()),
householdSize: v.optional(v.number()),
pricePreference: v.optional(v.union(v.literal("budget"), v.literal("mid-range"), v.literal("premium"))),
preferredCategories: v.optional(v.array(v.id("categories"))),
preferredBrands: v.optional(v.array(v.id("brands"))),
sizePrefs: v.optional(v.string()),
colorPrefs: v.optional(v.string()),
allergies: v.optional(v.array(v.string())),
communicationPrefs: v.optional(v.union(v.literal("all"), v.literal("promotions_only"), v.literal("order_updates_only"))),
loyaltyTier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum"))),
loyaltyPoints: v.optional(v.number()),
shoppingStyle: v.optional(v.union(v.literal("impulsive"), v.literal("careful_comparer"), v.literal("loyal_repeat"))),
churnRisk: v.optional(v.number()),
engagementScore: v.optional(v.number()),
lastSeen: v.optional(v.number()),
```

> Note: `lastSeen` already existed in the original schema — kept in the list above for completeness.

### products (added fields)

```typescript
costPrice: v.optional(v.number()),
reorderPoint: v.optional(v.number()),
allergens: v.optional(v.array(v.string())),
usageInstructions: v.optional(v.string()),
expiryDate: v.optional(v.string()),
shelfLifeDays: v.optional(v.number()),
refillPeriodDays: v.optional(v.number()),
unitsPerUse: v.optional(v.number()),
recommendedFrequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
productType: v.optional(v.union(v.literal("physical"), v.literal("digital"), v.literal("service"))),
refillReminderLeadDays: v.optional(v.number()),
```

---

## 13. What Belongs Outside Convex (External Tools)

| Domain | Tool / Storage |
|---|---|
| Page views, time on site, clickstream | PostHog or GA4 |
| Email open/click rates | Email provider dashboard (Mailchimp, SendGrid, Resend) |
| Push notification analytics | Firebase Cloud Messaging / OneSignal |
| Device type, browser, OS | Captured in analytics tool via User-Agent |
| Connection speed | Not recommended for storage at any layer |
| Frequently bought together (raw computation) | Python batch job outside Convex; results cached in `productRelations` table |

---

## 14. Implementation Priority Tiers

### Tier 1 — Now (schema.ts changes this PR)
- All new `users` fields (profile enrichment)
- All new `products` fields (cost price, refill, allergens)
- `subscriptions` table (refill automation)
- `refunds` table (return tracking)
- `searchHistory` table (query storage)
- `cartAbandoned` table (abandonment automation)

### Tier 2 — Next sprint
- `loyaltyTransactions` table + points system
- `referrals` table
- `supportTickets` table

### Tier 3 — Within a month
- `npsScores` + `surveyResponses` tables
- `productRelations` table (batch ML pipeline)
- Churn risk / engagement score computation (cron job)
- Shopping style derivation (cron job)

---

*Generated from comparison of CUSTOMER DATA TYPES FOR BETTER PERSONALISATION.md vs schema.ts on 2026-06-01.*