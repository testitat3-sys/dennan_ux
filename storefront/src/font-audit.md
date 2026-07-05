# Font Size Audit: Home Components

The following font sizes found in the `src/components/home` directory do not have exact matches in `src/variables.css`.

## Audit Summary

| Font Size | Occurrences | Current Variable Recommendation |
|-----------|-------------|---------------------------------|
| `0.75rem` | 3 | Needs a `--body-sm` or similar variable |
| `0.55rem` | 2 | Needs a `--label-xs` or similar variable |
| `1.25rem` | 1 | Needs a `--title-lg` or similar variable |
| `0.8125rem`| 3 | Close to `var(--body-md)` (0.875rem) but distinct (13px) |
| `0.65rem` | 4 | Close to `var(--label-sm)` (0.6875rem) |
| `0.9375rem`| 2 | Needs a `--body-lg` or similar variable |
| `0.7rem` | 1 | Close to `var(--label-sm)` (0.6875rem) |
| `1.5rem` | 1 | Needs a `--headline-sm` or similar variable |
| `0.9rem` | 1 | Close to `var(--body-md)` (0.875rem) |
| `0.5rem` | 1 | Extreme micro-label |

## Detailed File Map

### 0.75rem (12px)
- `TrustStrip.css:36`
- `SearchStrip.css:131`
- `Hero.css:114`

### 0.55rem (~9px)
- `TierSection.css:52`
- `BrandsBanner.css:112`

### 1.25rem (20px)
- `TierSection.css:65`

### 0.8125rem (13px)
- `TierSection.css:69`
- `SearchStrip.css:85`
- `JourneySection.css:80`

### 0.65rem (~10.4px)
- `TierSection.css:77`
- `ReelsSection.css:129`
- `ReelsSection.css:138`
- `Hero.css:167`

### 0.9375rem (15px)
- `SearchStrip.css:50`
- `ReelsSection.css:161`

### 0.7rem (~11.2px)
- `ReelsSection.css:154`

### 1.5rem (24px)
- `JourneySection.css:73`

### 0.9rem (14.4px)
- `Hero.css:168`

### 0.5rem (8px)
- `BrandsBanner.css:147`
