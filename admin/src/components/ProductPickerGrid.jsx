import React from "react";
import { Search, X } from "lucide-react";

/**
 * Card-grid product picker shared by the walk-in POS tab and the two
 * return-resolution pages (Trade / Exchange), so every screen that lets
 * staff pick a product from the offline catalog shows the same product
 * (including out-of-stock, disabled) with images and stock badges instead
 * of a bare text list.
 */
export default function ProductPickerGrid({
  products,
  search,
  onSearchChange,
  searchPlaceholder = "Search barcode, name...",
  isLoading = false,
  loadingLabel = "Loading products...",
  extraTile = null,
  getPrice,
  getInventory,
  getCartQuantity,
  onSelect,
  disabled = false,
  getDisplayName = (p) => p.name,
}) {
  return (
    <div className="pos-products-container">
      <div className="stock-search-wrap">
        <Search className="stock-search-icon" size={15} />
        <input
          className="stock-search-input"
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button className="stock-search-clear" onClick={() => onSearchChange("")} type="button">
            <X size={12} />
          </button>
        )}
      </div>

      {products.length === 0 && isLoading ? (
        <div className="empty-state">
          <div className="empty-title">{loadingLabel}</div>
        </div>
      ) : (
        <div className="pos-products-grid">
          {extraTile}

          {products.map((p) => {
            const inventory = getInventory(p);
            const inStock = inventory === undefined || inventory > 0;
            const cartQuantity = getCartQuantity(p._id);
            const atMax = cartQuantity > 0 && inventory !== undefined && cartQuantity >= inventory;
            const price = getPrice(p);

            return (
              <button
                key={p._id}
                onClick={() => onSelect(p)}
                disabled={disabled || !inStock || atMax}
                type="button"
                style={{
                  background: "var(--surface-container-low)",
                  border: cartQuantity > 0 ? "2px solid var(--color-brand-primary)" : "1px solid var(--surface-container-highest)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-3)",
                  cursor: inStock ? "pointer" : "not-allowed",
                  opacity: inStock ? 1 : 0.5,
                  textAlign: "left",
                  position: "relative",
                }}
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt={getDisplayName(p)}
                    style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: "100%",
                    height: "90px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-2)",
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(236, 72, 153, 0.08))",
                    border: "1px solid rgba(99, 102, 241, 0.15)",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, marginBottom: "4px" }}>
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.5px" }}>
                      {p.brand || "Dennan"}
                    </span>
                  </div>
                )}

                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "3px" }}>{getDisplayName(p)}</div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Barcode: {p.barcode}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-brand-primary)" }}>UGX {price.toLocaleString()}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: !inStock ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: !inStock ? "#ef4444" : "#16a34a" }}>
                    {inventory !== undefined ? (!inStock ? "Out" : `${inventory} left`) : "In Stock"}
                  </span>
                </div>
                {cartQuantity > 0 && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "var(--color-brand-primary)", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                    {cartQuantity}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
