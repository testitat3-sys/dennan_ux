/**
 * Shared presentation helpers for the loyaltyTier/churnRisk/engagementScore
 * fields computed in convex/users.ts (recalculateEngagementAndChurn).
 * churnRisk and engagementScore are both 0-100 numbers; this file is the one
 * place that turns them into bands/labels/colors so the Customers tab and
 * the CRM profile modal stay in sync if the thresholds ever change.
 */

export const CHURN_BAND_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "—",
};

/** Buckets a raw 0-100 churnRisk score into a filterable/displayable band. */
export function getChurnBand(churnRisk) {
  if (churnRisk === undefined || churnRisk === null) return "unknown";
  if (churnRisk >= 67) return "high";
  if (churnRisk >= 34) return "medium";
  return "low";
}

export const LOYALTY_TIER_LABELS = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const LOYALTY_TIER_OPTIONS = [
  { value: "all", label: "All tiers" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

export const CHURN_BAND_OPTIONS = [
  { value: "all", label: "All churn risk" },
  { value: "high", label: "At risk (high)" },
  { value: "medium", label: "Medium risk" },
  { value: "low", label: "Low risk" },
];

/** Maps a churn band to the .active-badge--* CSS modifier used across admin. */
export const CHURN_BAND_BADGE_CLASS = {
  high: "active-badge--red",
  medium: "active-badge--amber",
  low: "active-badge--on",
  unknown: "active-badge--off",
};

/** Maps a loyaltyTier to the .active-badge--* CSS modifier used across admin. */
export const LOYALTY_TIER_BADGE_CLASS = {
  bronze: "active-badge--off",
  silver: "active-badge--silver",
  gold: "active-badge--gold",
  platinum: "active-badge--platinum",
};
