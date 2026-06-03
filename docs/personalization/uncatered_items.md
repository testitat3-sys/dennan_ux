# Personalization & Logistics Audit: Uncatered Database Items

This document serves as the official registry of database tables, personalization fields, and catalog attributes defined in `convex/schema.ts` that currently remain **dormant** (i.e. have no associated mutations, background automated pipelines, back-office forms, or front-end interface integrations).

---

## 1. 🗂️ Dormant Customer Engagement Tables

These tables are structurally modeled in the Convex schema but are not yet written to, read from, or integrated into customer experiences:

| Table Name | Purpose / Designed Functionality | Status / Next Developmental Phase |
| :--- | :--- | :--- |
| **`subscriptions`** | Manages auto-refill schedules for repeat items (e.g. diapers or formula). | **Dormant**. Requires front-end checkout triggers to activate a subscription and a cron scheduler to compute delivery cycles. |
| **`searchHistory`** | Tracks user search query strings with timestamps. | **Dormant**. Requires search inputs to record queries. Essential to fuel search auto-complete and product interest matrices. |
| **`supportTickets`** | Tracks filed tickets, category routing, and resolution status (`open`, `in_progress`, `resolved`). | **Dormant**. Requires help-center user forms and support coordinator admin management dashboard gates. |
| **`referrals`** | Maps referrer to referee profiles with promotional reward loops. | **Dormant**. Requires referral link generation at the profile tier and payment rewards logic applied during checkout coupon checks. |
| **`npsScores`** | Collects Net Promoter Score reviews (0-10) with text comments. | **Dormant**. Requires triggering post-checkout review overlays to gather direct user feedback. |
| **`surveyResponses`** | Stores complete onboarding survey questionnaire answers. | **Dormant**. Onboarding choices currently update profile role and children matrices directly, bypassing generic question tables. |
| **`cartAbandoned`** | Logs active shopping cart configurations when a session exits. | **Dormant**. Requires session exit-intent triggers to back up carts for transactional follow-up marketing. |
| **`refunds`** | Manages cancellation and returns tracking (`pending`, `approved`, `rejected`). | **Dormant**. Requires customer cancellation options and backend refund approval triggers. |
| **`productRelations`** | Calculates item affinity scoring (e.g. frequently bought together). | **Dormant**. Requires an automated transaction scanning cron to pre-compute item co-occurrences. |

---

## 2. 👤 Dormant Personalization Fields (`users` Table)

These customer attributes are defined but are not computed by backend calculations or supported by inputs:

| Field Name | Type | Intended Behavioral Calculation / Source |
| :--- | :--- | :--- |
| **`phone`** | `v.optional(v.string())` | Sourced in specs but unused; the application exclusively manages and hydrates Ugandan phone formats using `momoPhone`. |
| **`accountStatus`** | `v.optional(v.union(...))` | Backfilled to `"active"` via migrations. Lacks security suspension systems or automated cron inactivation triggers. |
| **`allergies`** | `v.optional(v.array(v.string()))` | Planned to catalog user dietary sensitivity tags. Lacks profile input controls or checkout warning flags. |
| **`communicationPrefs`** | `v.optional(v.union(...))` | Backfilled to `"all"`. Currently sits dormant; does not have notification depth controllers (`all` vs `promotions_only` vs `order_updates_only`). |
| **`shoppingStyle`** | `v.optional(v.union(...))` | Designed to store parsed buyer characteristics (`impulsive`, `careful_comparer`, `loyal_repeat`) based on discount ratios and checkout delays. |
| **`churnRisk`** | `v.optional(v.number())` | Designed as a predictive attrition metric [0.0 - 1.0] computed by order frequency decay, session recency, and support tickets. |
| **`engagementScore`** | `v.optional(v.number())` | Designed as an interactive customer metric [0 - 100] calculated from session frequency, active wishlists, and order depth. |
| **`recentlyViewed`** | `v.optional(v.array(v.id("products")))` | Planned to hold a capped history of 20 product IDs for detail page widgets. Lacks view logging hooks on PDP load. |

---

## 3. 📦 Dormant Catalog & Refill Fields (`products` Table)

These catalog metadata fields are seeded or backfilled in the database but have no functional impact on shopping or logistics logic:

| Field Name | Type | Intended Logistics / Automation Role |
| :--- | :--- | :--- |
| **`weightGrams`** | `v.optional(v.number())` | Populated in seeds, but ignored during shipping calculations and dispatch metrics. |
| **`dimensions`** | `v.optional(v.object(...))` | Populated in seeds, but never rendered on PDP specification shelves or used to determine package limits. |
| **`costPrice`** | `v.optional(v.number())` | Backfilled to $60\%$ of retail price in migrations. Dormant; not referenced by business profit margin analyses. |
| **`reorderPoint`** | `v.optional(v.number())` | Backfilled to `5`. Lacks automated warnings when inventory reaches low-stock thresholds. |
| **`allergens`** | `v.optional(v.array(v.string()))` | Intended to flag sensitive materials (lactose, nuts). Never matched against user allergy profiles to filter suggestions. |
| **`usageInstructions`** | `v.optional(v.string())` | Dormant; never rendered on PDP guides or checkout confirmation summaries. |
| **`expiryDate`** | `v.optional(v.string())` | Planned to track shelf-freshness batch dates for formulas or lotions. Currently unutilized. |
| **`shelfLifeDays`** | `v.optional(v.number())` | Intended to set replacement intervals for perishable goods. Currently unreferenced. |
| **`refillPeriodDays`** | `v.optional(v.number())` | Designed to govern diaper/wipes replenishment cycles. Lacks active automated notification workers. |
| **`unitsPerUse`** | `v.optional(v.number())` | Designed to compute exact run-out dates based on consumption velocity. Currently dormant. |
| **`recommendedFrequency`** | `v.optional(v.union(...))` | Planned to recommend replenishment rates (`daily`, `weekly`, `monthly`) when starting a subscription. |
| **`productType`** | `v.optional(v.union(...))` | Backfilled to `"physical"`. Lacks routing parameters for digital downloads or scheduled home services. |
| **`refillReminderLeadDays`** | `v.optional(v.number())` | Backfilled to `3`. Planned to set lead timing warning flags prior to customer product depletion. |
