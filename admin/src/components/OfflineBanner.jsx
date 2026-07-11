import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Sticky connectivity indicator for the admin/staff portal. Shown whenever
 * the browser reports no connection, and (when provided) how many walk-in
 * sales are queued waiting to sync back to the server.
 */
export default function OfflineBanner({ isOnline, pendingCount = 0, failedCount = 0 }) {
  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  return (
    <div
      className="status-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#fff",
        background: !isOnline ? "#b45309" : failedCount > 0 ? "#b91c1c" : "#2563eb",
      }}
    >
      {!isOnline ? <WifiOff size={15} /> : <RefreshCw size={15} />}
      {!isOnline ? (
        <span>
          Working offline — sales will sync automatically when the connection returns.
          {pendingCount > 0 ? ` (${pendingCount} waiting to sync)` : ""}
        </span>
      ) : pendingCount > 0 ? (
        <span>Syncing {pendingCount} offline sale{pendingCount === 1 ? "" : "s"}…</span>
      ) : (
        <span>{failedCount} offline sale{failedCount === 1 ? "" : "s"} need review — see the POS tab.</span>
      )}
    </div>
  );
}
