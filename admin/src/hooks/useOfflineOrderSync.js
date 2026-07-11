import { useCallback, useEffect, useRef, useState } from "react";
import {
  listPendingOrders,
  removePendingOrder,
  markPendingOrderFailed,
} from "../lib/offlineDb";

/**
 * Drains the offline walk-in order queue through the real createPhysicalOrder
 * mutation once connectivity returns. Orders are processed one at a time,
 * awaited in sequence (never in parallel) so stock decrements on the same
 * product across queued orders can't race each other server-side.
 *
 * Only fires on initial mount (if already online) and on offline->online
 * transitions - no polling/retry timer, so it's zero-cost while online.
 */
export function useOfflineOrderSync(token, createPhysicalOrderMutation, isOnline, onOrderSynced) {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedOrders, setFailedOrders] = useState([]);
  const wasOnline = useRef(isOnline);
  const isDraining = useRef(false);

  const refreshCounts = useCallback(async () => {
    const all = await listPendingOrders();
    setPendingCount(all.filter((o) => o.status === "pending").length);
    setFailedOrders(all.filter((o) => o.status === "failed"));
  }, []);

  const drainQueue = useCallback(async () => {
    if (isDraining.current || !token) return;
    isDraining.current = true;
    try {
      const all = await listPendingOrders();
      const pending = all.filter((o) => o.status === "pending");
      for (const order of pending) {
        try {
          await createPhysicalOrderMutation({ token, ...order.payload });
          await removePendingOrder(order.localId);
          onOrderSynced?.(order);
        } catch (err) {
          // Stop the batch on first failure (e.g. a real stock conflict
          // discovered server-side) rather than silently retrying and
          // risking a duplicate submission - staff review the failed entry
          // manually via the pending-sync indicator.
          console.error("[useOfflineOrderSync] failed to sync order:", err);
          await markPendingOrderFailed(order.localId, err.message);
          break;
        }
      }
    } finally {
      isDraining.current = false;
      refreshCounts();
    }
  }, [token, createPhysicalOrderMutation, refreshCounts, onOrderSynced]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    if (isOnline && token) {
      drainQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (isOnline && !wasOnline.current && token) {
      drainQueue();
    }
    wasOnline.current = isOnline;
  }, [isOnline, token, drainQueue]);

  return { pendingCount, failedOrders, refreshPendingOrders: refreshCounts };
}
