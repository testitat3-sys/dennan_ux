# Editorial Soft-Modernism: Spacing, Layout & Responsive Geometry
**Philosophy:** Tactile Curator (The "Paper Stack")

This document defines the structural scaffolding of the Dennan site, ensuring it feels premium and intentional across all devices—from the palm of a hand to a wide desktop gallery.

---

## 1. The Spacing Scale (4px Grid)
All spacing must use the predefined CSS variables from `variables.css`.

| Variable | Value | Use Case |
| :--- | :--- | :--- |
| `--space-2` | 8px | Tight internal grouping, eyebrow dots. |
| `--space-3` | 12px | Headline to Body pairing. |
| `--space-4` | 16px | Internal card padding, form field margins. |
| `--space-6` | 24px | Large card padding, Product Image to Info. |
| `--space-8` | 32px | PLP horizontal grid gaps. |
| `--space-10` | 40px | Content block padding (Small). |
| `--space-11` | 44px | Minimum Touch Target (Mobile). |
| `--space-12` | 48px | PLP vertical grid gaps. |
| `--space-15` | 60px | Content block padding (Large), Hero offsets. |
| `--space-20` | 80px | Section to Section (Standard). |
| `--space-30` | 120px | Section to Section (Luxury / Large breaks). |

---

## 2. Responsive Geometry & Safe Zones
To prevent content from hitting the edges of the screen, we define **Global Insets**.

### 2.1 — The "Safe Edge" Padding (Gutter)
Mandatory horizontal margins that prevent text from touching the physical screen bezel.

| Screen Size | Breakpoint | Side Gutter | Variable |
| :--- | :--- | :--- | :--- |
| **Mobile** | `< 600px` | `--space-4` (16px) | `--layout-inset` |
| **Tablet** | `600px - 1024px` | `--space-8` (32px) | `--layout-inset` |
| **Desktop** | `> 1024px` | `--space-12` (48px) | `--layout-inset` |

**Rule:** Every main page container must have `padding-inline: var(--layout-inset);`.

### 2.2 — Content Max-Width
*   **Max-Width:** `80rem` (1280px).
*   **Alignment:** Always `margin-inline: auto;` to center the gallery on the screen.

---

## 3. The Surface & Depth Rules (The "Paper" Stack)
We avoid lines and borders, relying instead on surface tiers and shadows to create boundaries.

*   **Content Blocks:** Large sections (e.g., "Newborn Starter Kit") use `--surface-container-low` with padding of `--space-10` to `--space-15`.
*   **Interactive Cards:** Elevated elements (Product cards, Brand logos) sit on `--surface-container` with internal padding of `--space-4` to `--space-6`.
*   **Floating Elements:** Modals and tooltips use `--surface-container-highest` paired with `--shadow-deep`.

---

## 4. Layout Structures & Vertical Rhythm
We treat the layout as a series of **Asymmetric Flows** rather than a rigid grid.

### 4.1 — The "Breath" Scale
*   **Component Internal:** Use `--space-2` to `--space-4`. (e.g., inside a product card).
*   **Sub-Section Gap:** Use `--space-8` to `--space-10`. (e.g., between categories).
*   **Major Section Gap:** Use `--space-20` to `--space-30`. (e.g., between Hero and Brand list).
*   **Headline to Body:** Tight pairing (`--space-3` to `--space-4`).
*   **Product Image to Info:** Clear separation (`--space-5` to `--space-6`) without using divider lines.
*   **Button Internal:** Wide, "business-like" buttons (X: `--space-6` / Y: `--space-3`).

### 4.2 — The Asymmetric Product Grid
*   **Desktop:** 4-column layout. Every 2nd row should have a `padding-top` of `--space-12` to create a staggered, high-end look.
*   **Mobile:** 2-column layout. Use `--space-4` for the `column-gap` and `--space-8` for the `row-gap`.

---

## 5. Mobile Adaptation Rules

### 5.1 — The "One-Handed" Thumb Zone
*   **Interactive Elements:** All primary actions (Add to Cart, Search, Nav Toggle) must stay within the bottom 40% of the screen or be easily reachable.
*   **Vertical Padding:** Increase vertical padding on mobile buttons to `--space-4` to ensure they are easy to hit.

### 5.2 — Responsive Typography Scaling
*   `Display-LG` (3.5rem) → **Mobile:** 2.25rem (`--space-9`).
*   `Headline-MD` (1.75rem) → **Mobile:** 1.5rem (`--space-6`).

---

## 6. Interaction & Intentional Asymmetry
*   **Hover Bloom:** Interactive elements layer `--color-brand-primary` at 10% opacity on hover.
*   **Focus Glow:** Input fields get a `--shadow-secondary` (Plum tinted) glow when active.
*   **The "Offset" Rule:** For Hero sections, place the Newsreader headline at a `--space-10` left-margin, but offset the supporting image by `--space-15` from the right.
*   **Eyebrow Dots:** Use `--color-brand-primary-light` (Petal) for dots above headings, spaced exactly `--space-2` above the text.

---

## 7. Summary Table for Implementation

| Element | Vertical Spacing (Margin/Padding) | Horizontal Spacing (Margin/Padding) |
| :--- | :--- | :--- |
| **Navigation Bar** | `--space-3` (Top/Bottom) | `var(--layout-inset)` |
| **Hero Section** | `--space-15` (Top/Bottom) | `var(--layout-inset)` |
| **Product Card** | `--space-4` (Internal) | `--space-4` (Internal) |
| **Cart Modal** | `--space-6` (Top/Bottom) | `--space-5` (Sides) |
| **Checkout Forms**| `--space-4` (Between Inputs) | `--space-4` (Internal) |

### **The "Safe-Guard" Audit:**
If you see a component where the text looks like it is "choking" (too close to the edge), apply the **"Rule of 4s"**: Increase the padding to the next multiple of `--space-4` until the editorial "gallery" feel returns.
