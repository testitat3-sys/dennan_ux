import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/**
 * Records client-side timing samples (render duration, search-filter
 * duration, etc.) to the `perfMetrics`/`perfMetricsAllTime` tables surfaced
 * on the admin Settings > Performance panel. Fire-and-forget, same idiom as
 * useTrackedQuery: a failed write must never surface as a UI error, and
 * callers never await it.
 */
export function usePerfTracking(token) {
  const recordPerfSample = useMutation(api.perfMetrics.recordPerfSample);

  const recordSample = useCallback(
    (metric, ms) => {
      if (!token) return;
      recordPerfSample({ token, metric, ms }).catch(() => {
        // Instrumentation must never surface as a UI error.
      });
    },
    [token, recordPerfSample]
  );

  return recordSample;
}
