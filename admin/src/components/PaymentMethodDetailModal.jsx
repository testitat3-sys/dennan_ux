import React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X } from "lucide-react";

function formatDisplayDate(dateStr) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function PaymentMethodDetailModal({
  method,
  methodLabel,
  startDate,
  endDate,
  token,
  onClose,
  onOpenOrder,
}) {
  const transactions = useQuery(
    api.orders.adminGetPaymentMethodTransactions,
    method ? { token, startDate, endDate, paymentMethod: method } : "skip"
  );

  if (!method) return null;

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const detailFor = (row) => {
    if (row.momoPhone) return row.momoPhone;
    if (row.cardOrderId) return row.cardOrderId;
    if (row.voucherCode) return row.voucherCode;
    return "—";
  };

  const handleRowClick = (orderId) => {
    onOpenOrder?.(orderId);
    onClose();
  };

  const total = transactions?.reduce((sum, r) => sum + r.amount, 0) || 0;

  return (
    <div className="modal-overlay is-open">
      <div className="modal customer-modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{methodLabel}</h2>
            <span className="modal-subtitle">
              {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {transactions === undefined ? (
          <div className="empty-state">
            <div className="empty-title">Loading transactions...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No transactions found.</div>
          </div>
        ) : (
          <>
            <div className="price-preview-row font-final">
              <span>{transactions.length} payment{transactions.length === 1 ? "" : "s"}</span>
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
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleRowClick(row.orderId)}
                    >
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>{row.customerName}</td>
                      <td>{row.orderId}</td>
                      <td>UGX {row.amount.toLocaleString()}</td>
                      <td>{detailFor(row)}</td>
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
