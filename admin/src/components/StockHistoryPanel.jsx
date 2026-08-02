import React, { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const SOURCE_LABELS = {
  manual_adjust: "Manual adjustment",
  stock_request_approval: "Approved stock request",
  bulk_upload: "Bulk upload",
};

const SOURCE_FILTERS = [
  { value: "", label: "All sources" },
  { value: "manual_adjust", label: "Manual adjustments" },
  { value: "stock_request_approval", label: "Approved stock requests" },
  { value: "bulk_upload", label: "Bulk uploads" },
];

export default function StockHistoryPanel({ token }) {
  const [sourceFilter, setSourceFilter] = useState("");

  const { results, status, loadMore } = usePaginatedQuery(
    api.stockHistory.getStockHistoryFeed,
    { token, source: sourceFilter || undefined },
    { initialNumItems: 30 }
  );

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Stock History</h1>
        <select
          className="form-input"
          style={{ maxWidth: "240px" }}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          {SOURCE_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {results === undefined || status === "LoadingFirstPage" ? (
        <div className="empty-state">
          <div className="empty-title">Loading stock history...</div>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No recorded stock changes yet.</div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Change</th>
                  <th>Before → After</th>
                  <th>Source</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row._id}>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td><strong>{row.productName}</strong></td>
                    <td>{row.barcode || "—"}</td>
                    <td style={{ color: row.delta > 0 ? "var(--color-support-green, #4ade80)" : "var(--color-support-red, #ef4444)", fontWeight: 600 }}>
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                    <td>{row.beforeInventory} → {row.afterInventory}</td>
                    <td>
                      {SOURCE_LABELS[row.source] || row.source}
                      {row.note && <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{row.note}</div>}
                    </td>
                    <td>{row.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {status === "CanLoadMore" && (
            <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              <button className="btn btn--secondary btn--sm" onClick={() => loadMore(30)}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
