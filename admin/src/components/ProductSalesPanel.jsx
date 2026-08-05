import React, { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertCircle } from "lucide-react";
import StockReportDetailModal from "./StockReportDetailModal";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayDateStr() {
  return toDateStr(new Date());
}

function getDateStrDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateStr(d);
}

import { useSessionState } from "../hooks/useSessionDateRange";

export default function ProductSalesPanel({ token, user }) {
  const isStockManager = user?.accountRole === "stockManager";
  const todayStr = getTodayDateStr();
  const defaultStartStr = getDateStrDaysAgo(29);
  const [startDate, setStartDate] = useSessionState("admin_product_sales_start", () => (isStockManager ? todayStr : defaultStartStr));
  const [endDate, setEndDate] = useSessionState("admin_product_sales_end", todayStr);

  const [selectedProduct, setSelectedProduct] = useState(null);

  const { results: rawSalesRows, status: salesStatus, loadMore: loadMoreSales } = usePaginatedQuery(
    api.products.getProductSalesInRange,
    { token, startDate, endDate },
    { initialNumItems: 50 }
  );
  const summary = useQuery(api.products.getProductSalesRangeSummary, { token, startDate, endDate });

  const {
    processedData: salesRows,
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
  } = useTableSortAndFilter(rawSalesRows || [], {
    searchFields: ["name", "sku", "barcode"],
    initialSort: { key: "quantitySoldInRange", direction: "desc" },
  });

  const isDefaultRange = startDate === defaultStartStr && endDate === todayStr;

  const handleResetRange = () => {
    setStartDate(defaultStartStr);
    setEndDate(todayStr);
  };

  return (
    <>
      <div className="admin-tab-panel is-active">
        <div className="page-header">
          <h1 className="admin-page-title">Products Sold — Stock Report</h1>
        </div>

        {isStockManager ? (
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "var(--space-4)" }}>
            Showing today's sales only ({todayStr}). Stock Managers don't have access to historical sales data.
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
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
            {!isDefaultRange && (
              <button className="btn btn--secondary btn--sm" onClick={handleResetRange}>
                Last 30 Days
              </button>
            )}
          </div>
        )}

        {summary?.truncated && (
          <div className="form-error is-visible" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "var(--space-4)" }}>
            <AlertCircle size={14} />
            Showing partial results — over {summary.cap.toLocaleString()} orders in this range. Narrow your date range for complete figures.
          </div>
        )}

        {summary && (
          <div className="stock-summary-row">
            <div className="stock-summary-chip stock-summary-chip--green">
              <span className="stock-chip-value">{summary.productCount}</span>
              <span className="stock-chip-label">Products Sold</span>
            </div>
            <div className="stock-summary-chip stock-summary-chip--amber">
              <span className="stock-chip-value">{summary.totalUnitsSold.toLocaleString()}</span>
              <span className="stock-chip-label">Total Units Sold</span>
            </div>
          </div>
        )}

        <TableFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search product name, SKU, or barcode..."
          filterValues={filterValues}
          onFilterChange={(key, val) => setFilterValue(key, val)}
          isFiltered={isFiltered}
          onResetFilters={resetFilters}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />

        {rawSalesRows === undefined ? (
          <div className="empty-state">
            <div className="empty-title">Fetching stock report...</div>
          </div>
        ) : rawSalesRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No products sold in this range.</div>
          </div>
        ) : salesRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No products match search filter.</div>
            <button className="btn btn--secondary btn--sm" style={{ marginTop: "12px" }} onClick={resetFilters}>
              Clear Filter
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="name" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Product
                    </SortableHeader>
                    <SortableHeader sortKey="sku" sortConfig={sortConfig} onRequestSort={requestSort}>
                      SKU
                    </SortableHeader>
                    <SortableHeader sortKey="barcode" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Barcode
                    </SortableHeader>
                    <SortableHeader sortKey="quantitySoldInRange" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Units Sold (Range)
                    </SortableHeader>
                    <SortableHeader sortKey="inventory" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Inventory Left
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {salesRows.map((row) => (
                    <tr
                      key={row.productId}
                      onClick={() => setSelectedProduct(row)}
                      style={{ cursor: "pointer" }}
                      title="Click to see orders for this product"
                    >
                      <td><strong>{row.name}</strong></td>
                      <td>{row.sku || "—"}</td>
                      <td>{row.barcode || "—"}</td>
                      <td>{row.quantitySoldInRange.toLocaleString()}</td>
                      <td>{row.inventory.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {salesStatus === "CanLoadMore" && (
              <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
                <button className="btn btn--secondary btn--sm" onClick={() => loadMoreSales(25)}>
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <StockReportDetailModal
        product={selectedProduct}
        token={token}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}
