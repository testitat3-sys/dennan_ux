import React from "react";
import { DownloadCloud, X } from "lucide-react";

/**
 * Non-blocking prompt shown when the POS product catalog isn't cached on
 * this device (first-ever use, or the browser evicted IndexedDB). The
 * download itself runs in the background once triggered - this banner
 * never blocks any tab.
 */
export default function CatalogDownloadBanner({
  show,
  isOnline,
  onDownload,
  onDismiss,
  message = "Product catalog isn't downloaded on this device — offline walk-in sales won't work until this finishes.",
}) {
  if (!show) return null;

  return (
    <div
      className="status-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 16px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#fff",
        background: "#4338ca",
      }}
    >
      <DownloadCloud size={15} />
      <span style={{ flex: 1 }}>
        {message}
        {!isOnline && " Requires a connection."}
      </span>
      <button
        type="button"
        onClick={onDownload}
        disabled={!isOnline}
        style={{
          background: "#fff",
          color: "#4338ca",
          border: "none",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 700,
          cursor: isOnline ? "pointer" : "not-allowed",
          opacity: isOnline ? 1 : 0.6,
        }}
      >
        Download Products
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
