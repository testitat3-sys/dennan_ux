# Dennan UX - Pages and Modals Directory

This document provides a comprehensive list of all pages and modals currently implemented in the Dennan UX project.

## Pages

All routes are defined in `src/App.jsx`.

| Page Name | Route Path | Component File | Description |
| :--- | :--- | :--- | :--- |
| **Home** | `/` | `src/pages/Home.jsx` | Landing page with featured products and stages. |
| **Auth** | `/auth` | `src/pages/AuthPage.jsx` | Authentication page (Login/Sign Up). |
| **After Sign In** | `/after-signin` | `src/pages/AfterSignIn.jsx` | Redirect target after successful authentication. |
| **Onboarding** | `/onboarding` | `src/pages/OnboardingPage.jsx` | User onboarding flow. |
| **Profile** | `/profile` | `src/pages/ProfilePage.jsx` | User profile and address management (Protected). |
| **Dashboard** | `/dashboard` | `src/pages/Dashboard.jsx` | User account dashboard (Protected). |
| **Admin Dashboard** | `/admin` | `src/pages/AdminDashboard.jsx` | Administrative control panel. |
| **Product Listing (PLP)** | `/category/:stageId` | `src/pages/PLP.jsx` | Category-based product listing. |
| **Product Listing (PLP)** | `/collection/:collectionId` | `src/pages/PLP.jsx` | Collection-based product listing. |
| **Brand Page** | `/brand/:brandId` | `src/pages/BrandPage.jsx` | Brand-specific product listing. |
| **Product Detail (PDP)** | `/product/:productId` | `src/pages/PDP.jsx` | Detailed view of a single product. |
| **Registry** | `/registry` | `src/pages/RegistryPage.jsx` | User's gift registry (Protected). |
| **Public Registry** | `/registry/:registryId` | `src/pages/RegistryPage.jsx` | Shared view of a gift registry. |
| **Wishlist** | `/wishlist` | `src/pages/WishlistPage.jsx` | User's saved items. |
| **Checkout** | `/checkout` | `src/pages/CheckoutPage.jsx` | Shopping cart checkout and order placement. |
| **Design System** | `/design-system` | `src/pages/DesignSystemPage.jsx` | Overview of UI components and styles. |
| **About Us** | `/about` | `src/pages/ComingSoonPage.jsx` | Placeholder for About page. |
| **Safety** | `/safety` | `src/pages/ComingSoonPage.jsx` | Placeholder for Safety information. |
| **Support** | `/support` | `src/pages/ComingSoonPage.jsx` | Placeholder for Support/Contact. |
| **FAQ** | `/faq` | `src/pages/ComingSoonPage.jsx` | Placeholder for Frequently Asked Questions. |
| **Wholesale** | `/wholesale` | `src/pages/ComingSoonPage.jsx` | Placeholder for Wholesale inquiries. |
| **Brands Directory** | `/brands` | `src/pages/ComingSoonPage.jsx` | Placeholder for all brands directory. |
| **Not Found** | `*` | `src/pages/NotFoundPage.jsx` | 404 error page. |

---

## Modals

Modals are reusable components typically triggered by user actions across different pages.

| Modal Name | Component File | Triggered From | Purpose |
| :--- | :--- | :--- | :--- |
| **Cart Modal** | `src/components/ui/CartModal.jsx` | Navbar (Cart Icon) | Sidebar-style cart overview. |
| **Onboarding Modal** | `src/components/ui/OnboardingModal.jsx` | Navbar (Account Icon) | Initial user login/signup prompt. |
| **Quick View Modal** | `src/components/ui/QuickViewModal.jsx` | Home, PLP, Dashboard | Quick look at product details without navigating to PDP. |
| **Group Gifting Modal** | `src/components/registry/GroupGiftingModal.jsx` | Registry Page | Setup for group contributions to a registry item. |
| **Location Modal** | `src/components/checkout/LocationModal.jsx` | Checkout, Profile | Address selection and zone-based ETA calculation. |
| **Confirmation Modal** | `src/components/checkout/ConfirmationModal.jsx` | Checkout (Legacy/Standalone) | Order success confirmation (often inlined in Checkout). |

## Dynamic Route seeking (ID based)

- **Product ID**: Seekable via `/product/:productId`
- **Brand ID**: Seekable via `/brand/:brandId`
- **Category/Stage ID**: Seekable via `/category/:stageId` (e.g., `mother`, `newborn`, `kid`)
- **Collection ID**: Seekable via `/collection/:collectionId`
- **Registry ID**: Seekable via `/registry/:registryId`
