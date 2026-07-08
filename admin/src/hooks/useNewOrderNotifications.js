import { useEffect, useRef } from "react";

const CHIME_URL = "/sounds/new-order-chime.wav";

// Watches the live `unclaimedOrders` list (already reactive via Convex useQuery) and
// fires a toast + audio chime + browser Notification for every order id that wasn't
// present on a previous render. Seeds silently on first mount so pre-existing orders
// don't trigger a notification storm on page load/refresh.
export function useNewOrderNotifications(unclaimedOrders, { onNewOrder }) {
  const seenIds = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(CHIME_URL);
    }
  }, []);

  useEffect(() => {
    if (!unclaimedOrders) return;

    if (seenIds.current === null) {
      // First time we see real data: seed without notifying.
      seenIds.current = new Set(unclaimedOrders.map((o) => o._id));
      return;
    }

    const newOnes = unclaimedOrders.filter((o) => !seenIds.current.has(o._id));
    if (newOnes.length === 0) return;

    for (const order of newOnes) {
      seenIds.current.add(order._id);

      onNewOrder?.(order);

      try {
        audioRef.current?.play()?.catch(() => {});
      } catch {
        // Autoplay can be blocked before any user gesture — non-fatal.
      }

      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("New order received", {
            body: `${order.customerName} — UGX ${order.grandTotal?.toLocaleString?.() ?? order.grandTotal}`,
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("New order received", {
                body: `${order.customerName} — UGX ${order.grandTotal?.toLocaleString?.() ?? order.grandTotal}`,
              });
            }
          });
        }
      }
    }
  }, [unclaimedOrders, onNewOrder]);
}
