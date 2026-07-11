import React, { useState } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { CheckCircle, XCircle, PackageCheck, PackageX, RotateCcw } from "lucide-react";
import TradeReturnModal from "./TradeReturnModal";

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReturnsPanel({ token }) {
  const todayStr = getTodayDateStr();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [tradingReturn, setTradingReturn] = useState(null);

  const { results: returns, status: returnsStatus, loadMore } = usePaginatedQuery(
    api.returns.getReturnsByDateRange,
    { token, startDate, endDate },
    { initialNumItems: 25 }
  );

  const approveReturnItem = useMutation(api.returns.approveReturnItem);
  const rejectReturnItem = useMutation(api.returns.rejectReturnItem);
  const attachExchangeToReturn = useMutation(api.returns.attachExchangeToReturn);
  const rejectReturn = useMutation(api.returns.rejectReturn);

  const isToday = startDate === todayStr && endDate === todayStr;

  const handleResetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleApprove = async (returnItemId, restock) => {
    try {
      await approveReturnItem({ token, returnItemId, restock });
    } catch (err) {
      alert("Failed to approve return item: " + err.message);
    }
  };

  const handleReject = async (returnItemId) => {
    const rejectedReason = window.prompt("Reason for rejecting this item (optional):") || undefined;
    try {
      await rejectReturnItem({ token, returnItemId, rejectedReason });
    } catch (err) {
      alert("Failed to reject return item: " + err.message);
    }
  };

  const handleRejectReturn = async (returnId) => {
    const rejectedReason = window.prompt("Reason for refusing this return:") || undefined;
    if (rejectedReason === undefined) return;
    try {
      await rejectReturn({ token, returnId, rejectedReason });
    } catch (err) {
      alert("Failed to reject return: " + err.message);
    }
  };

  const handleTradeSubmit = async ({ returnId, exchangeItems, topUp }) => {
    try {
      await attachExchangeToReturn({ token, returnId, exchangeItems, topUp });
      setTradingReturn(null);
      return true;
    } catch (err) {
      alert("Failed to process trade: " + err.message);
      return false;
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">Returns</h1>

      <div className="date-filter-bar" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <label className="form-label" style={{ margin: 0 }}>
          From
          <input
            type="date"
            className="form-input"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ marginLeft: "6px" }}
          />
        </label>
        <label className="form-label" style={{ margin: 0 }}>
          To
          <input
            type="date"
            className="form-input"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ marginLeft: "6px" }}
          />
        </label>
        {!isToday && (
          <button className="btn btn--secondary btn--sm" onClick={handleResetToday}>
            Reset to Today
          </button>
        )}
      </div>

      {returnsStatus === "LoadingFirstPage" ? (
        <div className="empty-state">
          <div className="empty-title">Loading returns...</div>
        </div>
      ) : returns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No returns in this period.</div>
          <div className="empty-sub">Delivery-failure and customer returns will appear here.</div>
        </div>
      ) : (
        <>
          <div className="returns-panel-list">
            {returns.map((ret) => {
              const hasPendingItems = ret.items.some((item) => item.status === "pending");
              const hasExchange = ret.exchangeItems && ret.exchangeItems.length > 0;
              return (
                <div key={ret.returnId} className="returns-panel-card">
                  <div className="returns-panel-card-header">
                    <div>
                      <strong>{ret.customerName}</strong>
                      <div className="returns-panel-meta">
                        Submitted by {ret.staffName} on {new Date(ret.createdAt).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                      {ret.note && <div className="returns-panel-note">Note: {ret.note}</div>}
                      {(ret.returnedTotal !== undefined || ret.exchangeTotal !== undefined) && (
                        <div className="returns-panel-note" style={{ marginTop: "4px" }}>
                          Returned value: UGX {(ret.returnedTotal || 0).toLocaleString()} · Exchange value: UGX {(ret.exchangeTotal || 0).toLocaleString()}
                          {ret.topUpAmount > 0 && ` · Top-up collected: UGX ${ret.topUpAmount.toLocaleString()} (${ret.topUpMethod})`}
                        </div>
                      )}
                    </div>
                    {hasPendingItems && !hasExchange && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => setTradingReturn(ret)}
                          title="Resolve by trading for a replacement product"
                        >
                          <RotateCcw size={13} /> Trade
                        </button>
                        <button
                          className="btn btn--ghost btn--danger btn--sm"
                          onClick={() => handleRejectReturn(ret.returnId)}
                          title="Refuse this return altogether"
                        >
                          <XCircle size={13} /> Reject Return
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Reason</th>
                          <th>Source</th>
                          <th>Status</th>
                          <th style={{ width: "220px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ret.items.map((item) => (
                          <tr key={item._id}>
                            <td className="item-name">{item.productName}</td>
                            <td className="item-qty">{item.quantity}</td>
                            <td>UGX {item.unitPrice.toLocaleString()}</td>
                            <td>{item.reason || "—"}</td>
                            <td>{item.source === "delivery_failure" ? "Delivery Failure" : "Manual Return"}</td>
                            <td style={{ textTransform: "capitalize" }}>{item.status}</td>
                            <td className="td-action">
                              {item.status === "pending" ? (
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <button
                                    className="btn btn--secondary btn--sm"
                                    onClick={() => handleApprove(item._id, true)}
                                    title="Approve and restock to shelf"
                                  >
                                    <PackageCheck size={13} />
                                  </button>
                                  <button
                                    className="btn btn--secondary btn--sm"
                                    onClick={() => handleApprove(item._id, false)}
                                    title="Approve without restocking (item not sellable)"
                                  >
                                    <PackageX size={13} />
                                  </button>
                                  <button
                                    className="btn btn--ghost btn--danger btn--sm"
                                    onClick={() => handleReject(item._id)}
                                    title="Reject"
                                  >
                                    <XCircle size={13} />
                                  </button>
                                </div>
                              ) : (
                                <span className="returns-panel-meta">
                                  {item.status === "rejected" && item.rejectedReason ? `Rejected: ${item.rejectedReason}` : "—"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {hasExchange && (
                    <div style={{ marginTop: "var(--space-2)" }}>
                      <div className="returns-panel-meta" style={{ marginBottom: "4px" }}>
                        <CheckCircle size={12} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                        Given in exchange:
                      </div>
                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ret.exchangeItems.map((item) => (
                              <tr key={item._id}>
                                <td className="item-name">{item.productName}</td>
                                <td className="item-qty">{item.quantity}</td>
                                <td>UGX {item.unitPrice.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {returnsStatus === "CanLoadMore" && (
            <button className="btn btn--secondary btn--md" onClick={() => loadMore(25)} style={{ marginTop: "var(--space-3)" }}>
              Load More Returns
            </button>
          )}
        </>
      )}

      {tradingReturn && (
        <TradeReturnModal
          ret={tradingReturn}
          token={token}
          onClose={() => setTradingReturn(null)}
          onSubmit={handleTradeSubmit}
        />
      )}
    </div>
  );
}
