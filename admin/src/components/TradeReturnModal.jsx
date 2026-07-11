import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X, RotateCcw, AlertTriangle, Search, Minus, Plus } from "lucide-react";
import { useOfflineProducts } from "../hooks/useOfflineProducts";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import CatalogDownloadBanner from "./CatalogDownloadBanner";

/**
 * Resolves an already-pending return by trading it for replacement
 * product(s) — the "later" counterpart to ReturnProcessModal, which bundles
 * exchange selection into the initial return submission. No cash refunds:
 * customer tops up if the trade is pricier, or forfeits leftover value if
 * it's cheaper.
 */
export default function TradeReturnModal({ ret, token, onClose, onSubmit }) {
  const [exchangeCart, setExchangeCart] = useState([]);
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("physical");
  const [topUpMomoPhone, setTopUpMomoPhone] = useState("");
  const [topUpCardOrderId, setTopUpCardOrderId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const order = useQuery(api.orders.getOrderDetailById, { token, orderId: ret.orderId });
  const isOnline = useOnlineStatus();
  const { products, isSyncing, needsBootstrap, requestBootstrap } = useOfflineProducts(token);

  // Value of the return being resolved, discount-adjusted the same way the
  // server (attachExchangeToReturn) will compute it once the order loads.
  const returnedTotal = useMemo(() => {
    let raw = 0;
    for (const item of ret.items) {
      raw += item.quantity * item.unitPrice;
    }
    if (order && order.subtotal > 0 && order.discountAmount > 0) {
      const discountPercentage = order.discountAmount / order.subtotal;
      raw = Math.round(raw * (1 - discountPercentage));
    }
    return raw;
  }, [ret.items, order]);

  const getOriginalPrice = (product) => {
    if (!product) return 0;
    const prices = [product.price, product.wasPrice, product.originalPrice, product.discountPrice].filter(
      v => typeof v === "number" && v > 0
    );
    return prices.length > 0 ? Math.max(...prices) : (product.price || 0);
  };

  const addExchangeItem = (product) => {
    setExchangeCart(prev => {
      const existing = prev.find(item => item.productId === product._id);
      if (existing) {
        if (product.inventory !== undefined && existing.quantity >= product.inventory) {
          setError(`Cannot add more ${product.name}. Only ${product.inventory} available in stock.`);
          return prev;
        }
        return prev.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product._id, name: product.name, price: getOriginalPrice(product), quantity: 1, inventory: product.inventory }];
    });
  };

  const updateExchangeQty = (productId, delta, max) => {
    setExchangeCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (max !== undefined && newQty > max) {
          setError(`Stock limit reached. Only ${max} items available.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const exchangeTotal = useMemo(
    () => exchangeCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [exchangeCart]
  );

  const difference = exchangeTotal - returnedTotal;
  const topUpRequired = difference > 0 ? difference : 0;

  const filteredProducts = (products || []).filter(p =>
    p.name.toLowerCase().includes(exchangeSearch.toLowerCase()) ||
    p.barcode?.includes(exchangeSearch) ||
    p.sku?.toLowerCase().includes(exchangeSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (exchangeCart.length === 0) {
      setError("Please select at least one replacement product for the exchange.");
      return;
    }

    if (topUpRequired > 0 && (topUpMethod === "momo" ? !topUpMomoPhone.trim() : false)) {
      setError("MoMo phone number is required for a top-up payment.");
      return;
    }
    if (topUpRequired > 0 && (topUpMethod === "momo" || topUpMethod === "card") && !topUpCardOrderId.trim()) {
      setError("Transaction ID is required for this top-up payment method.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const success = await onSubmit({
      returnId: ret.returnId,
      exchangeItems: exchangeCart.map(item => ({ productId: item.productId, quantity: item.quantity })),
      topUp: topUpRequired > 0 ? {
        method: topUpMethod,
        amount: topUpRequired,
        momoPhone: topUpMethod === "momo" ? topUpMomoPhone.trim() : undefined,
        cardOrderId: (topUpMethod === "momo" || topUpMethod === "card") ? topUpCardOrderId.trim() : undefined,
      } : undefined,
    });

    setIsSubmitting(false);
    if (!success) {
      setError("Failed to process trade. Ensure stock is sufficient.");
    }
  };

  return (
    <div className="modal-overlay is-open">
      <div className="modal" style={{ maxWidth: "760px" }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Resolve Return — Trade</h2>
            <span className="modal-subtitle">No cash refunds — customer must take a replacement product</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error is-visible">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="section-header">
            <h3 className="section-title">Items Being Returned</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {ret.items.map((item) => (
                  <tr key={item._id}>
                    <td className="item-name">{item.productName}</td>
                    <td className="item-qty">{item.quantity}</td>
                    <td>UGX {item.unitPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 4px", fontSize: "13px", fontWeight: 700 }}>
            <span>Value of returned items</span>
            <span>UGX {returnedTotal.toLocaleString()}</span>
          </div>

          <div className="section-header">
            <h3 className="section-title">Select Replacement Product(s)</h3>
          </div>

          <CatalogDownloadBanner
            show={needsBootstrap && !bannerDismissed}
            isOnline={isOnline}
            onDownload={requestBootstrap}
            onDismiss={() => setBannerDismissed(true)}
            message="Product catalog isn't downloaded on this device — replacement product selection won't work until this finishes."
          />

          <div className="stock-search-wrap">
            <Search className="stock-search-icon" size={15} />
            <input
              className="stock-search-input"
              type="text"
              placeholder="Search barcode, name..."
              value={exchangeSearch}
              onChange={(e) => setExchangeSearch(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {products.length === 0 && isSyncing ? (
            <div className="empty-state">
              <div className="empty-title">Loading products...</div>
            </div>
          ) : (
            <div style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid var(--surface-container-highest)", borderRadius: "var(--radius-md)", marginTop: "var(--space-2)" }}>
              {filteredProducts.slice(0, 40).map(p => {
                const inStock = p.inventory === undefined || p.inventory > 0;
                const cartItem = exchangeCart.find(item => item.productId === p._id);
                const atMax = cartItem && p.inventory !== undefined && cartItem.quantity >= p.inventory;
                return (
                  <button
                    type="button"
                    key={p._id}
                    onClick={() => addExchangeItem(p)}
                    disabled={!inStock || atMax || isSubmitting}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--surface-container-highest)",
                      background: cartItem ? "rgba(211, 80, 151, 0.08)" : "transparent",
                      cursor: inStock ? "pointer" : "not-allowed",
                      opacity: inStock ? 1 : 0.5,
                      textAlign: "left"
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{p.name}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                        {p.inventory !== undefined ? (!inStock ? "Out of stock" : `${p.inventory} left`) : ""}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-brand-primary)" }}>
                        UGX {getOriginalPrice(p).toLocaleString()}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {exchangeCart.length > 0 && (
            <div style={{ marginTop: "var(--space-3)" }}>
              {exchangeCart.map(item => (
                <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--surface-container-highest)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>UGX {item.price.toLocaleString()} each</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button type="button" className="btn btn--stepper" onClick={() => updateExchangeQty(item.productId, -1)} disabled={isSubmitting}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: "13px", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>{item.quantity}</span>
                    <button type="button" className="btn btn--stepper" onClick={() => updateExchangeQty(item.productId, 1, item.inventory)} disabled={isSubmitting}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, minWidth: "90px", textAlign: "right" }}>
                    UGX {(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--surface-container)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
              <span>Value of replacement item(s)</span>
              <span style={{ fontWeight: 700 }}>UGX {exchangeTotal.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, paddingTop: "6px", borderTop: "1px solid var(--surface-container-highest)" }}>
              {difference > 0 ? (
                <>
                  <span style={{ color: "#ef4444" }}>Customer owes top-up</span>
                  <span style={{ color: "#ef4444" }}>UGX {difference.toLocaleString()}</span>
                </>
              ) : difference < 0 ? (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>Difference forfeited (no cash refund)</span>
                  <span style={{ color: "var(--text-tertiary)" }}>UGX {Math.abs(difference).toLocaleString()}</span>
                </>
              ) : (
                <>
                  <span style={{ color: "#16a34a" }}>Even exchange</span>
                  <span style={{ color: "#16a34a" }}>UGX 0</span>
                </>
              )}
            </div>
          </div>

          {topUpRequired > 0 && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Top-Up Payment Method</label>
                <select
                  className="form-input"
                  value={topUpMethod}
                  onChange={(e) => setTopUpMethod(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="physical">Cash</option>
                  <option value="momo">Mobile Money (MoMo)</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {topUpMethod === "momo" && (
                <div className="form-group">
                  <label className="form-label">MoMo Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +256701..."
                    value={topUpMomoPhone}
                    onChange={(e) => setTopUpMomoPhone(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              )}

              {(topUpMethod === "momo" || topUpMethod === "card") && (
                <div className="form-group">
                  <label className="form-label">Transaction ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. MoMo/terminal reference"
                    value={topUpCardOrderId}
                    onChange={(e) => setTopUpCardOrderId(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--secondary btn--md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn--danger btn--md${isSubmitting ? " is-loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting && <span className="btn-spinner" />}
              Confirm Trade
              {!isSubmitting && <RotateCcw size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
