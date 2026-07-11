# Offline-Capable Walk-in POS (Admin PWA) — Implementation Walkthrough

**Status: implemented, needs your review before relying on it in a live shift.**

## Scope

This applies to the **admin app only** (`admin/` — both `StaffDashboard` and
`AdminDashboard`), not the customer-facing landing page. The landing page was
not touched.

## What changed and why

1. **Admin app is now a PWA.** `admin/vite.config.js` adds `vite-plugin-pwa`,
   which precaches the built JS/CSS/HTML/icons so the app shell still loads
   with zero connection. `admin/src/main.jsx` registers the service worker
   after first paint. The service worker is configured to **never** cache
   Convex API/websocket traffic (`runtimeCaching: []`, denylist on `/api/`) —
   offline data comes from IndexedDB, not a stale HTTP cache.

2. **Products are downloaded once per device, then only deltas.** Previously
   the POS tab held a live, reactive subscription (`useQuery(getProductsForPOS)`)
   that Convex silently resent in full (~4000 rows) whenever *any* product
   anywhere changed. Now:
   - `convex/schema.ts` — `products` gained `updatedAt` (stamped by every
     mutation that touches a product) and a `by_updatedAt` index.
   - `convex/products.ts` — new `getProductsUpdatedSince(token, since)` query
     returns only products changed after `since`, each tagged `keep: boolean`
     so the client knows whether to upsert or evict it from cache.
   - `admin/src/hooks/useOfflineProducts.js` — on a brand-new device, calls
     `getProductsForPOS` **once** and writes the full catalog to IndexedDB
     (`admin/src/lib/offlineDb.js`, "bootstrap"). On every later app load and
     every offline→online transition, it calls `getProductsUpdatedSince`
     instead — never the full list again. No polling timer either way.
   - `admin/src/pages/StaffDashboard.jsx` — POS tab now reads from this hook
     instead of a raw `useQuery`, so the grid renders instantly from
     IndexedDB even with no connection, then updates in place as
     deltas arrive.

3. **Walk-in checkout works offline, queued for later sync.** When
   `navigator.onLine` is false, `handleCheckout` in `StaffDashboard.jsx` skips
   the `createPhysicalOrder` call and instead:
   - Stores the full order payload in IndexedDB (`pendingWalkInOrders`).
   - Reserves the sold quantities against the local product cache
     (`offlineStockReservations` state) so a second offline sale of the same
     item can't oversell what's cached.
   - Shows a receipt marked **"RECORDED OFFLINE — PENDING SYNC"**
     (`admin/src/components/ReceiptModal.jsx`).
   - `admin/src/hooks/useOfflineOrderSync.js` drains this queue **one order
     at a time, in sequence** (never in parallel, to avoid racing stock
     decrements) through the real `createPhysicalOrder` mutation as soon as
     the connection returns. A failed sync (e.g. a genuine stock conflict
     discovered server-side) stops the batch and flags that order for manual
     review — it does not retry silently or risk a duplicate charge.

   **Scope cut:** gift-voucher sales and voucher-tender redemption are
   blocked while offline (clear inline error) — they require live server
   validation (balance, expiry) that can't be safely faked client-side. Cash,
   MoMo, and card tenders work fully offline.

4. **Connectivity UX.** `admin/src/hooks/useOnlineStatus.js` is a pure
   `navigator.onLine`/`online`/`offline`-event hook — no polling.
   `admin/src/components/OfflineBanner.jsx` shows a sticky bar when offline,
   syncing, or when offline sales need review; mounted in both
   `StaffDashboard` and `AdminDashboard`. The sidebar's POS nav item also
   shows a badge with the pending/failed offline-order count.

5. **Last-tab memory.** Both dashboards now persist `activeTab` to
   `localStorage` (`dennan_staff_last_tab` / `dennan_admin_last_tab`) and
   restore it on refresh/re-login, so staff land back where they left off.

## Files touched

- `convex/schema.ts` — `products.updatedAt` + `by_updatedAt` index.
- `convex/products.ts` — `updatedAt` stamped in `adjustStock`, `setDiscount`,
  `updateProduct`, `createProduct`; new `getProductsUpdatedSince` query.
- `convex/orders.ts` — `updatedAt` stamped in `syncStockDeductionByBarcode`
  (the most frequent writer, since every order patches inventory through it).
- `admin/vite.config.js`, `admin/src/main.jsx` — PWA plugin + SW registration.
- `admin/src/lib/offlineDb.js` — new IndexedDB wrapper.
- `admin/src/hooks/useOnlineStatus.js`, `useOfflineProducts.js`,
  `useOfflineOrderSync.js` — new hooks.
- `admin/src/components/OfflineBanner.jsx` — new component.
- `admin/src/components/ReceiptModal.jsx` — "pending sync" label.
- `admin/src/pages/StaffDashboard.jsx` — offline product cache, offline
  checkout branch, stock reservations, tab persistence, banner/badge.
- `admin/src/pages/AdminDashboard.jsx` — banner + tab persistence.

## Verified so far

- `npm run build` in `admin/` succeeds and generates `dist/sw.js` +
  `manifest.webmanifest`.
- `npx convex dev --once` type-checks and deploys the schema/function
  changes cleanly.

## Not yet verified — please review before trusting this in a live shift

- End-to-end manual test: open POS online once (bootstrap), go offline in
  DevTools, ring up a cash sale, confirm the pending badge and receipt label,
  go back online, confirm the order lands in Order History with correct
  stock deducted.
- Manifest icons currently reuse the existing `dennan_logo_final_compressed.png`
  and `favicon.ico` rather than purpose-made 192×192/512×512 PWA icons —
  functional but not polished; worth a proper icon set later.
- Existing products created before this change have no `updatedAt` yet. This
  doesn't break correctness (they were already captured by the one-time
  bootstrap), but a one-off backfill (`updatedAt = _creationTime`) would tidy
  this up if you want it.
- No automated test coverage was added for the offline checkout/sync path.
