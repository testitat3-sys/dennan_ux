import React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X } from "lucide-react";

function formatDisplayDate(dateStr) {
  if (typeof dateStr !== "string") return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function ChannelDetailModal({
  channel,
  channelLabel,
  startDate,
  endDate,
  token,
  onClose,
  onOpenOrder,
}) {
  const orders = useQuery(
    api.orders.adminGetChannelTransactions,
    channel ? { token, startDate, endDate, channel } : "skip"
  );

  if (!channel) return null;

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRowClick = (orderId) => {
    onOpenOrder?.(orderId);
    onClose();
  };

  const total = orders?.reduce((sum, r) => sum + r.amount, 0) || 0;

  return (
    <div className="modal-overlay is-open">
      <div className="modal customer-modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{channelLabel}</h2>
            <span className="modal-subtitle">
              {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {orders === undefined ? (
          <div className="empty-state">
            <div className="empty-title">Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No orders found.</div>
          </div>
        ) : (
          <>
            <div className="price-preview-row font-final">
              <span>{orders.length} order{orders.length === 1 ? "" : "s"}</span>
              <strong>UGX {total.toLocaleString()}</strong>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleRowClick(row.orderId)}
                    >
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>{row.customerName}</td>
                      <td>{row.orderId}</td>
                      <td>UGX {row.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
