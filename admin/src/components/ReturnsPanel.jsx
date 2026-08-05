import React, { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import ReceiptModal from "./ReceiptModal";
import {
  CheckCircle,
  X,
  ChevronRight,
  Search,
  Receipt,
  RotateCcw,
  Printer,
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

function buildReturnReceipt(ret) {
  return {
    isReturn: true,
    type: "return",
    returnId: ret.returnId,
    receiptNumber: ret.receiptNumber || `RET-${(ret.returnId ? ret.returnId.toString() : "").slice(-8).toUpperCase()}`,
    orderReceiptNumber: ret.orderReceiptNumber,
    date: ret.createdAt,
    customerName: ret.customerName,
    customerPhone: ret.customerPhone,
    cashier: ret.staffName,
    returnedItems: (ret.items || []).map((i) => ({
      name: i.productName || i.name,
      quantity: i.quantity,
      price: i.unitPrice || i.price,
    })),
    exchangeItems: (ret.exchangeItems || []).map((i) => ({
      name: i.productName || i.name,
      quantity: i.quantity,
      price: i.unitPrice || i.price,
    })),
    returnedTotal: ret.returnedTotal ?? (ret.items || []).reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0),
    exchangeTotal: ret.exchangeTotal ?? (ret.exchangeItems || []).reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0),
    topUpAmount: ret.topUpAmount || 0,
    topUpMethod: ret.topUpMethod,
    note: ret.note,
  };
}

function buildOrderReceipt(order) {
  return {
    orderId: order._id,
    receiptNumber: order.receiptNumber,
    date: order.createdAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    cashier: order.claimantName || "Staff",
    items: (order.items || []).map((i) => ({
      name: i.productName || i.name,
      quantity: i.quantity,
      price: i.unitPrice || i.price,
    })),
    payments: order.payments || [],
    subtotal: order.subtotal || order.grandTotal,
    discountAmount: order.discountAmount || 0,
    deliveryFee: order.deliveryFee || 0,
    total: order.grandTotal,
  };
}

/* ─── RETURN DETAIL MODAL (read-only ledger) ─────────────────────────── */
function ReturnDetailModal({ ret, onClose, onPrintReceipt }) {
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
              Receipt: <strong>#{ret.receiptNumber || `RET-${(ret.returnId ? ret.returnId.toString() : "").slice(-8).toUpperCase()}`}</strong> · Submitted by {ret.staffName} on{" "}
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

        {/* ── Footer actions ── */}
        <div style={{ marginTop: "var(--space-6)", display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button className="btn btn--secondary btn--md" onClick={onClose} style={{ fontFamily: "var(--font-sans)" }}>
            Close
          </button>
          <button
            className="btn btn--primary btn--md"
            onClick={() => onPrintReceipt(ret)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-sans)" }}
          >
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── RETURNS PANEL ───────────────────────────────────────────── */
export default function ReturnsPanel({ token }) {
  const navigate = useNavigate();
  const todayStr = getTodayDateStr();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Receipt Search State
  const [receiptInput, setReceiptInput] = useState("");
  const [searchedReceipt, setSearchedReceipt] = useState("");

  const searchResult = useTrackedQuery(
    api.returns.searchReceipts,
    token && searchedReceipt ? { token, query: searchedReceipt } : "skip"
  );

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

  const handleReceiptSearch = (e) => {
    e.preventDefault();
    const clean = receiptInput.trim();
    if (clean) {
      setSearchedReceipt(clean);
    }
  };

  const handleClearSearch = () => {
    setReceiptInput("");
    setSearchedReceipt("");
  };

  return (
    <div className="admin-tab-panel is-active" style={{ fontFamily: "var(--font-sans)" }}>
      <h1 className="admin-page-title" style={{ fontFamily: "var(--font-editorial)" }}>Returns & Receipts</h1>

      {/* ── Receipt Search Section ── */}
      <div
        className="table-wrap"
        style={{
          padding: "var(--space-4)",
          marginBottom: "var(--space-4)",
          background: "var(--surface)",
          borderRadius: "var(--radius-lg, 8px)",
          border: "1px solid var(--surface-container-high)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <Receipt size={18} style={{ color: "var(--text-secondary)" }} />
          <h2 style={{ fontSize: "var(--body-md, 15px)", fontWeight: 600, margin: 0, fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}>
            Search Order & Return Receipts
          </h2>
        </div>
        <p style={{ fontSize: "var(--label-md, 13px)", color: "var(--text-tertiary)", margin: "0 0 var(--space-3) 0", fontFamily: "var(--font-sans)" }}>
          Enter an order receipt number (e.g. RCP-20260728-A1B2) or return receipt number (e.g. RET-20260805-X9Y8) to locate receipts or process exchanges.
        </p>

        <form onSubmit={handleReceiptSearch} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. RCP-20260728-A1B2 or RET-20260805-X9Y8"
            value={receiptInput}
            onChange={(e) => setReceiptInput(e.target.value)}
            style={{ flex: 1, minWidth: "240px", fontFamily: "var(--font-sans)" }}
          />
          <button type="submit" className="btn btn--primary btn--md" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-sans)" }}>
            <Search size={16} /> Search Receipts
          </button>
          {searchedReceipt && (
            <button type="button" className="btn btn--secondary btn--md" onClick={handleClearSearch} style={{ fontFamily: "var(--font-sans)" }}>
              Clear
            </button>
          )}
        </form>

        {/* ── Search Result Cards ── */}
        {searchedReceipt && (
          <div style={{ marginTop: "var(--space-3)" }}>
            {searchResult === undefined ? (
              <div style={{ fontSize: "var(--body-sm)", color: "var(--text-tertiary)", padding: "var(--space-2)" }}>
                Searching indexed database for receipt <strong>{searchedReceipt}</strong>...
              </div>
            ) : !searchResult.order && (!searchResult.returns || searchResult.returns.length === 0) ? (
              <div style={{ padding: "var(--space-3)", background: "var(--color-support-red-light, #fef2f2)", color: "var(--color-support-red, #ef4444)", borderRadius: "var(--radius-md, 6px)", fontSize: "var(--body-sm)" }}>
                No order or return receipt found matching <strong>{searchedReceipt}</strong>. Please verify the receipt number.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {/* Order Result Card */}
                {searchResult.order && (
                  <div
                    style={{
                      padding: "var(--space-4)",
                      background: "var(--surface-container-low, var(--surface))",
                      borderRadius: "var(--radius-md, 6px)",
                      border: "1px solid var(--surface-container-high)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "var(--space-3)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <strong style={{ fontSize: "var(--body-md)", fontFamily: "var(--font-body-heavy)", color: "var(--text-primary)" }}>{searchResult.order.customerName}</strong>
                        <span className="status-badge status-badge--done" style={{ fontFamily: "var(--font-sans)" }}>
                          Original Order: {searchResult.order.receiptNumber || searchedReceipt}
                        </span>
                        <span className="status-badge status-badge--new" style={{ fontFamily: "var(--font-sans)" }}>
                          {searchResult.order.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "var(--body-sm)", color: "var(--text-secondary)", marginTop: "4px" }}>
                        Placed on {new Date(searchResult.order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {" · "}Total: <strong>UGX {(searchResult.order.grandTotal || 0).toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: "var(--label-md)", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        Items: {searchResult.order.items?.map((i) => `${i.productName} (x${i.quantity})`).join(", ") || "N/A"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <button
                        className="btn btn--outline btn--md"
                        onClick={() => setActiveReceipt(buildOrderReceipt(searchResult.order))}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-sans)" }}
                      >
                        <Printer size={16} /> View Order Receipt
                      </button>
                      <button
                        className="btn btn--primary btn--md"
                        onClick={() => navigate(`/admin/orders/${searchResult.order._id}/exchange`)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-sans)" }}
                      >
                        <RotateCcw size={16} /> Process Return / Exchange
                      </button>
                    </div>
                  </div>
                )}

                {/* Return Result Cards */}
                {searchResult.returns && searchResult.returns.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--body-sm)", color: "var(--text-secondary)" }}>
                      Matching Return Receipts ({searchResult.returns.length}):
                    </div>
                    {searchResult.returns.map((ret) => (
                      <div
                        key={ret.returnId}
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          background: "var(--surface)",
                          borderRadius: "var(--radius-md, 6px)",
                          border: "1px solid var(--surface-container-high)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "var(--space-3)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                            <strong style={{ fontSize: "var(--body-md)" }}>{ret.customerName}</strong>
                            <span className="status-badge status-badge--done">
                              Receipt #{ret.receiptNumber}
                            </span>
                          </div>
                          <div style={{ fontSize: "var(--body-sm)", color: "var(--text-secondary)", marginTop: "2px" }}>
                            Processed on {new Date(ret.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} by {ret.staffName}
                          </div>
                          <div style={{ fontSize: "var(--label-md)", color: "var(--text-tertiary)", marginTop: "2px" }}>
                            Returned Total: UGX {(ret.returnedTotal || 0).toLocaleString()}
                            {ret.exchangeTotal !== undefined && ` · Exchange Total: UGX ${ret.exchangeTotal.toLocaleString()}`}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => setSelectedReturn(ret)}
                          >
                            Details
                          </button>
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => setActiveReceipt(buildReturnReceipt(ret))}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Printer size={14} /> Print Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* ── Returns List ── */}
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
                <div
                  key={ret.returnId}
                  className="returns-panel-card"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    gap: "var(--space-3)",
                    opacity: isResolved ? 0.82 : 1,
                    fontFamily: "var(--font-sans)",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md, 6px)",
                    border: "1px solid var(--surface-container-high)",
                  }}
                >
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                    onClick={() => setSelectedReturn(ret)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "var(--body-md)", fontFamily: "var(--font-body-heavy)" }}>{ret.customerName}</strong>
                      <span className="status-badge status-badge--done" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--label-sm)" }}>
                        #{ret.receiptNumber || `RET-${(ret.returnId ? ret.returnId.toString() : "").slice(-8).toUpperCase()}`}
                      </span>
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
                      gap: "var(--space-3)",
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

                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => setActiveReceipt(buildReturnReceipt(ret))}
                      title="Print Return Receipt"
                      style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <Printer size={15} />
                      Print
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setSelectedReturn(ret)}
                      title="View Return Details"
                      style={{ padding: "6px" }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
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
          onPrintReceipt={(ret) => {
            setSelectedReturn(null);
            setActiveReceipt(buildReturnReceipt(ret));
          }}
        />
      )}

      {/* ── Printable Receipt Modal ── */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
