import React, { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  CheckCircle,
  X,
  ChevronRight,
} from "lucide-react";

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Derive a single overall status label for a return envelope. */
function getReturnOverallStatus(ret) {
  const allItems = ret.items || [];
  if (allItems.length === 0) return "pending";
  const allResolved = allItems.every((i) => i.status !== "pending");
  const allRejected = allItems.every((i) => i.status === "rejected");
  if (allRejected) return "rejected";
  if (allResolved) return "resolved";
  return "pending";
}

/** Small pill badge matching the existing status-badge design system. */
function OverallStatusBadge({ status }) {
  const map = {
    pending: { cls: "status-badge--new", label: "Pending" },
    resolved: { cls: "status-badge--done", label: "Resolved" },
    rejected: { cls: "status-badge--failed", label: "Rejected" },
  };
  const { cls, label } = map[status] || map.pending;
  return (
    <span className={`status-badge ${cls}`} style={{ fontFamily: "var(--font-sans)" }}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

/** Per-item outcome label shown inside the modal for non-pending items. */
function ItemOutcomeLabel({ item }) {
  if (item.status === "approved") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--color-support-green, #4ade80)", fontSize: "var(--label-md)", fontWeight: 600, fontFamily: "var(--font-sans)" }}>
        <CheckCircle size={13} /> Approved{item.restocked ? " & Restocked" : ""}
      </span>
    );
  }
  if (item.status === "rejected") {
    return (
      <span style={{ color: "var(--color-support-red, #ef4444)", fontSize: "var(--label-md)", fontFamily: "var(--font-sans)" }}>
        Rejected{item.rejectedReason ? `: ${item.rejectedReason}` : ""}
      </span>
    );
  }
  return <span className="returns-panel-meta" style={{ fontFamily: "var(--font-sans)" }}>—</span>;
}

/* ─── RETURN DETAIL MODAL (read-only ledger) ─────────────────────────── */
function ReturnDetailModal({ ret, onClose }) {
  const hasExchange = ret.exchangeItems && ret.exchangeItems.length > 0;

  return (
    <div className="modal-overlay is-open" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ fontFamily: "var(--font-sans)" }}>
      <div className="modal" style={{ maxWidth: "720px", fontFamily: "var(--font-sans)" }}>
        {/* ── Modal header ── */}
        <div className="modal-header" style={{ alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="modal-title" style={{ marginBottom: "2px", fontFamily: "var(--font-editorial)" }}>
              {ret.customerName}
            </h2>
            <div className="returns-panel-meta" style={{ marginTop: "2px", fontFamily: "var(--font-sans)" }}>
              Submitted by {ret.staffName} on{" "}
              {new Date(ret.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {ret.note && (
              <div className="returns-panel-note" style={{ marginTop: "var(--space-1)", fontFamily: "var(--font-sans)" }}>
                Note: {ret.note}
              </div>
            )}
            {(ret.returnedTotal !== undefined || ret.exchangeTotal !== undefined) && (
              <div className="returns-panel-note" style={{ marginTop: "var(--space-1)", fontFamily: "var(--font-sans)" }}>
                Returned value: UGX {(ret.returnedTotal || 0).toLocaleString()} · Exchange
                value: UGX {(ret.exchangeTotal || 0).toLocaleString()}
                {ret.topUpAmount > 0 &&
                  ` · Top-up collected: UGX ${ret.topUpAmount.toLocaleString()} (${ret.topUpMethod})`}
              </div>
            )}
          </div>

          <button
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: "6px", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Returned items table (read-only ledger) ── */}
        <div className="table-wrap">
          <table className="data-table" style={{ fontFamily: "var(--font-sans)" }}>
            <thead>
              <tr>
                <th style={{ fontFamily: "var(--font-sans)" }}>Product</th>
                <th style={{ fontFamily: "var(--font-sans)" }}>Qty</th>
                <th style={{ fontFamily: "var(--font-sans)" }}>Unit Price</th>
                <th style={{ fontFamily: "var(--font-sans)" }}>Reason</th>
                <th style={{ fontFamily: "var(--font-sans)" }}>Source</th>
                <th style={{ fontFamily: "var(--font-sans)" }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {ret.items.map((item) => (
                <tr key={item._id}>
                  <td className="item-name" style={{ fontFamily: "var(--font-sans)" }}>{item.productName}</td>
                  <td className="item-qty" style={{ fontFamily: "var(--font-sans)" }}>{item.quantity}</td>
                  <td style={{ fontFamily: "var(--font-sans)" }}>UGX {item.unitPrice.toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--font-sans)" }}>{item.reason || "—"}</td>
                  <td style={{ fontFamily: "var(--font-sans)" }}>
                    {item.source === "delivery_failure" ? "Delivery Failure" : "Manual Return"}
                  </td>
                  <td><ItemOutcomeLabel item={item} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Exchange items ── */}
        {hasExchange && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <div className="returns-panel-meta" style={{ marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-sans)" }}>
              <CheckCircle size={12} style={{ verticalAlign: "-2px" }} />
              Given in exchange:
            </div>
            <div className="table-wrap">
              <table className="data-table" style={{ fontFamily: "var(--font-sans)" }}>
                <thead>
                  <tr>
                    <th style={{ fontFamily: "var(--font-sans)" }}>Product</th>
                    <th style={{ fontFamily: "var(--font-sans)" }}>Qty</th>
                    <th style={{ fontFamily: "var(--font-sans)" }}>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {ret.exchangeItems.map((item) => (
                    <tr key={item._id}>
                      <td className="item-name" style={{ fontFamily: "var(--font-sans)" }}>{item.productName}</td>
                      <td className="item-qty" style={{ fontFamily: "var(--font-sans)" }}>{item.quantity}</td>
                      <td style={{ fontFamily: "var(--font-sans)" }}>UGX {item.unitPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Footer close button ── */}
        <div style={{ marginTop: "var(--space-6)", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn--secondary btn--md" onClick={onClose} style={{ fontFamily: "var(--font-sans)" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── RETURNS PANEL ───────────────────────────────────────────── */
export default function ReturnsPanel({ token }) {
  const todayStr = getTodayDateStr();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const { results: returns, status: returnsStatus, loadMore } = usePaginatedQuery(
    api.returns.getReturnsByDateRange,
    { token, startDate, endDate },
    { initialNumItems: 25 }
  );

  const isToday = startDate === todayStr && endDate === todayStr;

  const handleResetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  return (
    <div className="admin-tab-panel is-active" style={{ fontFamily: "var(--font-sans)" }}>
      <h1 className="admin-page-title" style={{ fontFamily: "var(--font-editorial)" }}>Returns</h1>

      {/* ── Date filter bar ── */}
      <div
        className="date-filter-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-3)",
          flexWrap: "wrap",
          fontFamily: "var(--font-sans)",
        }}
      >
        <label className="form-label" style={{ margin: 0, fontFamily: "var(--font-sans)" }}>
          From
          <input
            type="date"
            className="form-input"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ marginLeft: "6px", fontFamily: "var(--font-sans)" }}
          />
        </label>
        <label className="form-label" style={{ margin: 0, fontFamily: "var(--font-sans)" }}>
          To
          <input
            type="date"
            className="form-input"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ marginLeft: "6px", fontFamily: "var(--font-sans)" }}
          />
        </label>
        {!isToday && (
          <button className="btn btn--secondary btn--sm" onClick={handleResetToday} style={{ fontFamily: "var(--font-sans)" }}>
            Reset to Today
          </button>
        )}
      </div>

      {/* ── List ── */}
      {returnsStatus === "LoadingFirstPage" ? (
        <div className="empty-state" style={{ fontFamily: "var(--font-sans)" }}>
          <div className="empty-title" style={{ fontFamily: "var(--font-editorial)" }}>Loading returns...</div>
        </div>
      ) : returns.length === 0 ? (
        <div className="empty-state" style={{ fontFamily: "var(--font-sans)" }}>
          <div className="empty-title" style={{ fontFamily: "var(--font-editorial)" }}>No returns in this period.</div>
          <div className="empty-sub">Delivery-failure and customer returns will appear here.</div>
        </div>
      ) : (
        <>
          <div className="returns-panel-list" style={{ gap: "var(--space-2)", fontFamily: "var(--font-sans)" }}>
            {returns.map((ret) => {
              const overallStatus = getReturnOverallStatus(ret);
              const isResolved = overallStatus !== "pending";

              const productSummary = (ret.items || [])
                .map((i) => `${i.productName} x${i.quantity}`)
                .join(", ");

              return (
                <button
                  key={ret.returnId}
                  className="returns-panel-card"
                  onClick={() => setSelectedReturn(ret)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "var(--space-3) var(--space-4)",
                    gap: 0,
                    opacity: isResolved ? 0.82 : 1,
                    fontFamily: "var(--font-sans)",
                  }}
                  aria-label={`View return for ${ret.customerName}`}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--space-3)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "var(--body-md)", fontFamily: "var(--font-body-heavy)" }}>{ret.customerName}</strong>
                        <OverallStatusBadge status={overallStatus} />
                      </div>
                      <div
                        className="returns-panel-meta"
                        style={{
                          marginTop: "3px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-sans)",
                        }}
                        title={productSummary}
                      >
                        {productSummary}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-4)",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--body-sm)", fontFamily: "var(--font-body-heavy)" }}>
                          UGX {(ret.returnedTotal || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "var(--label-md)", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
                          {new Date(ret.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {returnsStatus === "CanLoadMore" && (
            <button
              className="btn btn--secondary btn--md"
              onClick={() => loadMore(25)}
              style={{ marginTop: "var(--space-3)", fontFamily: "var(--font-sans)" }}
            >
              Load More Returns
            </button>
          )}
        </>
      )}

      {/* ── Detail modal ── */}
      {selectedReturn && (
        <ReturnDetailModal
          ret={selectedReturn}
          onClose={() => setSelectedReturn(null)}
        />
      )}
    </div>
  );
}
