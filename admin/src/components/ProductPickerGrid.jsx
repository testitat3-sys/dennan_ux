import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";

// Matches .pos-products-grid's CSS (`grid-template-columns: repeat(auto-fill,
// minmax(180px, 1fr))`, `gap: var(--space-3)`) - kept in sync manually since
// virtualization needs to do that column math in JS instead of letting CSS
// grid handle it.
const CARD_MIN_WIDTH = 180;
const GRID_GAP = 12;
// Fallback row height (image 90px + ~2 lines of name + barcode + price row +
// padding/margins) used only until the first card is measured for real.
const FALLBACK_ROW_HEIGHT = 210;
const OVERSCAN_ROWS = 2;

/**
 * Card-grid product picker shared by the walk-in POS tab and the two
 * return-resolution pages (Trade / Exchange), so every screen that lets
 * staff pick a product from the offline catalog shows the same product
 * (including out-of-stock, disabled) with images and stock badges instead
 * of a bare text list.
 *
 * Virtualized: with a 5,000-product catalog, mounting every filtered result
 * as a real DOM node + <img> at once (the old behavior) was the dominant
 * cost of opening this screen. Only rows within the scroll viewport (+
 * overscan) are actually rendered; `search` still filters the full
 * `products` array up in the caller exactly as before, so searching is
 * unaffected - this only changes what's mounted from the filtered result.
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
  const scrollRef = useRef(null);
  const searchBarRef = useRef(null);
  const firstCardRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [rowHeight, setRowHeight] = useState(FALLBACK_ROW_HEIGHT);
  const [searchBarHeight, setSearchBarHeight] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The search bar scrolls with the grid inside the same container (it's
  // part of normal flow above it), so its height has to be subtracted from
  // scrollTop before doing row math - otherwise every row looks
  // searchBarHeight px further down than it actually is.
  useEffect(() => {
    if (searchBarRef.current) setSearchBarHeight(searchBarRef.current.offsetHeight);
  }, [containerWidth]);

  // Cells = the extra tile (if any) plus one cell per product, so both
  // share the same row/column math.
  const cells = useMemo(() => {
    const base = extraTile ? [{ kind: "extra" }] : [];
    return base.concat(products.map((p) => ({ kind: "product", p })));
  }, [products, extraTile]);

  // Measure the real height of the first rendered card once, instead of
  // trusting the estimate forever - keeps row placement accurate if a
  // future style tweak changes card padding/image height.
  useEffect(() => {
    if (!firstCardRef.current) return;
    const measured = firstCardRef.current.getBoundingClientRect().height;
    if (measured > 0 && Math.abs(measured - rowHeight) > 1) {
      setRowHeight(measured + GRID_GAP);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells.length > 0, containerWidth]);

  const columns = Math.max(1, Math.floor((containerWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
  const totalRows = Math.ceil(cells.length / columns);

  const gridScrollTop = Math.max(0, scrollTop - searchBarHeight);
  const startRow = Math.max(0, Math.floor(gridScrollTop / rowHeight) - OVERSCAN_ROWS);
  const visibleRowCount = Math.ceil(viewportHeight / rowHeight) + OVERSCAN_ROWS * 2;
  const endRow = Math.min(totalRows, startRow + Math.max(visibleRowCount, 1));

  const startIndex = startRow * columns;
  const endIndex = Math.min(cells.length, endRow * columns);
  const visibleCells = cells.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div className="pos-products-container" ref={scrollRef} onScroll={handleScroll}>
      <div className="stock-search-wrap" ref={searchBarRef}>
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

      {cells.length === 0 && isLoading ? (
        <div className="empty-state">
          <div className="empty-title">{loadingLabel}</div>
        </div>
      ) : (
        <div style={{ position: "relative", height: totalRows * rowHeight }}>
          <div
            className="pos-products-grid"
            style={{
              position: "absolute",
              top: startRow * rowHeight,
              left: 0,
              right: 0,
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }}
          >
            {visibleCells.map((cell, i) => {
              const cardRef = startIndex + i === 0 ? firstCardRef : null;

              if (cell.kind === "extra") {
                return React.cloneElement(extraTile, { key: "gift-voucher-tile", ref: cardRef });
              }

              const p = cell.p;
              const inventory = getInventory(p);
              const inStock = inventory === undefined || inventory > 0;
              const cartQuantity = getCartQuantity(p._id);
              const atMax = cartQuantity > 0 && inventory !== undefined && cartQuantity >= inventory;
              const price = getPrice(p);

              return (
                <button
                  key={p._id}
                  ref={cardRef}
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
                      loading="lazy"
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
        </div>
      )}
    </div>
  );
}
