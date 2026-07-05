# Component Folder Conventions

Last verified: 2026-07-04 (post cleanup/reorg commit).

## Folder layout

```
src/components/
  ui/          generic, domain-agnostic primitives (Button, Card, Page, Text, Toast, Skeletons, etc.)
  products/    commerce/product-display components (ProductCard, CartItem, CartModal,
               QuickViewModal, DefaultProductImage, ProductCardSkeleton, SuggestionProductCard)
  brand/       brand page components (BrandHeader, BrandStory, StageNavRail)
  checkout/    checkout flow components (CheckoutStepper, ReviewModal, RiderTracking,
               SmartAddressSearch, PesapalPaymentModal, etc.)
  dashboard/   account dashboard components (MilestoneBadges, PredictiveFeed, etc.)
  home/        homepage sections (Hero, ProductSection, ReelsSection, TierSection, etc.)
  registry/    gift registry components (RegistryHeader, ContributionModal,
               RegistrySuggestionRail, AddEventModal, etc.)
  layout/      app shell (Navbar, Footer, MegaMenu, Layout, ProtectedRoute)
```

## Rule of thumb

- `ui/` is reserved for components with **no knowledge of products, cart, or registry domain concepts** — a Button doesn't know what's in the cart, a Card doesn't know it's rendering a product.
- Anything that renders/manipulates a product, cart item, or registry suggestion belongs in `products/`, not `ui/`. This split exists because `ui/` previously accumulated commerce-specific components (`ProductCard`, `CartItem`, `CartModal`, `QuickViewModal`, `DefaultProductImage`) which made the "generic primitives" folder misleading — they were moved out into `products/` in the 2026-07-04 cleanup.
- Everything else is grouped by the page/feature domain it serves (`checkout/`, `registry/`, `dashboard/`, `home/`, `brand/`).

## Naming & CSS colocation

- Each component's `.css` file (if it has one) lives next to its `.jsx` in the same folder, same base name (e.g. `ProductCard.jsx` + `ProductCard.css`).
- Some components have no CSS file at all — this is intentional when they rely entirely on shared/global styles (`src/variables.css`, parent-scoped classes) rather than their own stylesheet. Notably true for all of `layout/` and several small `ui/` primitives (`CardGrid`, `CartItem`* , `ReelCard`, `StageTile`, `Text`, `TierCard`).

## Key shared components and their consumers

- `products/ProductCard.jsx` — used by `dashboard/PredictiveFeed`, `home/ProductSection`, `pages/PLP`, `pages/WishlistPage`, `pages/DesignSystemPage`.
- `products/ProductCardSkeleton.jsx` — used by the same product-listing surfaces while loading, plus `home/HomeSkeleton`, `pages/BrandPage`, `pages/PublicRegistryPage`, `pages/RegistryPage`.
- `products/QuickViewModal.jsx` — used by `Home`, `Dashboard`, `BrandPage`, `PLP`, `DesignSystemPage`.
- `products/CartModal.jsx` — used by `layout/Navbar` (cart icon trigger).
- `products/CartItem.jsx` — used inside `CartModal`.
- `products/DefaultProductImage.jsx` — fallback image renderer, used by `products/ProductCard`, `products/CartItem`, `products/QuickViewModal`, `checkout/ReviewModal`, `registry/RegistryItemCard`, `pages/CheckoutPage`, `pages/PDP`.
- `products/SuggestionProductCard.jsx` — used by `pages/RegistryPage` for registry gift suggestions; conceptually a `ProductCard` variant, kept as its own file since its layout/behavior differs enough to not warrant a shared prop-driven merge.
