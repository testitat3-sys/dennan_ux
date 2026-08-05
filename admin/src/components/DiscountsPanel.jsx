import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useProductDisplayName } from "../hooks/useProductDisplayName";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

export default function DiscountsPanel({ token }) {
  const { getDisplayName } = useProductDisplayName(token);
  const discountList = useTrackedQuery(api.products.getDiscountList, { token });
  const setDiscountMutation = useMutation(api.products.setDiscount);
  const [discountForm, setDiscountForm] = useState({
    productId: "",
    discountPrice: 0,
    expiryDays: 7,
  });
  const [discountStatus, setDiscountStatus] = useState("");
  const [discountProductSearch, setDiscountProductSearch] = useState("");
  const [discountSelectedProductName, setDiscountSelectedProductName] = useState("");
  const discountProductResults = useQuery(
    api.products.searchStockList,
    discountProductSearch.trim() ? { token, searchTerm: discountProductSearch.trim() } : "skip"
  );

  const {
    processedData: filteredDiscounts,
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
  } = useTableSortAndFilter(discountList || [], {
    searchFields: [(p) => getDisplayName(p), "originalPrice", "discountPrice"],
    initialSort: { key: "discountExpiry", direction: "asc" },
    customSorts: {
      product: (a, b) => getDisplayName(a).localeCompare(getDisplayName(b)),
    },
  });

  const handleSetDiscount = async (e) => {
    e.preventDefault();
    if (!discountForm.productId) {
      setDiscountStatus("Please select a product.");
      return;
    }
    if (!discountForm.discountPrice || discountForm.discountPrice <= 0) {
      setDiscountStatus("Enter a valid discount price.");
      return;
    }
    setDiscountStatus("Setting discount...");
    try {
      await setDiscountMutation({
        token,
        productId: discountForm.productId,
        discountPrice: Number(discountForm.discountPrice),
        expiryDays: Number(discountForm.expiryDays),
      });
      setDiscountStatus("Discount applied successfully!");
      setDiscountForm({ productId: "", discountPrice: 0, expiryDays: 7 });
      setDiscountProductSearch("");
      setDiscountSelectedProductName("");
    } catch (err) {
      setDiscountStatus("Failed: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Discount Manager</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)" }}>
        {/* Set Discount Form */}
        <div className="product-edit-card">
          <h3 className="product-edit-card-title">Set Campaign Discount</h3>
          <form onSubmit={handleSetDiscount} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label">Search Product *</label>
              <input
                type="text"
                className="form-input"
                value={discountSelectedProductName || discountProductSearch}
                onChange={(e) => {
                  setDiscountProductSearch(e.target.value);
                  setDiscountSelectedProductName("");
                  setDiscountForm((f) => ({ ...f, productId: "" }));
                }}
                placeholder="Type name or barcode to search..."
              />
              {discountProductSearch && !discountSelectedProductName && discountProductResults && (
                <div
                  style={{
                    maxHeight: "160px",
                    overflowY: "auto",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    marginTop: "4px",
                    background: "var(--surface-container-low)",
                  }}
                >
                  {discountProductResults.length === 0 ? (
                    <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                      No matching products found
                    </div>
                  ) : (
                    discountProductResults.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => {
                          setDiscountForm((f) => ({ ...f, productId: p._id }));
                          setDiscountSelectedProductName(getDisplayName(p));
                          setDiscountProductSearch("");
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <strong>{getDisplayName(p)}</strong> — UGX {p.originalPrice?.toLocaleString()}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Discounted / Promo Price (UGX) *</label>
              <input
                type="number"
                className="form-input"
                value={discountForm.discountPrice || ""}
                onChange={(e) => setDiscountForm((f) => ({ ...f, discountPrice: e.target.value }))}
                placeholder="e.g. 25000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Duration (Days) *</label>
              <input
                type="number"
                className="form-input"
                value={discountForm.expiryDays}
                onChange={(e) => setDiscountForm((f) => ({ ...f, expiryDays: e.target.value }))}
                min={1}
                max={365}
              />
            </div>

            {discountStatus && (
              <div style={{ fontSize: "13px", color: discountStatus.includes("successfully") ? "var(--color-support-green, #10b981)" : "var(--color-support-red, #ef4444)" }}>
                {discountStatus}
              </div>
            )}

            <button type="submit" className="btn btn--primary btn--md">
              Apply Campaign Discount
            </button>
          </form>
        </div>

        {/* Active Campaign Discounts Table */}
        <div className="product-edit-card">
          <h3 className="product-edit-card-title">Active Campaign Discounts</h3>

          <TableFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Filter discounts..."
            filterValues={filterValues}
            onFilterChange={(key, val) => setFilterValue(key, val)}
            isFiltered={isFiltered}
            onResetFilters={resetFilters}
            totalCount={totalCount}
            filteredCount={filteredCount}
          />

          {discountList === undefined ? (
            <div className="empty-state">
              <div className="empty-title">Fetching active campaigns...</div>
            </div>
          ) : discountList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No active discounts.</div>
              <div className="empty-sub">Use the form to create one.</div>
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No discounts match search filter.</div>
              <button className="btn btn--secondary btn--sm" style={{ marginTop: "12px" }} onClick={resetFilters}>
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableHeader sortKey="product" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Product
                    </SortableHeader>
                    <SortableHeader sortKey="originalPrice" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Original Price
                    </SortableHeader>
                    <SortableHeader sortKey="discountPrice" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Promo Price
                    </SortableHeader>
                    <SortableHeader sortKey="discountExpiry" sortConfig={sortConfig} onRequestSort={requestSort}>
                      Expiry Date
                    </SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiscounts.map((product) => {
                    const isActive = product.discountExpiry > Date.now();
                    return (
                      <tr key={product._id} className={isActive ? "discount-row-active" : ""}>
                        <td><strong>{getDisplayName(product)}</strong></td>
                        <td>UGX {product.originalPrice?.toLocaleString()}</td>
                        <td>
                          <span className="discount-badge discount-badge--cash">
                            UGX {product.discountPrice?.toLocaleString()}
                          </span>
                        </td>
                        <td>{new Date(product.discountExpiry).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
