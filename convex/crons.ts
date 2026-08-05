import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly safety net: rebuild the {ok, low, out} stockCounters singleton
// from the products table, in case any write path drifts it out of sync.
crons.cron(
  "recompute stock counters",
  "0 3 * * *", // 03:00 UTC nightly (06:00 EAT)
  internal.stockCounters.recomputeStockCounters,
  {}
);

// Nightly: recompute engagementScore/churnRisk for every customer, so scores
// decay purely from inactivity even when nobody logs an order or CRM touch.
crons.cron(
  "recompute engagement and churn scores",
  "0 4 * * *", // 04:00 UTC nightly (07:00 EAT)
  internal.users.recalculateEngagementAndChurnForAllCustomers,
  {}
);

export default crons;
