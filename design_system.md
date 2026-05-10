# Design System Specification: Editorial Soft-Modernism
 
## 1. Overview & Creative North Star: "The Tactile Curator"
This design system rejects the "templated" nature of standard e-commerce. Our Creative North Star is **The Tactile Curator**—a philosophy that treats the digital screen like a high-end physical lookbook. 
 
We move away from rigid, boxed-in layouts in favor of **Intentional Asymmetry** and **Tonal Depth**. By utilizing a gallery-white canvas punctuated by **botanical color moments**—orchid, plum, and saffron—alongside high-contrast serif typography, we create an experience that feels bespoke, premium, and alive. The goal is to guide the user's eye through white space, tonal shifts, and deliberate bursts of brand color rather than aggressive lines and borders.
 
---
 
## 2. Color Strategy
Our palette is built in layers: a clinical white base provides a gallery-like backdrop, a rich botanical triad carries the brand personality, a dark anchor commands action, and a utility palette handles functional states.

### 2.1 — The Brand Triad (Core Identity)

These three colors define the brand's visual personality. They appear in hero moments, interactive accents, and premium flourishes.

| Role | Variable | Hex | Creative Name | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Brand Primary** | `--color-brand-primary` | `#d35097` | *Orchid Bloom* | Hero highlights, key interactive accents, brand moments |
| **Brand Primary Dark** | `--color-brand-primary-dark` | `#a63e74` | *Deep Orchid* | Hover/pressed states, high-emphasis text on light backgrounds |
| **Brand Primary Light** | `--color-brand-primary-light` | `#f07fb8` | *Petal* | Soft washes, badge backgrounds, eyebrow dots, decorative accents |
| **Brand Secondary** | `--color-brand-secondary` | `#832c7a` | *Plum Reserve* | Depth accents, footer tones, premium secondary CTAs |
| **Brand Accent** | `--color-brand-accent` | `#e1d328` | *Saffron Signal* | Sale tags, limited-edition markers, notification dots, progress indicators |

#### Accent Color Rules
The Saffron Signal accent is high-energy and should be used with restraint to preserve impact:
- **Do:** Use for sale badges, limited-edition tags, notification dots, and progress indicators.
- **Don't:** Use as a background fill, CTA color, or in large surface areas. It should spark, not shout.
- **Pairing:** Saffron works best against the dark anchor (`#111111`) or the gallery white (`#ffffff`). Avoid placing it directly on orchid or plum.

### 2.2 — The Command Anchor (Functional Black)

| Role | Variable | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Anchor** | `--color-anchor` | `#111111` | CTA button backgrounds, primary text, high-contrast UI chrome |
| **On-Primary** | `--color-on-primary` | `#ffffff` | Text/icons placed on anchor or brand-primary backgrounds |

**Key distinction:** Brand color ≠ CTA color. The brand triad expresses personality; the anchor commands action. Primary CTA buttons use the anchor, not the brand primary.

### 2.3 — The Neutral Base (Gallery White)

| Role | Variable | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Gallery White** | `--color-gallery-white` | `#ffffff` | The clean, neutral base for all surfaces |

### 2.4 — Support Palette ("The Utility Belt")

Functional colors for states, feedback, and thematic coding. These are not brand colors—they serve UI communication.

| Role | Variable | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Support Blue** | `--color-support-blue` | `#4dbee3` | Informational states, "Newborn" journey-stage theming |
| **Support Green** | `--color-support-green` | `#7fa93e` | Success states, "Essentials" tier theming, stock indicators |
| **Support Red** | `--color-support-red` | `#e53e3e` | Error states, destructive actions, urgency badges |

### 2.5 — Legacy Colors ("The Archive")

These colors are retained for backward compatibility. They remain valid for soft accents but should be **phased out in new work** in favor of their modern equivalents.

| Legacy Variable | Hex | Preferred Replacement |
| :--- | :--- | :--- |
| `--color-legacy-rose` | `#fe9ec7` | `--color-brand-primary-light` (`#f07fb8`) |
| `--color-atmospheric-blue` | `#78b3d4` | `--color-support-blue` (`#4dbee3`) |

### 2.6 — Text Colors

| Role | Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Text Primary** | `--text-primary` | `var(--color-anchor)` | Headlines, body copy, high-emphasis labels |
| **Text Secondary** | `--text-secondary` | `#555555` | Descriptions, supporting copy, nav links |
| **Text Tertiary** | `--text-tertiary` | `#888888` | Placeholders, disabled labels, timestamps |

### 2.7 — The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts or subtle transitions between surface tiers. If you feel the need for a line, increase your padding or shift the background tone instead.

### 2.8 — Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following tiers to define depth:

| Tier | Variable | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Base** | `--surface` | `#ffffff` | The "gallery wall" everything sits on |
| **Layer 1** | `--surface-container-low` | `#faf9f8` | Large content blocks, section backgrounds |
| **Layer 2** | `--surface-container` | `#f4f2f0` | Elevated interactive cards, image placeholders |
| **Layer 3** | `--surface-container-high` | `#ede9e5` | Emphasized panels, active states, hover surfaces |
| **Layer 4** | `--surface-container-highest` | `#e5e0db` | Floating UI elements, modals, tooltips |

Each tier should feel like a sheet of fine paper laid atop the previous one—never a hard boundary, always a tonal whisper.

---
 
## 3. Typography: The Editorial Voice
We use a high-contrast pairing to balance heritage with modernity, featuring sophisticated serif headlines and clean sans-serif functional text.
 
### Typography Scale
- **Display & Headlines ('Newsreader'):** 
    - *Usage:* Large, expressive titles. This font carries the brand's editorial authority.
    - *Styling:* Use tight letter-spacing (-2%) for `display-lg` to create a "printed" feel.
- **UI & Body ('Plus Jakarta Sans'):**
    - *Usage:* Product descriptions, labels, and functional text.
    - *Styling:* `body-md` is our workhorse. Ensure line-height is generous (1.6) to maintain an airy, premium feel.
 
| Role | Font | Size | CSS Variable | Weight |
| :--- | :--- | :--- | :--- | :--- |
| **Display-LG** | Newsreader | 3.5rem | `--display-lg` | Regular |
| **Headline-MD** | Newsreader | 1.75rem | `--headline-md` | Regular |
| **Title-SM** | Plus Jakarta Sans | 1.125rem | `--title-sm` | Medium |
| **Body-MD** | Plus Jakarta Sans | 0.9375rem | `--body-md` | Regular |
| **Body-SM** | Plus Jakarta Sans | 0.875rem | `--body-sm` | Regular |
| **Label-SM** | Plus Jakarta Sans | 0.625rem | `--label-sm` | Bold (All Caps) |
 
---
 
## 4. Elevation & Depth
In this design system, depth is organic, not artificial.
 
### The Layering Principle
Avoid traditional shadows where possible. Instead, stack `surface-container` cards on a pure white background. This "Tonal Layering" creates a soft, natural lift that mimics fine stationery.
 
### Shadow System

| Shadow | Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Ambient** | `--shadow-ambient` | `rgba(17, 17, 17, 0.06)` | Default card lift, subtle nav separation |
| **Deep** | `--shadow-deep` | `rgba(17, 17, 17, 0.15)` | Hover-state emphasis, elevated CTAs |
| **Primary Glow** | `--shadow-primary` | `rgba(211, 80, 151, 0.12)` | Brand-tinted glow on primary interactive elements |
| **Secondary Glow** | `--shadow-secondary` | `rgba(131, 44, 122, 0.12)` | Plum-tinted glow on search focus, secondary actions |

*Note:* Shadow colors are tinted versions of the brand palette, never pure black. If a shadow looks like a shadow, it's too dark—it should feel like ambient occlusion or a colored aura.
 
---
 
## 5. Components
 
### Buttons (The High-Contrast Anchor)
- **Primary:** Background `--color-anchor`, Text `--color-on-primary`. Moderate roundedness (`--radius-md`).
- **Secondary:** Background `transparent`, Ghost Border (15% opacity), Text `--color-anchor`.
- **Interaction:** On hover, the Primary button should layer `--color-brand-primary` at low opacity for a sophisticated "bloom" effect. Combine with `--shadow-deep` for lift.
 
### Cards & Product Grids
- **Construction:** No borders. Use `--surface-container-low` for the card background.
- **Spacing:** Normal internal padding (Level 2) within cards to maintain editorial flow.
- **The "No-Divider" Rule:** Never use lines to separate product info. Use typography scale (Newsreader for Price, Plus Jakarta Sans for Title) and vertical gaps.
- **Tier Badges:** Use tinted `color-mix()` backgrounds with support/brand colors:
    - Essentials → `--color-support-green`
    - Must-Haves → `--color-brand-primary`
    - Luxuries → `--color-support-blue`
 
### Input Fields
- **Style:** Minimalist. Only a bottom-border (2px) using `outline_variant`.
- **Focus State:** The bottom border transitions to `--color-brand-primary` (Orchid Bloom), paired with `--shadow-secondary` for a soft plum glow.
 
---
 
## 6. Do's and Don'ts
 
### Do:
*   **Embrace White Space:** Use the spacing scale (`--space-*`) to treat space as a luxury.
*   **Use Asymmetric Layouts:** Place an image slightly off-center or allow a heading to overlap a container to break the "web-template" feel.
*   **Respect the Baseline:** All vertical spacing must be consistent with the system's spacing scale.
*   **Use `color-mix()` for Tints:** When you need a softer version of any brand/support color, use `color-mix(in srgb, var(--color-*), transparent N%)` rather than inventing new hex values.
*   **Pair Brand Colors with Neutrals:** Orchid and Plum sing against the gallery white. Let them breathe.
 
### Don't:
*   **Don't use muddy tones:** Stick to the defined surface hierarchy to keep the "gallery" aesthetic clean.
*   **Don't use hard drop-shadows:** Use the `--shadow-*` variables. If it looks like a shadow, it's too dark.
*   **Don't use generic icons:** Use thin-stroke icons to match the sophistication of Plus Jakarta Sans.
*   **Don't combine Orchid + Saffron directly:** These two brand colors clash at full saturation. Always separate them with a neutral (white or anchor black).
*   **Don't hardcode hex values:** Always reference `--color-*`, `--surface-*`, and `--shadow-*` variables.