# 🧭 Dennan Kids — Page & Route Directory

This document details the complete mapping of all registered routes, files, backend models, and features inside the Dennan Kids web application.

---

## 🗺️ Route Map & Status

Below is the complete list of routes configured in [App.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/App.jsx):

| Route Path | React Component File | Backend Data Sources (Convex) | Status | Key Features |
| :--- | :--- | :--- | :--- | :--- |
| `/` | [Home.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/Home.jsx) | `products`, `stages`, `tiers`, `reels`, `hero`, `trustItems` | ✅ Active | **The Stage & Discovery Engine**: personalized motherhood/newborn curation, video reels, and product highlights. |
| `/auth` | [AuthPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/AuthPage.jsx) | `users` (via Auth Provider) | ✅ Active | **Minimalist Sign-In / Sign-Up**: secure authentication entry. |
| `/after-signin` | [AfterSignIn.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/AfterSignIn.jsx) | `users` | ✅ Active | **Verification Redirector**: guides registered/new users appropriately. |
| `/onboarding` | [OnboardingPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/OnboardingPage.jsx) | `users` | ✅ Active | **User Profile Wizard**: captures child DOB or mother's due date to power personalized curation. |
| `/profile` | [ProfilePage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ProfilePage.jsx) | `users` | ✅ Active | **Account Management**: updates contact info, delivery addresses, and preferences. |
| `/dashboard` | [Dashboard.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/Dashboard.jsx) | `users`, `dashboardMilestones`, `dashboardBadges`, `dashboardChecklists`, `dashboardEditorial` | ✅ Active | **"Growing with You" Hub**: interactive milestones, unlocked badges, checklist progress, and personalized recommendations. |
| `/category/:stageId` | [PLP.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/PLP.jsx) | `products`, `stages` | ✅ Active | **Product Listings**: filterable products based on maternal/infant stages. |
| `/collection/:collectionId` | [PLP.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/PLP.jsx) | `products`, `collections` | ✅ Active | **Curated Collections**: groups of items like "Sleep Sanctuary" or "Most Loved". |
| `/brand/:brandId` | [BrandPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/BrandPage.jsx) | `products`, `brands` | ✅ Active | **Brand Catalog & Stories**: specific brand landing pages with brand mission, videos, and certificates. |
| `/product/:productId` | [PDP.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/PDP.jsx) | `products`, `productReviews` | ✅ Active | **Product Details**: includes age appropriateness ratings, specifications, customer reviews, and a real-time delivery timer. |
| `/registry` | [RegistryPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/RegistryPage.jsx) | `registries`, `registryItems`, `products` | ✅ Active | **Gifting Registry Landing**: create or edit baby registries with group funding options. |
| `/registry/:registryId` | [RegistryPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/RegistryPage.jsx) | `registries`, `registryItems` | ✅ Active | **Public Registry Viewer**: allows family and friends to purchase and contribute to gifts. |
| `/wishlist` | [WishlistPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/WishlistPage.jsx) | `wishlistItems`, `products` | ✅ Active | **My Bookmarked Items**: saved products with back-in-stock alerts. |
| `/checkout` | [CheckoutPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/CheckoutPage.jsx) | `cartItems`, `orders`, `orderItems`, `coupons`, `deliveryZones`, `deliveryLandmarks` | ✅ Active | **3-Step Checkout Flow**: shipping addresses, payment method options, and delivery timeline progress trackers. |
| `/admin` | [AdminDashboard.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/AdminDashboard.jsx) | Admin-level operations | ✅ Active | **Operational Tools**: developer and admin dashboard for mock data overrides and operations. |
| `/design-system` | [DesignSystemPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/DesignSystemPage.jsx) | None (Static) | 🎨 Dev-Only | **UI Sandbox**: interactive component documentation for typography, colors, forms, cards, etc. |
| `/about` | [ComingSoonPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ComingSoonPage.jsx) | None | ⏳ Placeholder | Brand history, company profile, and core values. |
| `/safety` | [ComingSoonPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ComingSoonPage.jsx) | None | ⏳ Placeholder | Standards, baby product safety guides, and certification processes. |
| `/support` | [ComingSoonPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ComingSoonPage.jsx) | None | ⏳ Placeholder | Live chat, contact, and ticket submission forms. |
| `/faq` | [ComingSoonPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ComingSoonPage.jsx) | None | ⏳ Placeholder | Answers to customer shipping, returns, and ordering questions. |
| `/wholesale` | [ComingSoonPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ComingSoonPage.jsx) | None | ⏳ Placeholder | Inquiry forms for bulk merchant accounts and retail partners. |
| `/brands` | [ComingSoonPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/ComingSoonPage.jsx) | `brands` | ⏳ Placeholder | Brand Directory Hub cataloging premium providers by curated themes/vibe. |
| `*` (Catch-All) | [NotFoundPage.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/NotFoundPage.jsx) | None | ✅ Active | **Custom 404 Error View**: elegant error page to direct users back home. |

---

## 📂 Codebase File Layout

The physical page components live in [src/pages/](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/pages/):

```bash
src/pages/
├── AdminDashboard.jsx       # Operational Tools (/admin)
├── AfterSignIn.jsx          # Redirect and post-login check (/after-signin)
├── AuthPage.jsx             # Credentials and verification entry (/auth)
├── BrandPage.jsx            # Dynamic brand story and list (/brand/:brandId)
├── CheckoutPage.jsx         # 3-step checkout panel (/checkout)
├── ComingSoonPage.jsx       # Placeholder for about, safety, support, faq, wholesale, brands
├── Dashboard.jsx            # User personalized stats and growth tracking (/dashboard)
├── DesignSystemPage.jsx     # Global styling variables list (/design-system)
├── Home.jsx                 # Dynamic multi-tier homepage layout (/)
├── NotFoundPage.jsx         # Fallback view (*)
├── OnboardingPage.jsx       # Dynamic questions stepper (/onboarding)
├── PDP.jsx                  # Single product information display (/product/:productId)
├── PLP.jsx                  # Catalog filtering lists (/category/:stageId, /collection/:collectionId)
├── ProfilePage.jsx          # Personal user profile data form (/profile)
├── RegistryPage.jsx         # Curated list gifting coordinator (/registry, /registry/:registryId)
└── WishlistPage.jsx         # Personal list bookmark folder (/wishlist)
```

### 🧱 Supporting Global Interactive Elements
- **Predictive Search Header**: Universal search bar displaying matching results live.
- **Micro-Animated Cart Drawer**: Sliding context bar handling totals, checkout triggers, and promo checks.
- **Quick View Modal overlay**: Intercepts products on PLPs for fast customization.

*Last Updated: May 11, 2026*
