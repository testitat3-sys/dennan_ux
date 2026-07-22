import React, { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useProductDisplayName } from "../hooks/useProductDisplayName";
import { useToast } from "../hooks/useToast";
import { Search, AlertCircle, Pencil, Plus, Minus, Check, Printer, Upload, X, Send } from "lucide-react";
import BarcodeLabelModal from "./BarcodeLabelModal";
import Toast from "./Toast";

/** Derive a single overall status label for a submitted stock request group. */
function getStockRequestOverallStatus(group) {
  const items = group.items || [];
  if (items.length === 0) return "pending";
  const allResolved = items.every((i) => i.status !== "pending");
  const allRejected = items.every((i) => i.status === "rejected");
  if (allRejected) return "rejected";
  if (allResolved) return "resolved";
  return "pending";
}

function StockRequestStatusBadge({ status }) {
  const map = {
    pending: { cls: "status-badge--new", label: "Pending" },
    resolved: { cls: "status-badge--done", label: "Resolved" },
    rejected: { cls: "status-badge--failed", label: "Rejected" },
  };
  const { cls, label } = map[status] || map.pending;
  return (
    <span className={`status-badge ${cls}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default function StockManagerPanel({ token, navigate, user, showToast: externalShowToast }) {
  const { getDisplayName } = useProductDisplayName(token);
  // Reuse the parent's toast stack when it provides one (AdminDashboard already
  // renders a #toast-container) — otherwise fall back to a local one, so this
  // panel still works standalone inside StockManagerDashboard.
  const { toasts, showToast: internalShowToast, dismissToast } = useToast();
  const showToast = externalShowToast || internalShowToast;
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

  const isStockManager = user?.accountRole === "stockManager";
  const stageStockDecreaseMutation = useMutation(api.stockRequests.stageStockDecrease);
  const cancelStockDraftMutation = useMutation(api.stockRequests.cancelStockDraft);
  const submitStockRequestsMutation = useMutation(api.stockRequests.submitStockRequests);
  const myDrafts = useTrackedQuery(
    api.stockRequests.getMyStockDrafts,
    isStockManager ? { token } : "skip"
  );
  const myRequests = useTrackedQuery(
    api.stockRequests.getMyStockRequests,
    isStockManager ? { token } : "skip"
  );
  const draftByProductId = new Map((myDrafts || []).map((d) => [d.productId, d]));

  const quickAdjust = async (product, delta) => {
    if (delta < 0 && isStockManager) {
      const existingDraft = draftByProductId.get(product.id);
      const cumulativeDelta = (existingDraft?.requestedDelta ?? 0) + delta;
      try {
        await stageStockDecreaseMutation({ token, productId: product.id, requestedDelta: cumulativeDelta });
      } catch (err) {
        showToast("Failed to stage stock decrease: " + err.message, "error");
      }
      return;
    }
    try {
      await adjustStockMutation({ token, productId: product.id, delta });
    } catch (err) {
      showToast("Failed to adjust stock: " + err.message, "error");
    }
  };

  const handleSetAbsolute = async (product) => {
    const raw = setTargetInputs[product.id];
    const parsed = parseInt(raw);
    if (raw === undefined || raw === "" || isNaN(parsed) || parsed < 0 || parsed === product.inventory) {
      return;
    }
    const delta = parsed - product.inventory;
    if (delta < 0 && isStockManager) {
      try {
        await stageStockDecreaseMutation({ token, productId: product.id, requestedDelta: delta });
        setSetTargetInputs(prev => ({ ...prev, [product.id]: "" }));
      } catch (err) {
        showToast("Failed to stage stock decrease: " + err.message, "error");
      }
      return;
    }
    try {
      await adjustStockMutation({ token, productId: product.id, delta });
      setSetTargetInputs(prev => ({ ...prev, [product.id]: "" }));
    } catch (err) {
      showToast("Failed to adjust stock: " + err.message, "error");
    }
  };

  const handleCancelDraft = async (draftId) => {
    try {
      await cancelStockDraftMutation({ token, draftItemId: draftId });
    } catch (err) {
      showToast("Failed to remove staged reduction: " + err.message, "error");
    }
  };

  const handleSubmitStockRequests = async () => {
    try {
      const result = await submitStockRequestsMutation({ token });
      showToast(`Submitted ${result.itemCount} item${result.itemCount === 1 ? "" : "s"} for admin approval.`, "success");
    } catch (err) {
      showToast("Failed to submit for approval: " + err.message, "error");
    }
  };

  const handleCancelAllDrafts = async () => {
    try {
      await Promise.all((myDrafts || []).map((d) => cancelStockDraftMutation({ token, draftItemId: d._id })));
      showToast("Staged reductions cancelled.", "info");
    } catch (err) {
      showToast("Failed to cancel staged reductions: " + err.message, "error");
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

      {isStockManager && myDrafts && myDrafts.length > 0 && (
        <div
          className="status-banner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "10px 16px",
            marginBottom: "var(--space-3)",
            borderRadius: "8px",
            background: "var(--color-support-amber-bg, #fef3c7)",
            color: "var(--color-support-amber-text, #92400e)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500 }}>
            <AlertCircle size={16} />
            These changes reduce stock — request permission from admin?
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSubmitStockRequests}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Send size={13} /> Request Permission
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleCancelAllDrafts}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <X size={13} /> Cancel Changes
            </button>
          </div>
        </div>
      )}

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
                  const draftForProduct = draftByProductId.get(product.id);
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
                          {draftForProduct && (
                            <div className="stock-draft-hint" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "var(--label-md)", color: "var(--text-tertiary)" }}>
                              <span>Staged: {draftForProduct.requestedDelta} (draft)</span>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => handleCancelDraft(draftForProduct._id)}
                                title="Remove staged reduction"
                                style={{ padding: "2px" }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
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

      {isStockManager && myDrafts && myDrafts.length > 0 && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <div className="section-header">
            <h2 className="section-title">Staged Reductions ({myDrafts.length})</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Inventory</th>
                  <th>Requested Change</th>
                  <th>Resulting Inventory</th>
                  <th style={{ width: "80px" }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {myDrafts.map((draft) => (
                  <tr key={draft._id}>
                    <td>{draft.productName}</td>
                    <td>{draft.currentInventoryAtStage}</td>
                    <td>{draft.requestedDelta}</td>
                    <td>{draft.requestedInventory}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handleCancelDraft(draft._id)}
                        title="Remove staged reduction"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isStockManager && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <div className="section-header">
            <h2 className="section-title">My Requests</h2>
          </div>
          {myRequests === undefined ? (
            <div className="empty-state">
              <div className="empty-title">Loading your requests...</div>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No reduction requests submitted yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((group) => {
                    const overallStatus = getStockRequestOverallStatus(group);
                    return (
                      <tr key={group.requestId}>
                        <td>{new Date(group.submittedAt).toLocaleString()}</td>
                        <td><StockRequestStatusBadge status={overallStatus} /></td>
                        <td>
                          {group.items.map((item) => (
                            <div key={item._id} style={{ marginBottom: "4px" }}>
                              {item.kind === "name_change"
                                ? `${item.productName}: rename to "${item.requestedName}"`
                                : `${item.productName}: ${item.requestedDelta}`}
                              {item.status === "rejected" && (
                                <span style={{ color: "var(--color-support-red, #ef4444)" }}>
                                  {" "}— Rejected{item.rejectedReason ? `: ${item.rejectedReason}` : ""}
                                </span>
                              )}
                              {item.status === "approved" && (
                                <span style={{ color: "var(--color-support-green, #4ade80)" }}> — Approved</span>
                              )}
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {labelProduct && (
        <BarcodeLabelModal
          product={labelProduct}
          displayName={getDisplayName(labelProduct)}
          onClose={() => setLabelProduct(null)}
        />
      )}

      {!externalShowToast && <Toast toasts={toasts} onDismiss={dismissToast} />}
    </div>
  );
}
