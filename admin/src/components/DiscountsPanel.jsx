import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useProductDisplayName } from "../hooks/useProductDisplayName";

export default function DiscountsPanel({ token }) {
  const { getDisplayName } = useProductDisplayName(token);
  // Discount list
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

  const handleSetDiscount = async (e) => {
    e.preventDefault();
    if (!discountForm.productId) {
      setDiscountStatus("Please select a product.");
      return;
    }
    if (discountForm.discountPrice <= 0) {
      setDiscountStatus("Price must be greater than 0.");
      return;
    }

    try {
      const expiryTimestamp = Date.now() + discountForm.expiryDays * 24 * 60 * 60 * 1000;
      await setDiscountMutation({
        token,
        productId: discountForm.productId,
        discountPrice: discountForm.discountPrice,
        discountExpiry: expiryTimestamp
      });
      setDiscountStatus("Discount applied successfully!");
      setDiscountForm({ productId: "", discountPrice: 0, expiryDays: 7 });
      setDiscountProductSearch("");
      setDiscountSelectedProductName("");
      setTimeout(() => setDiscountStatus(""), 4000);
    } catch (err) {
      setDiscountStatus("Error: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">Discounts & Promos</h1>
      <div className="product-edit-grid">
        {/* Left Column: Set Discount Form */}
        <div className="product-edit-card">
          <h3 className="product-edit-card-title">Create Product Discount</h3>

          {discountStatus && (
            <div className={`form-error ${discountStatus.includes("success") ? "" : "is-visible"}`}>
              {discountStatus}
            </div>
          )}

          <form onSubmit={handleSetDiscount} className="modal-form">
            <div className="form-group" style={{ position: "relative" }}>
              <label className="form-label">Select Product</label>
              {discountForm.productId ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input className="form-input" type="text" value={discountSelectedProductName} disabled readOnly />
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setDiscountForm(prev => ({ ...prev, productId: "" }));
                      setDiscountSelectedProductName("");
                      setDiscountProductSearch("");
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Search by name, SKU, or barcode..."
                    value={discountProductSearch}
                    onChange={(e) => setDiscountProductSearch(e.target.value)}
                  />
                  {discountProductSearch.trim() && (
                    <div className="table-wrap" style={{ maxHeight: "220px", overflowY: "auto", marginTop: "4px" }}>
                      {discountProductResults === undefined ? (
                        <div className="empty-state"><div className="empty-title">Searching...</div></div>
                      ) : discountProductResults.length === 0 ? (
                        <div className="empty-state"><div className="empty-title">No matches.</div></div>
                      ) : (
                        discountProductResults.map(p => (
                          <div
                            key={p.id}
                            style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)" }}
                            onClick={() => {
                              setDiscountForm(prev => ({ ...prev, productId: p.id }));
                              setDiscountSelectedProductName(`${getDisplayName(p)} (Barcode: ${p.barcode})`);
                            }}
                          >
                            {getDisplayName(p)} <span style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>(Barcode: {p.barcode})</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Discount Price (UGX)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                placeholder="e.g. 25000"
                value={discountForm.discountPrice || ""}
                onChange={(e) => setDiscountForm(prev => ({ ...prev, discountPrice: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discount Validity (Days)</label>
              <select
                className="form-input"
                value={discountForm.expiryDays}
                onChange={(e) => setDiscountForm(prev => ({ ...prev, expiryDays: parseInt(e.target.value) }))}
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>1 Week</option>
                <option value={14}>2 Weeks</option>
                <option value={30}>1 Month</option>
              </select>
            </div>

            <button type="submit" className="btn btn--primary btn--md btn--full-width">
              Apply Discount
            </button>
          </form>
        </div>

        {/* Right Column: Active Discount List */}
        <div className="product-edit-card">
          <h3 className="product-edit-card-title">Active Campaign Discounts</h3>

          {discountList === undefined ? (
            <div className="empty-state">
              <div className="empty-title">Fetching active campaigns...</div>
            </div>
          ) : discountList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No active discounts.</div>
              <div className="empty-sub">Use the form to create one.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Original Price</th>
                    <th>Promo Price</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {discountList.map((product) => {
                    const isActive = product.discountExpiry > Date.now();
                    return (
                      <tr key={product._id} className={isActive ? "discount-row-active" : ""}>
                        <td><strong>{getDisplayName(product)}</strong></td>
                        <td>UGX {product.originalPrice.toLocaleString()}</td>
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
