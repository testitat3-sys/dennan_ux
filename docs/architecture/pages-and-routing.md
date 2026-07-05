# Pages & Routing

Last verified: 2026-07-04 (post cleanup/reorg commit).

All routes are defined in `src/App.jsx`. Pages requiring auth are wrapped in `src/components/layout/ProtectedRoute.jsx`.

| Page | Route | File | Notes |
| :--- | :--- | :--- | :--- |
| Home | `/` | `src/pages/Home.jsx` | Landing page — hero, stages, product sections, reels. |
| Auth | `/auth` | `src/pages/AuthPage.jsx` | Login/sign up. |
| After Sign In | `/after-signin` | `src/pages/AfterSignIn.jsx` | Post-auth redirect target. |
| Onboarding | `/onboarding` | `src/pages/OnboardingPage.jsx` | New-user onboarding flow. |
| Profile | `/profile` | `src/pages/ProfilePage.jsx` | Protected. Account/address management. |
| Dashboard | `/dashboard` | `src/pages/Dashboard.jsx` | Protected. Milestones, predictive product feed. |
| Admin Dashboard | `/admin` | `src/pages/AdminDashboard.jsx` | Internal admin panel. |
| Product Listing (PLP) | `/category/:stageId`, `/collection/:collectionId` | `src/pages/PLP.jsx` | Category- or collection-based listing. |
| Brand Page | `/brand/:brandId` | `src/pages/BrandPage.jsx` | Brand-specific listing + story. |
| Product Detail (PDP) | `/product/:productId` | `src/pages/PDP.jsx` | Single product detail view. |
| Registry | `/registry`, `/registry/:registryId` | `src/pages/RegistryPage.jsx` | Protected for owner, public shared view for others. |
| Public Registry | (same file, unauthenticated view) | `src/pages/PublicRegistryPage.jsx` | Read-only registry view for guests. |
| Wishlist | `/wishlist` | `src/pages/WishlistPage.jsx` | Saved items. |
| Checkout | `/checkout` | `src/pages/CheckoutPage.jsx` | Cart review, address, payment (Pesapal). |
| Payment Callback | (Pesapal redirect) | `src/pages/PaymentCallbackPage.jsx` | Handles Pesapal IPN/redirect completion. |
| Design System | `/design-system` | `src/pages/DesignSystemPage.jsx` | Internal style-guide page — **not** user-facing, kept intentionally for reviewing shared components (`products/ProductCard`, `products/ProductCardSkeleton`, `products/QuickViewModal`) in isolation. |
| Coming Soon (About/Safety/Support/FAQ/Wholesale/Brands directory) | `/about`, `/safety`, `/support`, `/faq`, `/wholesale`, `/brands` | `src/pages/ComingSoonPage.jsx` | Shared placeholder page for unbuilt routes. |
| Not Found | `*` | `src/pages/NotFoundPage.jsx` | 404 fallback. |

## Dynamic route params

- `productId` → `/product/:productId`
- `brandId` → `/brand/:brandId`
- `stageId` → `/category/:stageId` (e.g. `mother`, `newborn`, `kid`)
- `collectionId` → `/collection/:collectionId`
- `registryId` → `/registry/:registryId`

## Notable modals (not routes, but triggered globally)

| Modal | File | Triggered from |
| :--- | :--- | :--- |
| Cart Modal | `src/components/products/CartModal.jsx` | Navbar cart icon |
| Onboarding Modal | `src/components/ui/OnboardingModal.jsx` | Navbar account icon |
| Quick View Modal | `src/components/products/QuickViewModal.jsx` | Home, PLP, Dashboard, BrandPage, DesignSystemPage |
| Location Modal | `src/components/checkout/LocationModal.jsx` | Checkout, Profile |
| Confirmation Modal | `src/components/checkout/ConfirmationModal.jsx` | Checkout |
