import React from "react";
import { X } from "lucide-react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";

const SOURCE_LABELS = {
  manual_adjust: "Manual adjustment",
  stock_request_approval: "Approved stock request",
  bulk_upload: "Bulk upload",
};

export default function StockHistoryModal({ product, displayName, token, onClose }) {
  const history = useTrackedQuery(
    api.stockHistory.getProductStockHistory,
    product ? { token, productId: product.id } : "skip"
  );

  if (!product) return null;

  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Stock History — {displayName ?? product.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-form">
          {history === undefined ? (
            <div className="empty-state">
              <div className="empty-title">Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No recorded stock changes yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Change</th>
                    <th>Before → After</th>
                    <th>Source</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row._id}>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
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
          )}
        </div>
      </div>
    </div>
  );
}
