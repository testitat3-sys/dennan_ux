import React, { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertCircle } from "lucide-react";

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

export default function ProductSalesPanel({ token, user }) {
  const isStockManager = user?.accountRole === "stockManager";
  const todayStr = getTodayDateStr();
  const defaultStartStr = getDateStrDaysAgo(29);
  // Stock Managers only ever see today's sales — pinned, not just defaulted,
  // since there's no picker for them to change it away from today.
  const [startDate, setStartDate] = useState(isStockManager ? todayStr : defaultStartStr);
  const [endDate, setEndDate] = useState(todayStr);

  const { results: salesRows, status: salesStatus, loadMore: loadMoreSales } = usePaginatedQuery(
    api.products.getProductSalesInRange,
    { token, startDate, endDate },
    { initialNumItems: 25 }
  );
  const summary = useQuery(api.products.getProductSalesRangeSummary, { token, startDate, endDate });

  const isDefaultRange = startDate === defaultStartStr && endDate === todayStr;

  const handleResetRange = () => {
    setStartDate(defaultStartStr);
    setEndDate(todayStr);
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Products Sold — Sales Report</h1>
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

      {salesRows === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Fetching sales report...</div>
        </div>
      ) : salesRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No products sold in this range.</div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Units Sold (Range)</th>
                  <th>Inventory Left</th>
                </tr>
              </thead>
              <tbody>
                {salesRows.map((row) => (
                  <tr key={row.productId}>
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
  );
}
