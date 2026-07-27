import React, { useState } from "react";
import { usePaginatedQuery, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { Eye, Download } from "lucide-react";

function getStatusModifier(status) {
  switch (status) {
    case "preparing": return "new";
    case "packing": return "packing";
    case "dispatched": return "dispatched";
    case "delivered": return "done";
    case "failed": return "failed";
    case "returned": return "returned";
    case "partially_returned": return "partially-returned";
    default: return "new";
  }
}

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toCsv(rows) {
  const header = ["Date", "Customer", "Type", "Items", "Total", "Status", "Claimed By"];
  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push([
      escape(new Date(row.date).toLocaleString("en-GB")),
      escape(row.customerName),
      escape(row.type),
      escape(row.itemCount),
      escape(row.total),
      escape(row.status),
      escape(row.claimantName),
    ].join(","));
  }
  return lines.join("\n");
}

export default function OrderHistoryPanel({ token, onOpenOrder, user }) {
  const todayStr = getTodayDateStr();
  const isRestrictedToToday = user?.accountRole === "accounting" || user?.accountRole === "staff";
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [downloadStatus, setDownloadStatus] = useState("");
  const convex = useConvex();

  const queryStartDate = isRestrictedToToday ? todayStr : startDate;
  const queryEndDate = isRestrictedToToday ? todayStr : endDate;

  const { results: orderHistory, status: orderHistoryStatus, loadMore: loadMoreOrderHistory } = usePaginatedQuery(
    api.orders.adminGetOrdersByDateRange,
    { token, startDate: queryStartDate, endDate: queryEndDate },
    { initialNumItems: 25 }
  );

  const isToday = startDate === todayStr && endDate === todayStr;

  const handleResetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleDownload = async () => {
    setDownloadStatus("Preparing download...");
    try {
      // adminExportOrdersByDateRange is a trackedQuery, so its return is
      // wrapped as { data, _io } - this is a one-off imperative call (not a
      // hook), so we just unwrap .data here rather than reporting _io.
      const { data: result } = await convex.query(api.orders.adminExportOrdersByDateRange, {
        token,
        startDate: queryStartDate,
        endDate: queryEndDate,
      });
      if (result.truncated) {
        setDownloadStatus(`Too many orders in this range (over ${result.cap}). Narrow your date range and try again.`);
        return;
      }
      if (result.rows.length === 0) {
        setDownloadStatus("No orders in this range.");
        return;
      }
      const csv = toCsv(result.rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-history-${queryStartDate}-to-${queryEndDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus("");
    } catch (err) {
      setDownloadStatus("Download failed: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Order History</h1>
        <span style={{ fontSize: "12px", color: "var(--text-tertiary)", alignSelf: "center" }}>
          Sorted: Newest First
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
        {isRestrictedToToday ? (
          <span className="status-badge status-badge--new" style={{ fontSize: "13px", padding: "6px 12px" }}>
            Order History — Today ({todayStr})
          </span>
        ) : (
          <>
            <label style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              From
              <input
                type="date"
                className="form-input"
                style={{ marginLeft: "6px", width: "150px" }}
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
              To
              <input
                type="date"
                className="form-input"
                style={{ marginLeft: "6px", width: "150px" }}
                value={endDate}
                min={startDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            {!isToday && (
              <button className="btn btn--secondary btn--sm" onClick={handleResetToday}>
                Today
              </button>
            )}
          </>
        )}
        {!isRestrictedToToday && (
          <button className="btn btn--secondary btn--sm" onClick={handleDownload} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Download size={13} /> Download CSV
          </button>
        )}
        {downloadStatus && (
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{downloadStatus}</span>
        )}
      </div>

      {orderHistory === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading order history...</div>
        </div>
      ) : orderHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No orders {isToday ? "yet today" : "in this range"}.</div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Claimed By</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.map((order) => (
                  <tr
                    key={order._id}
                    style={{ cursor: "pointer" }}
                    onClick={() => onOpenOrder(order)}
                  >
                    <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(order.createdAt).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="td-customer">{order.customerName}</td>
                    <td>
                      <span
                        className={`status-badge ${order.isWalkIn ? "status-badge--done" : "status-badge--packing"}`}
                        style={{ fontSize: "10px" }}
                      >
                        {order.isWalkIn ? "Walk-in" : "Online"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>{order.items?.length || 0}</td>
                    <td style={{ whiteSpace: "nowrap" }}>UGX {order.grandTotal.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-badge--${getStatusModifier(order.status)}`}>
                        <span className="status-dot" />
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{order.claimantName || "—"}</td>
                    <td className="td-action" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={() => onOpenOrder(order)}
                        title="View full details"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orderHistoryStatus === "CanLoadMore" && (
            <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              <button className="btn btn--secondary btn--sm" onClick={() => loadMoreOrderHistory(25)}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
