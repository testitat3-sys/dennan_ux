import React, { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Search, AlertCircle, Pencil, Plus } from "lucide-react";

export default function StockManagerPanel({ token, navigate }) {
  // Stock list — browse mode is paginated (never the full ~4000-row table),
  // search mode is a small bounded server-side search.
  const {
    results: stockBrowseResults,
    status: stockBrowseStatus,
    loadMore: loadMoreStock,
  } = usePaginatedQuery(api.products.getStockList, { token }, { initialNumItems: 25 });
  const [stockSearch, setStockSearch] = useState("");
  const stockSearchResults = useQuery(
    api.products.searchStockList,
    stockSearch.trim() ? { token, searchTerm: stockSearch.trim() } : "skip"
  );
  const isStockSearching = stockSearch.trim().length > 0;
  const stockList = isStockSearching ? stockSearchResults : stockBrowseResults;
  const stockSummary = useQuery(api.stockCounters.getStockSummary, { token });
  const adjustStockMutation = useMutation(api.products.adjustStock);
  const [stockAdjustment, setStockAdjustment] = useState({}); // productId -> delta

  const handleStockAdjustment = async (productId, delta) => {
    try {
      await adjustStockMutation({ token, productId, delta });
      // Reset input value
      setStockAdjustment(prev => ({ ...prev, [productId]: "" }));
    } catch (err) {
      alert("Failed to adjust stock: " + err.message);
    }
  };

  const filteredStock = stockList || [];

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Catalogue Inventory Manager</h1>
        <div className="stock-search-wrap">
          <Search className="stock-search-icon" size={16} />
          <input
            className="stock-search-input"
            type="text"
            placeholder="Search by SKU, barcode, name..."
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
          />
          {stockSearch && (
            <button className="stock-search-clear" onClick={() => setStockSearch("")}>×</button>
          )}
        </div>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => navigate("/admin/products/new")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={14} /> New Product
        </button>
      </div>

      {stockList === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Fetching stock listing...</div>
        </div>
      ) : (
        <>
          <div className="stock-summary-row">
            <div className="stock-summary-chip stock-summary-chip--green">
              <span className="stock-chip-value">{stockSummary?.ok ?? "—"}</span>
              <span className="stock-chip-label">In Stock</span>
            </div>
            <div className="stock-summary-chip stock-summary-chip--amber">
              <span className="stock-chip-value">{stockSummary?.low ?? "—"}</span>
              <span className="stock-chip-label">Low Stock</span>
            </div>
            <div className="stock-summary-chip stock-summary-chip--red">
              <span className="stock-chip-value">{stockSummary?.out ?? "—"}</span>
              <span className="stock-chip-label">Out of Stock</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Reorder Pt</th>
                  <th>Cost Price</th>
                  <th>Inventory</th>
                  <th>Units Sold</th>
                  <th>Status</th>
                  <th style={{ width: "200px" }}>Stock Adjustment</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((product) => {
                  const isOut = product.inventory <= 0;
                  const isLowStock = !isOut && product.inventory <= product.reorderPoint;
                  const isVeryLow = isLowStock && product.inventory <= product.reorderPoint / 2;
                  const adjustVal = stockAdjustment[product.id] || "";
                  const qtyClass = isOut
                    ? "stock-qty-badge--out"
                    : isVeryLow
                      ? "stock-qty-badge--very-low"
                      : isLowStock
                        ? "stock-qty-badge--low"
                        : "stock-qty-badge--ok";
                  const statusClass = isOut
                    ? "stock-status-badge--out"
                    : isLowStock
                      ? "stock-status-badge--low"
                      : "stock-status-badge--ok";
                  return (
                    <tr key={product.id} className={isOut ? "stock-row-oos" : ""}>
                      <td>
                        <strong>{product.name}</strong>
                        {isLowStock && (
                          <div className="stock-very-low-hint">
                            <AlertCircle size={12} /> Low Stock Warning
                          </div>
                        )}
                      </td>
                      <td>{product.sku || "—"}</td>
                      <td>{product.barcode}</td>
                      <td>{product.reorderPoint}</td>
                      <td>UGX {product.costPrice?.toLocaleString() || "—"}</td>
                      <td><span className={`stock-qty-badge ${qtyClass}`}>{product.inventory}</span></td>
                      <td>{(product.unitsSold ?? 0).toLocaleString()}</td>
                      <td><span className={`stock-status-badge ${statusClass}`}>{isOut ? "Out" : isLowStock ? "Low" : "OK"}</span></td>
                      <td>
                        <div className="stock-adj-btns">
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: "60px" }}
                            placeholder="+/-"
                            value={adjustVal}
                            onChange={(e) => setStockAdjustment(prev => ({
                              ...prev,
                              [product.id]: e.target.value
                            }))}
                          />
                          <button
                            className="stock-adj-btn stock-adj-btn--plus"
                            onClick={() => handleStockAdjustment(product.id, parseInt(adjustVal))}
                            disabled={!adjustVal || isNaN(parseInt(adjustVal))}
                          >
                            Apply
                          </button>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => navigate(`/admin/products/${product.id}`)}
                          title="Edit product details"
                        >
                          <Pencil size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isStockSearching && stockBrowseStatus === "CanLoadMore" && (
            <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              <button className="btn btn--secondary btn--sm" onClick={() => loadMoreStock(25)}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
