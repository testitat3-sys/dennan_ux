// Rule-based suggestion mapper for common error message patterns thrown
// across convex/staffAuth.ts and friends, plus generic network/offline cases.
const RULES = [
  { pattern: /session (token is missing|expired|invalid)/i, suggestion: "Your session may have expired — try logging out and back in." },
  { pattern: /unauthorized/i, suggestion: "Your session may have expired — try logging out and back in." },
  { pattern: /access denied/i, suggestion: "You may not have permission for this action. Contact an admin if you believe this is wrong." },
  { pattern: /network|fetch|offline|failed to fetch/i, suggestion: "Check your internet connection and try again." },
  { pattern: /not found/i, suggestion: "The item you were looking for may have been moved or deleted. Try refreshing." },
  { pattern: /rate limit|too many requests/i, suggestion: "You're doing that too fast — wait a moment and try again." },
];

export function getSuggestion(message) {
  if (!message) return "Something went wrong. If this keeps happening, tell the dev team.";
  const rule = RULES.find((r) => r.pattern.test(message));
  return rule ? rule.suggestion : "Something went wrong. If this keeps happening, tell the dev team.";
}
