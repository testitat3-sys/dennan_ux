Viewed 00-overview.md:1-37
Listed directory dennan_ux
Listed directory storefront
Viewed package.json:1-46
Listed directory src
Viewed vite.config.js:1-23
Viewed index.html:1-23
Viewed main.jsx:1-36
Viewed App.jsx:1-105
Listed directory public
Listed directory pages
Listed directory assets
Listed directory components
Viewed Home.jsx:1-176
Listed directory home
Listed directory fonts
Viewed Hero.jsx:1-115
Viewed ReelsSection.jsx:1-94
Viewed api.js:1-106
Viewed index.css:1-293
Listed directory products
Listed directory new_assets
Viewed ProductCard.jsx:1-258
Viewed BrandsBanner.jsx:1-38

Now I have a thorough enough picture of the codebase to write a comprehensive analysis. Let me create the audit artifact.

Created perf_audit.md

Here's the full picture. Eight root causes were found — all traceable to specific files.

---

## Root Causes (by impact)

### 🔴 Critical — Blocking first paint

**1. No code splitting** ([`App.jsx`](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/src/App.jsx#L1-L22))  
All 12+ page components are **eagerly imported**, so the browser downloads and executes every page's code before rendering pixel one. `CheckoutPage.jsx` (51 KB), `RegistryPage.jsx` (39 KB), `ProfilePage.jsx` (31 KB) — all loaded on the home page visit. This is the single biggest driver of the 1,240 ms TBT. Fix: `React.lazy()` + `Suspense` on every route.

**2. Google Maps on every page** ([`index.html`](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/index.html#L13-L16))  
The Maps + Places API (~250 KB gzipped) is loaded globally, even on the home page where it's irrelevant. `libraries=places` spawns additional sub-scripts that block the main thread. Fix: dynamically inject it only when the checkout address step activates.

**3. Hero image not preloaded** ([`Hero.jsx`](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/src/components/home/Hero.jsx#L84))  
The hero `<img>` has no `fetchpriority="high"` and no `<link rel="preload">` in the HTML. Since it's rendered by React (after JS runs), the browser discovers it very late — directly causing the **8.7 s LCP**.

### 🔴 Critical — Massive image payloads

**4. Multi-megabyte images on the home page** ([`public/new_assets/`](file:///c:/Users/HP/Desktop/dennan/dennan_ux/public/new_assets))  
`reel_4.webp` is **1.9 MB**, `first homepage (1).webp` is **2.0 MB**, `pexels-…-33509292.webp` is **1.5 MB**, and several PNG category cards are 700–850 KB each. These are the primary driver of the **44.3 s Speed Index**. Target < 150 KB per image using Squoosh or `sharp`.

### 🟠 High — Delays first contentful paint

**5. All data must resolve before anything renders** ([`Home.jsx` line 64](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/src/pages/Home.jsx#L64))  
The skeleton is shown until all five data sources (`restData`, `liveProducts`, `liveStages`, `liveTiers`) finish — even though Hero only needs `restData.hero`. Fix: progressive rendering — show Hero the moment hero data arrives.

**6. Double Convex client** ([`api.js`](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/src/services/api.js#L1-L5))  
A second `ConvexClient` is created at module load time, opening a duplicate WebSocket. `getHomepageData()` fires three imperative queries in parallel, independent of the React client's batching. Fix: replace with `useQuery` hooks in the actual components.

**7. Unpaginated product query** ([`Home.jsx` line 32](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/src/pages/Home.jsx#L32))  
`useQuery(api.data.getProducts)` fetches the **entire catalogue** — the home page only uses 8 + 4 items. A large WS message causes a long JSON parse task → TBT goes up.

### 🟡 Medium

**8. Custom fonts not WOFF2 + missing font-display** ([`public/fonts/`](file:///c:/Users/HP/Desktop/dennan/dennan_ux/public/fonts))  
The two Antipasto `.otf` files (77 KB + 83 KB) are unoptimised. Converting to WOFF2 and adding `font-display: swap` + a `<link rel="preload">` would shave ~0.3 s off FCP.

---

## Priority Action Plan

| Priority | Fix | Metric target |
|---|---|---|
| P0 | `React.lazy` on all routes | TBT → < 400 ms |
| P0 | Lazy-load Google Maps only on checkout | TBT −300 ms |
| P0 | Preload hero image + `fetchpriority="high"` | LCP → < 3 s |
| P0 | Compress images to < 150 KB | Speed Index → < 5 s |
| P1 | Progressive rendering (Hero before all data) | FCP → < 1.8 s |
| P1 | Kill double `ConvexClient`, use `useQuery` only | TBT −100 ms |
| P1 | Paginate `getProducts` on home page | TBT −100 ms |
| P2 | Antipasto → WOFF2 + `font-display: swap` | FCP −0.3 s |

The full report with code snippets for each fix is in the [perf_audit.md](file:///C:/Users/HP/.gemini/antigravity-ide/brain/f34b99bf-7304-4446-ab92-328ed07320c7/perf_audit.md) artifact.

Want me to start implementing any of these? The P0 items (code-splitting, image preload, Maps lazy-load) would give the most dramatic score improvement with relatively safe changes.