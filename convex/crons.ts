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

export default crons;
