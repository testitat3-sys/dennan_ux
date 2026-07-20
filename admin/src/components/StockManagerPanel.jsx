import React, { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useProductDisplayName } from "../hooks/useProductDisplayName";
import { Search, AlertCircle, Pencil, Plus, Minus, Check, Printer, Upload } from "lucide-react";
import BarcodeLabelModal from "./BarcodeLabelModal";

export default function StockManagerPanel({ token, navigate }) {
  const { getDisplayName } = useProductDisplayName(token);
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
  const stockSummary = useTrackedQuery(api.stockCounters.getStockSummary, { token });
  const adjustStockMutation = useMutation(api.products.adjustStock);
  const [setTargetInputs, setSetTargetInputs] = useState({}); // productId -> string ("set to" value in progress)
  const [labelProduct, setLabelProduct] = useState(null);

  const quickAdjust = async (product, delta) => {
    try {
      await adjustStockMutation({ token, productId: product.id, delta });
    } catch (err) {
      alert("Failed to adjust stock: " + err.message);
    }
  };

  const handleSetAbsolute = async (product) => {
    const raw = setTargetInputs[product.id];
    const parsed = parseInt(raw);
    if (raw === undefined || raw === "" || isNaN(parsed) || parsed < 0 || parsed === product.inventory) {
      return;
    }
    try {
      await adjustStockMutation({ token, productId: product.id, delta: parsed - product.inventory });
      setSetTargetInputs(prev => ({ ...prev, [product.id]: "" }));
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
        <button
          className="btn btn--secondary btn--sm"
          onClick={() => navigate("/admin/products/bulk-upload")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Upload size={14} /> Bulk Upload (.xlsx)
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
                  <th>Barcode</th>
                  <th>Cost Price</th>
                  <th>Inventory</th>
                  <th>Units Sold</th>
                  <th>Status</th>
                  <th style={{ width: "180px" }}>Stock Adjustment</th>
                  <th style={{ width: "110px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((product) => {
                  const isOut = product.inventory <= 0;
                  const isLowStock = !isOut && product.inventory <= product.reorderPoint;
                  const isVeryLow = isLowStock && product.inventory <= product.reorderPoint / 2;
                  const setTargetVal = setTargetInputs[product.id] || "";
                  const parsedSetTarget = parseInt(setTargetVal);
                  const isSetValid = setTargetVal !== "" && !isNaN(parsedSetTarget) &&
                    parsedSetTarget >= 0 && parsedSetTarget !== product.inventory;
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
                        <strong>{getDisplayName(product)}</strong>
                        {isLowStock && (
                          <div className="stock-very-low-hint">
                            <AlertCircle size={12} /> Low Stock Warning
                          </div>
                        )}
                      </td>
                      <td>{product.barcode}</td>
                      <td>UGX {product.costPrice?.toLocaleString() || "—"}</td>
                      <td><span className={`stock-qty-badge ${qtyClass}`}>{product.inventory}</span></td>
                      <td>{(product.unitsSold ?? 0).toLocaleString()}</td>
                      <td><span className={`stock-status-badge ${statusClass}`}>{isOut ? "Out" : isLowStock ? "Low" : "OK"}</span></td>
                      <td>
                        <div className="stock-adj-btns">
                          <div className="stock-adj-stepper">
                            <button
                              type="button"
                              className="stock-adj-btn stock-adj-btn--minus"
                              onClick={() => quickAdjust(product, -1)}
                              disabled={product.inventory <= 0}
                              title="Decrease by 1"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              type="button"
                              className="stock-adj-btn stock-adj-btn--plus"
                              onClick={() => quickAdjust(product, 1)}
                              title="Increase by 1"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="stock-adj-set-row">
                            <input
                              type="number"
                              className="form-input stock-adj-set-input"
                              placeholder="Set inventory to…"
                              min={0}
                              value={setTargetVal}
                              onChange={(e) => setSetTargetInputs(prev => ({ ...prev, [product.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSetAbsolute(product); }}
                            />
                            <button
                              type="button"
                              className="stock-adj-save-btn"
                              onClick={() => handleSetAbsolute(product)}
                              disabled={!isSetValid}
                              title="Save exact quantity"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => navigate(`/admin/products/${product.id}`)}
                            title="Edit product details"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => setLabelProduct(product)}
                            title="Print barcode label"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
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

      {labelProduct && (
        <BarcodeLabelModal
          product={labelProduct}
          displayName={getDisplayName(labelProduct)}
          onClose={() => setLabelProduct(null)}
        />
      )}
    </div>
  );
}
