import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/**
 * Drop-in replacement for `useQuery` for functions defined with
 * `trackedQuery` (convex/lib/ioTracking.ts). Those queries can't persist
 * their own read-count tally (Convex queries can't write), so they piggyback
 * it on the return value as `_io`. This hook reports that tally via the
 * `recordIO` mutation and returns just the underlying `data`, so callers see
 * the exact same shape `useQuery` would have returned pre-instrumentation.
 *
 * Reporting is gated on `result`'s reference identity via the effect's
 * dependency array, not on the tally's contents - Convex's `useQuery` only
 * hands back a new `result` object when the query actually re-executes, so
 * this naturally reports exactly once per real invocation. Deduping on
 * `reads` value instead would silently drop distinct invocations that
 * happen to read the same document count, undercounting invocations.
 *
 * `sampleRate` (storefront-only - admin traffic is naturally low-volume and
 * doesn't need this): report only 1-in-`sampleRate` invocations, scaling the
 * reported `reads`/`invocations` up by `sampleRate` so the admin dashboard's
 * totals stay a reasonable estimate of true volume instead of undercounting
 * high-traffic public queries. Recorded rows are extrapolated, not exact -
 * this trades precision for not turning the tracker itself into a write-
 * amplification hazard on hot storefront pages.
 */
export function useTrackedQuery(functionRef, args, sampleRate = 1) {
  const result = useQuery(functionRef, args);
  const recordIO = useMutation(api.dbIOStats.recordIO);

  useEffect(() => {
    if (!result || !result._io) return;
    const { fn, reads } = result._io;

    if (sampleRate > 1 && Math.random() >= 1 / sampleRate) return;

    recordIO({ fn, reads: reads * sampleRate }).catch(() => {
      // Instrumentation must never surface as a UI error.
    });
  }, [result, recordIO, sampleRate]);

  if (result === undefined) return undefined;
  return result.data;
}
