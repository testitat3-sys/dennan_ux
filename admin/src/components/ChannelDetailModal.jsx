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

export default function ChannelDetailModal({
  channel,
  channelLabel,
  startDate,
  endDate,
  token,
  onClose,
  onOpenOrder,
}) {
  const rawOrders = useQuery(
    api.orders.adminGetChannelTransactions,
    channel ? { token, startDate, endDate, channel } : "skip"
  );

  const {
    processedData: orders,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    isFiltered,
    resetFilters,
  } = useTableSortAndFilter(rawOrders || [], {
    searchFields: ["customerName", "orderId", "amount"],
    initialSort: { key: "createdAt", direction: "desc" },
  });

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

  const total = rawOrders?.reduce((sum, r) => sum + r.amount, 0) || 0;

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

        {rawOrders === undefined ? (
          <div className="empty-state">
            <div className="empty-title">Loading orders...</div>
          </div>
        ) : rawOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No orders found.</div>
          </div>
        ) : (
          <>
            <div className="price-preview-row font-final" style={{ marginBottom: "12px" }}>
              <span>{rawOrders.length} order{rawOrders.length === 1 ? "" : "s"}</span>
              <strong>UGX {total.toLocaleString()}</strong>
            </div>

            <TableFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Filter channel orders..."
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
