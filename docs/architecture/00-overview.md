# Dennan UX — Orientation Overview

Last verified: 2026-07-04 (post cleanup/reorg commit).

## Stack

- **Frontend**: React + Vite, plain CSS per-component (no CSS framework), React Router for routing.
- **Backend**: [Convex](https://convex.dev) — see `convex/_generated/ai/guidelines.md` for API conventions before editing backend code.
- **Payments**: Pesapal integration (`convex/pesapal.ts`, `convex/registryPesapal.ts`).

## Top-level directories

| Path | Purpose |
| :--- | :--- |
| `src/pages/` | One file per route, wired in `src/App.jsx`. See [pages-and-routing.md](pages-and-routing.md). |
| `src/components/` | Reusable UI, grouped by domain (`ui/`, `products/`, `checkout/`, `registry/`, `dashboard/`, `home/`, `brand/`, `layout/`). See [components.md](components.md). |
| `src/context/` | React context providers (Cart, Wishlist, Registry, etc.) consumed across components/pages. |
| `src/data/` | Static/mock data used by pages before or alongside Convex-backed data. |
| `src/constants/` | Shared static constants (e.g. `staticData.js`). |
| `src/utils/` | Small pure helpers (e.g. `priceUtils.js`). |
| `public/` | Statically served assets (images, fonts) — see [assets-and-public.md](assets-and-public.md). |
| `convex/` | Backend schema, queries, mutations, actions, HTTP routes. See [convex-backend.md](convex-backend.md). |

## Where to start for common tasks

- **Add a new page**: create `src/pages/YourPage.jsx`, add a `<Route>` in `src/App.jsx`. Wrap in `ProtectedRoute` (`src/components/layout/ProtectedRoute.jsx`) if it requires auth.
- **Add a new component**: place it in the domain folder it belongs to (`products/` for commerce/product-card-like UI, `ui/` only for generic primitives with no product/cart/registry knowledge). Colocate its `.css` file alongside it.
- **Add/change backend data**: read `convex/_generated/ai/guidelines.md` first, then edit `convex/schema.ts` for table shape and the relevant `convex/*.ts` file for queries/mutations.
- **Add a static asset**: put it in `public/assets/` (general images) or `public/new_assets/` (newer product/lifestyle imagery) and reference it as `/assets/...` or `/new_assets/...`. Don't duplicate assets at the repo root — `public/` is the only served copy.

## Related docs

- [components.md](components.md) — component folder conventions
- [assets-and-public.md](assets-and-public.md) — static asset locations and conventions
- [pages-and-routing.md](pages-and-routing.md) — page/route inventory
- [convex-backend.md](convex-backend.md) — schema and backend function layout
