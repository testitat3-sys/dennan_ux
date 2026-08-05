import React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X } from "lucide-react";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

function formatDisplayDate(dateStr) {
  if (typeof dateStr !== "string") return dateStr;
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
  const rawTransactions = useQuery(
    api.orders.adminGetPaymentMethodTransactions,
    method ? { token, startDate, endDate, paymentMethod: method } : "skip"
  );

  const {
    processedData: transactions,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    isFiltered,
    resetFilters,
  } = useTableSortAndFilter(rawTransactions || [], {
    searchFields: ["customerName", "orderId", "amount", "momoPhone", "cardOrderId", "voucherCode"],
    initialSort: { key: "createdAt", direction: "desc" },
  });

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

  const total = rawTransactions?.reduce((sum, r) => sum + r.amount, 0) || 0;

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

        {rawTransactions === undefined ? (
          <div className="empty-state">
            <div className="empty-title">Loading transactions...</div>
          </div>
        ) : rawTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No transactions found.</div>
          </div>
        ) : (
          <>
            <div className="price-preview-row font-final" style={{ marginBottom: "12px" }}>
              <span>{rawTransactions.length} payment{rawTransactions.length === 1 ? "" : "s"}</span>
              <strong>UGX {total.toLocaleString()}</strong>
            </div>

            <TableFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Filter payment transactions..."
              isFiltered={isFiltered}
              onResetFilters={resetFilters}
            />

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Date
                    </SortableHeader>
                    <SortableHeader sortKey="customerName" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Customer
                    </SortableHeader>
                    <SortableHeader sortKey="orderId" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Order
                    </SortableHeader>
                    <SortableHeader sortKey="amount" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Amount
                    </SortableHeader>
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
