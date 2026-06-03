# Editorial Soft-Modernism: Loading Skeletons & Resilient Error States
**Philosophy:** The Unbroken Gallery

In our high-end e-commerce environment—**The Tactile Curator**—any layout shift, catastrophic-looking system message, or layout break destroys the illusion of a luxury lookbook.

This reference guide establishes the architectural guidelines, CSS utilities, and React patterns for:
1. **Loading Skeletons** that preserve page geometry.
2. **Curated Fail-State Placards** that treat errors with premium editorial dignity.
3. **The Mobile Scroll Safe-Guard Blueprint** to eliminate horizontal layout leaks.

---

## 1. Loading Skeletons: "Underlay Preservation"

When content is loading, we do not show generic spinning wheels. Instead, we use **shimmering canvas underlays** that perfectly mirror the physical height, aspect ratio, and structural flow of the incoming components.

### 1.1 — The Core Skeleton Principles
*   **Aspect-Ratio Constraints:** Skeletons must have the exact same bounding box as the loaded component. If a product photo is `aspect-ratio: 1` or `aspect-ratio: 4/5`, its skeleton block must match this exactly.
*   **The "Orchid Shimmer" Accent:** Our shimmer animation doesn't use standard cold gray. It blends a very subtle **5% Orchid Bloom** brand tint (`--color-brand-primary`) to make the interface feel alive and on-brand even during a load state.
*   **No Layout Shifts (Anti-Jitter):** Margins, paddings, and flex gaps inside skeleton containers must use the identical values from the spacing scale (`--space-*`) as their live counterparts.

### 1.2 — Global CSS Shimmer Variables & Utilities
These are globally available in `index.css` and can be utilized across any skeleton component:

```css
/* Globals defined in index.css */
:root {
  --skeleton-base: var(--surface-container-high);
  --skeleton-highlight: color-mix(in srgb, var(--color-brand-primary) 5%, var(--surface));
}

/* Keyframe for shimmering effect */
@keyframes global-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Shimmer Class - Apply to any background block */
.global-skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 25%,
    var(--skeleton-highlight) 50%,
    var(--skeleton-base) 75%
  );
  background-size: 200% 100%;
  animation: global-shimmer 1.6s infinite linear;
}

/* Standardized Skeleton Blocks */
.skeleton-block {
  background-color: var(--skeleton-base);
  border-radius: var(--radius-sm);
  width: 100%;
  height: 16px;
}
```

### 1.3 — React Component Blueprint: Generic Grid Skeleton
For lists, cards, or collections, use a mapping array inside a grid wrapper to maintain responsive row alignments.

```jsx
import React from 'react';

export const ProductGridSkeleton = ({ count = 4 }) => {
  return (
    <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-8)' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <article key={idx} className="product-card product-card--skeleton" style={{ pointerEvents: 'none', background: 'var(--surface-container-low)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          {/* 1:1 image skeleton underlay */}
          <div className="global-skeleton-shimmer" style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
          
          {/* Text block skeletons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className="global-skeleton-shimmer" style={{ height: '12px', width: '30%', borderRadius: 'var(--radius-sm)' }} />
            <div className="global-skeleton-shimmer" style={{ height: '18px', width: '90%', borderRadius: 'var(--radius-sm)' }} />
            <div className="global-skeleton-shimmer" style={{ height: '18px', width: '60%', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)' }} />
            <div className="global-skeleton-shimmer" style={{ height: '44px', width: '100%', borderRadius: 'var(--radius-md)' }} />
          </div>
        </article>
      ))}
    </div>
  );
};
```

> [!TIP]
> For reference implementations in the codebase, check:
> *   [ProductCardSkeleton.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/components/ui/ProductCardSkeleton.jsx) and [ProductCardSkeleton.css](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/components/ui/ProductCardSkeleton.css)
> *   [PDPSkeleton.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/components/ui/PDPSkeleton.jsx) and [PDPSkeleton.css](file:///c:/Users/HP/Desktop/dennan/dennan_ux/src/components/ui/PDPSkeleton.css)

---

## 2. Failure States: The "Curated Placard"

Errors are inevitable—network issues, missing records, or empty states. In our editorial aesthetic, we reject bright, alarmist banners, toxic red alert screens, and generic "Error 500" notices.

An error page or inline failure is treated like a **Gallery Placard**—a warm, beautifully centered block of neutral paper explaining the situation with high-contrast, sophisticated typography, and offering a premium, comfortable way to refresh.

### 2.1 — Visual Rules for Fail States
1.  **Background Atmosphere:** Use a soft background layer (`--surface-container-low` or `--surface-container`) with curved edges (`--radius-lg`) to anchor the block on the page.
2.  **Typography Voice:** The primary error title must use our **Newsreader** serif brand face (`--font-editorial`) with warm text (`--text-primary`) for high elegance.
3.  **The support red rule:** We do NOT fill backgrounds with bright red. If a failure needs a warning cue, use a tiny badge text in `var(--color-support-red)` backed by a soft, transparent red mix `color-mix(in srgb, var(--color-support-red) 10%, transparent)`.
4.  **Premium Action Target:** The "Retry" or "Back to Gallery" button uses the Command Anchor style (`--color-anchor` background with `--color-on-primary` text), transitioning beautifully into Orchid/Plum on hover.

### 2.2 — Standard Fail State CSS (Global in index.css)
The global layout style has been implemented in your codebase to guarantee uniform rendering:

```css
.curated-fail-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-12) var(--layout-inset);
  max-width: var(--width-compact);
  margin: var(--space-8) auto;
  background: var(--surface-container-low);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-ambient);
  box-sizing: border-box;
}

.curated-fail-state__eyebrow {
  font-family: var(--font-sans);
  font-size: var(--label-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-support-red);
  background: color-mix(in srgb, var(--color-support-red) 10%, transparent);
  padding: var(--space-1-5) var(--space-3);
  border-radius: var(--radius-pill);
  margin-bottom: var(--space-4);
}
```

### 2.3 — Reusable React Component Blueprint: `CuratedFailState`
You can save this component pattern inside `src/components/ui/CuratedFailState.jsx` to drop into any page boundary:

```jsx
import React from 'react';

const CuratedFailState = ({ 
  title = "Exhibit Temporarily Unavailable", 
  message = "We are currently unable to fetch these items from our catalog. This is likely a temporary connection blip.", 
  actionLabel = "Refresh Catalog", 
  onAction,
  eyebrow = "Connection Note"
}) => {
  return (
    <div className="curated-fail-state" role="alert">
      {eyebrow && <span className="curated-fail-state__eyebrow">{eyebrow}</span>}
      <h2 className="curated-fail-state__title">{title}</h2>
      <p className="curated-fail-state__message">{message}</p>
      {onAction && (
        <button 
          onClick={onAction} 
          className="curated-fail-state__action"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default CuratedFailState;
```

---

## 3. The Mobile Scroll & Layout Leak Prevention Blueprint

On mobile viewports, unwanted horizontal scroll (swiping right and seeing awkward empty margins) ruins the premium feel of a layout. This is commonly caused by fixed widths, layout shifting during load states, or poorly positioned backgrounds.

Here is the foolproof engineering system to prevent overflow leaks globally.

### 3.1 — The Four Layout-Leaking Culprits

| Culprit | Mechanism of Overflow | How to Correct |
| :--- | :--- | :--- |
| **1. Rigid Widths** | Hardcoded pixel widths (`width: 480px` or `width: 100vw` with padding added to the box model). | Always use `max-width: 100%;` combined with `width: 100%;` and `box-sizing: border-box;`. |
| **2. Unwrapped Text** | Long URLs, emails, or headlines with non-breaking spaces that push the edges of containers. | Apply the `.wrap-safety` class (`word-break: break-word; overflow-wrap: anywhere;`). |
| **3. Flexbox Container Blowout** | Flex items refusing to shrink below their text contents inside dynamic lines. | Force the container to respect margins by setting `min-width: 0;` on flex children. |
| **4. Shimmer Leakage** | Linear gradient animation boundaries spilling over absolute-positioned margins. | Ensure all animated skeleton cards have `overflow: hidden;` and `position: relative;`. |

### 3.2 — Core CSS Solutions for Flow Safety

The following classes have been implemented in `index.css` to protect mobile layouts:

#### A. Viewport Protection on Root
To prevent accidental swipes on touch devices, the master shell is anchored tightly:
```css
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden; /* Protect viewport from lateral spill */
  position: relative;
}
```

#### B. Safe Swipeable Lists (No Layout Leaks)
If you have a horizontal line of category filters, color swatches, or product tags on mobile, **do not** stack them vertically or let them spill. Wrap them in a touch-scrolling track that stays flush with the screen edges:
```css
.touch-scroll-row {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Momentum scroll on iOS */
  scroll-snap-type: x mandatory;
  width: 100%;
  gap: var(--space-3);
  scrollbar-width: none; /* Hide scrollbars for beauty */
}

.touch-scroll-row::-webkit-scrollbar {
  display: none; /* Hide scrollbar for Webkit browsers */
}

.touch-scroll-item {
  flex: 0 0 auto;
  scroll-snap-align: start;
}
```

#### C. Typography Wrapping
Always pair long description fields or headers with layout wrappers:
```css
.wrap-safety {
  word-break: break-word;
  overflow-wrap: anywhere;
}
```

---

## 4. Mobile Integrity Checklist (For Pull Requests)

Before declaring a feature ready, run through this visual and structural audit:

- [ ] **Viewport Check:** Open Chrome DevTools, select iPhone SE, and drag the screen laterally. Does the page slide sideways? If yes, find the child element breaking the margins.
- [ ] **Skeleton Bound Check:** Verify that elements like breadcrumb skeletons or product prices do not exceed `max-width: 100%`.
- [ ] **Gutter Integrity:** Ensure all panels and error screens respect `padding-inline: var(--layout-inset);`. Never hardcode side margins as pixel integers.
- [ ] **Wrap Check:** Feed a long mock word (e.g., `Supercalifragilisticexpialidocious_For_Newborns`) into headings and description fields to confirm they break nicely on a 320px screen.
