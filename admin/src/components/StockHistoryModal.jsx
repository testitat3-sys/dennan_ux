import React from "react";
import { X } from "lucide-react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

const SOURCE_LABELS = {
  manual_adjust: "Manual adjustment",
  stock_request_approval: "Approved stock request",
  bulk_upload: "Bulk upload",
  customer_sale: "Customer sale",
  customer_return: "Customer return",
  exchange_in: "Exchange (In)",
  exchange_out: "Exchange (Out)",
  delivery_failure_restock: "Delivery failure restock",
  physical_audit: "Physical audit",
  direct_admin_edit: "Direct admin edit",
  order_cancellation: "Order cancellation",
  vendor_receipt: "Vendor receipt",
};

export default function StockHistoryModal({ product, displayName, token, onClose }) {
  const history = useTrackedQuery(
    api.stockHistory.getProductStockHistory,
    product ? { token, productId: product.id } : "skip"
  );

  const {
    processedData: historyData,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    filterValues,
    setFilterValue,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter(history || [], {
    searchFields: ["actorName", "note", "source"],
    initialSort: { key: "createdAt", direction: "desc" },
    customSorts: {
      change: (a, b) => a.delta - b.delta,
      inventory: (a, b) => a.afterInventory - b.afterInventory,
    },
  });

  if (!product) return null;

  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Stock History — {displayName ?? product.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-form">
          <TableFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Filter product stock history..."
            filterValues={filterValues}
            onFilterChange={(key, val) => setFilterValue(key, val)}
            filters={[
              {
                key: "source",
                width: "170px",
                options: [
                  { value: "all", label: "All Sources" },
                  ...Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l })),
                ],
              },
            ]}
            isFiltered={isFiltered}
            onResetFilters={resetFilters}
            totalCount={totalCount}
            filteredCount={filteredCount}
          />

          {history === undefined ? (
            <div className="empty-state">
              <div className="empty-title">Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No recorded stock changes yet.</div>
            </div>
          ) : historyData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No changes match filter criteria.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Date
                    </SortableHeader>
                    <SortableHeader sortKey="change" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Change
                    </SortableHeader>
                    <SortableHeader sortKey="inventory" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Before → After
                    </SortableHeader>
                    <SortableHeader sortKey="source" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Source
                    </SortableHeader>
                    <SortableHeader sortKey="actorName" sortConfig={sortConfig} onRequestSort={requestSort}>
                      By
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((row) => (
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
