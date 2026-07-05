# Assets & Static Files

Last verified: 2026-07-04 (post cleanup/reorg commit).

## Where assets live

| Location | Purpose | Referenced how |
| :--- | :--- | :--- |
| `public/assets/` | General product/lifestyle images, logos, icons | Absolute URL path `/assets/<file>` (Vite serves `public/` at the site root) |
| `public/new_assets/` | Newer product/lifestyle imagery added after the original `assets/` set | Absolute URL path `/new_assets/<file>` |
| `public/fonts/` | Custom brand fonts (`.otf`/`.ttf`), loaded via `@font-face` in `src/variables.css` | Path referenced inside `@font-face` `src: url(...)` |
| `src/assets/` | Assets imported directly in JS/JSX (bundled by Vite, not served as static files) | `import logo from '../assets/foo.png'` |

**There is only one copy of each asset folder now** — historically the repo also had duplicate `assets/` and `new_assets/` directories at the repo root (left over from before assets were moved into `public/`); these were deleted in the 2026-07-04 cleanup since they weren't referenced by `vite.config.js` or `vercel.json` and only `public/` is actually served.

## Conventions

- Prefer `.webp` for anything used as a hero/background/product image where a webp version already exists — several `.png` duplicates of the same image were removed because the `.webp` version is what's actually referenced in `src/data/*.js` / `src/constants/staticData.js`.
- Don't add a new asset to the repo root — it must go in `public/` (served) or `src/assets/` (bundled import) or it won't resolve at runtime.
- If you add a new brand font, add both the file to `public/fonts/` **and** a corresponding `@font-face` rule in `src/variables.css` — a font file with no `@font-face` rule is dead weight (this happened before: `Antipasto_extralight.otf`, `Playfull Rocket.ttf`, `Trimen Drawing Demo.otf` were removed for exactly this reason).

## Known gotchas / history

- `src/pages/RegistryPage.jsx` references `/new_assets/gifting.png` — this was broken for a period because the file only existed at the repo-root duplicate folder, not inside `public/new_assets/`. Fixed by copying the file into `public/new_assets/` before the root duplicate was deleted. If an image 404s in the running app, check first whether it's referenced with a `/assets/...` or `/new_assets/...` path but the file is missing from the corresponding `public/` subfolder.
- `src/data/brandData.js` previously referenced `/assets/brands/tommee_tippee_logo.png`, which never existed (no `brands/` subfolder ever existed under `public/assets/`). The dead reference was removed; `components/brand/BrandHeader.jsx` already has a fallback (hides the `<img>` when `brand.logo` is falsy) so brand pages render fine without a logo.
