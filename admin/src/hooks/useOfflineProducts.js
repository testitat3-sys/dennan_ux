import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  getAllCachedProducts,
  getMeta,
  putProductsBatch,
  markBootstrapped,
  applyProductDeltaBatch,
  markSynced,
} from "../lib/offlineDb";
import { useOnlineStatus } from "./useOnlineStatus";

// Skip a sync pass if the last one finished more recently than this - avoids
// every mount/reconnect on a device pulling its own full delta back-to-back.
const MIN_SYNC_INTERVAL_MS = 60 * 1000;

// Cross-tab coordination so two tabs on the same device don't both run a
// delta sync at once. Memory-only (no persisted lock): a tab that closes
// mid-sync just lets the flag expire via SYNC_LOCK_TIMEOUT_MS below.
const SYNC_CHANNEL_NAME = "dennan-pos-sync";
const SYNC_LOCK_TIMEOUT_MS = 15 * 1000;
let syncChannel = null;
let otherTabSyncingUntil = 0;
function getSyncChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!syncChannel) {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    syncChannel.onmessage = (event) => {
      if (event.data?.type === "syncing") {
        otherTabSyncingUntil = Date.now() + SYNC_LOCK_TIMEOUT_MS;
      }
    };
  }
  return syncChannel;
}

/**
 * Offline-first product catalog for the POS. The full ~4000-row catalog is
 * downloaded at most once per device, and only via an explicit
 * requestBootstrap() call (never silently) - see convex/products.ts:
 * getProductsForPOS. Every later sync only asks the server "what changed
 * since my last sync" via getProductsUpdatedSince - no standing reactive
 * subscription, no full re-fetch. If the local cache is missing
 * (needsBootstrap), the caller is responsible for prompting the user before
 * calling requestBootstrap().
 */
export function useOfflineProducts(token) {
  const convex = useConvex();
  const isOnline = useOnlineStatus();
  const [products, setProducts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  // True when this device has no downloaded catalog yet - either it's
  // brand new, or the browser evicted IndexedDB under storage pressure.
  // Nothing downloads the full catalog while this is true except an
  // explicit requestBootstrap() call - see StaffDashboard's download banner.
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const wasOnline = useRef(isOnline);

  const applyDeltaToState = useCallback((changed) => {
    setProducts((prev) => {
      const byId = new Map(prev.map((p) => [p._id, p]));
      for (const product of changed) {
        const { keep, ...rest } = product;
        if (keep) {
          byId.set(rest._id, rest);
        } else {
          byId.delete(rest._id);
        }
      }
      return Array.from(byId.values());
    });
  }, []);

  // On-demand, user-triggered full download - the only path that's allowed
  // to fetch the whole catalog. Never called automatically. Loops pages
  // (getProductsForPOS is paginated - the catalog is large enough to
  // exceed a single query's document-read limit) and only marks the device
  // bootstrapped once every page has been written locally.
  const requestBootstrap = useCallback(async () => {
    if (!token || !isOnline) {
      return { success: false, error: "offline" };
    }
    setIsSyncing(true);
    try {
      let cursor = null;
      let isDone = false;
      const accumulated = [];
      while (!isDone) {
        const result = await convex.query(api.products.getProductsForPOS, {
          token,
          paginationOpts: { numItems: 500, cursor },
        });
        await putProductsBatch(result.page);
        accumulated.push(...result.page);
        setProducts([...accumulated]);
        cursor = result.continueCursor;
        isDone = result.isDone;
      }
      await markBootstrapped();
      setNeedsBootstrap(false);
      return { success: true };
    } catch (err) {
      console.error("[useOfflineProducts] bootstrap failed:", err);
      return { success: false, error: err.message };
    } finally {
      setIsSyncing(false);
    }
  }, [convex, token, isOnline]);

  // Re-reads the bootstrapped flag straight from IndexedDB (rather than
  // trusting possibly-stale React state), so a mid-session eviction is
  // caught the next time this is called - e.g. every POS tab visit.
  const refreshBootstrapStatus = useCallback(async () => {
    const bootstrapped = await getMeta("bootstrapped");
    const needs = !bootstrapped;
    setNeedsBootstrap(needs);
    return needs;
  }, []);

  const sync = useCallback(async (force = false) => {
    if (!token) return;
    try {
      const bootstrapped = await getMeta("bootstrapped");
      if (!bootstrapped) {
        setNeedsBootstrap(true);
        return;
      }

      const since = (await getMeta("lastSyncedAt")) || 0;
      if (!force && since && Date.now() - since < MIN_SYNC_INTERVAL_MS) {
        return;
      }
      if (!force && Date.now() < otherTabSyncingUntil) {
        return;
      }

      setIsSyncing(true);
      getSyncChannel()?.postMessage({ type: "syncing", at: Date.now() });
      // Captured before the loop starts (not read again per page) - the
      // cursor only advances to this point once every page of this pass
      // has been applied, so a mid-loop failure can't skip rows.
      const syncStartedAt = Date.now();

      let cursor = null;
      let isDone = false;
      while (!isDone) {
        const result = await convex.query(api.products.getProductsUpdatedSince, {
          token,
          since,
          paginationOpts: { numItems: 500, cursor },
        });
        if (result.page.length > 0) {
          await applyProductDeltaBatch(result.page);
          applyDeltaToState(result.page);
        }
        cursor = result.continueCursor;
        isDone = result.isDone;
      }
      // Bump lastSyncedAt regardless of whether anything changed, so the
      // next delta window starts from now, not from a stale timestamp.
      await markSynced(syncStartedAt);
    } catch (err) {
      console.error("[useOfflineProducts] sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [convex, token, applyDeltaToState]);

  // Load whatever's cached immediately so the grid renders instantly, even
  // offline, before any network call resolves.
  useEffect(() => {
    getAllCachedProducts().then(setProducts);
    getMeta("bootstrapped").then((bootstrapped) => setNeedsBootstrap(!bootstrapped));
  }, []);

  // Sync once on mount (bootstrap or catch-up delta) if online.
  useEffect(() => {
    if (isOnline && token) {
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sync again on every offline -> online transition.
  useEffect(() => {
    if (isOnline && !wasOnline.current && token) {
      sync();
    }
    wasOnline.current = isOnline;
  }, [isOnline, token, sync]);

  return { products, isSyncing, needsBootstrap, requestBootstrap, refreshBootstrapStatus };
}
