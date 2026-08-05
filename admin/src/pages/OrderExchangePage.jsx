import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useStaffAuth } from "../hooks/useStaffAuth";
import { useProductDisplayName } from "../hooks/useProductDisplayName";
import { useOfflineProducts } from "../hooks/useOfflineProducts";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import Sidebar from "../components/Sidebar";
import ProductPickerGrid from "../components/ProductPickerGrid";
import CatalogDownloadBanner from "../components/CatalogDownloadBanner";
import { getReturnPageSidebarGroups } from "../utils/sidebarGroups";
import { ArrowLeft, RotateCcw, AlertTriangle, Minus, Plus } from "lucide-react";

/**
 * Exchange-only returns flow, triggered from the "return" button on an
 * order: customers never receive a cash refund. They must pick replacement
 * product(s) — topping up if the exchange is pricier than what they
 * returned, or forfeiting any leftover value if it's cheaper.
 *
 * A dedicated page rather than a modal so the product list is exactly what
 * this device has cached locally (via useOfflineProducts) with no
 * live-fetch fallback — if the catalog isn't downloaded yet, an inline
 * CatalogDownloadBanner lets staff (or an admin, who has no POS tab) fetch
 * it right here instead of being sent elsewhere.
 */
export default function OrderExchangePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, token, logout } = useStaffAuth();
  const { getDisplayName } = useProductDisplayName(token);
  const sidebarGroups = getReturnPageSidebarGroups(user?.accountRole, navigate);

  const [returnQuantities, setReturnQuantities] = useState({});
  const [restockChoices, setRestockChoices] = useState({});
  const [exchangeCart, setExchangeCart] = useState([]);
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [topUpMethod, setTopUpMethod] = useState("physical");
  const [topUpMomoPhone, setTopUpMomoPhone] = useState("");
  const [topUpCardOrderId, setTopUpCardOrderId] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [error, setError] = useState("");
  const errorRef = React.useRef(null);

  const showError = (message) => {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const order = useTrackedQuery(
    api.orders.getOrderDetailById,
    token && orderId ? { token, orderId } : "skip"
  );
  const { products, needsBootstrap, requestBootstrap } = useOfflineProducts(token);
  const submitExchangeMutation = useMutation(api.returns.submitExchange);
  const isOnline = useOnlineStatus();
  const [catalogPromptDismissed, setCatalogPromptDismissed] = useState(false);

  const handleDownloadCatalog = async () => {
    await requestBootstrap();
  };

  useEffect(() => {
    if (order && order.items) {
      const initial = {};
      const initialRestock = {};
      order.items.forEach(item => {
        initial[item.productId] = 0;
        initialRestock[item.productId] = true;
      });
      setReturnQuantities(initial);
      setRestockChoices(initialRestock);
    }
  }, [order]);

  const handleQuantityChange = (productId, val, max) => {
    const parsed = parseInt(val) || 0;
    const clamped = Math.max(0, Math.min(max, parsed));
    setReturnQuantities(prev => ({
      ...prev,
      [productId]: clamped
    }));
  };

  const handleRestockChange = (productId, restock) => {
    setRestockChoices(prev => ({ ...prev, [productId]: restock }));
  };

  // Value of returned items, proportionally discounted like the original order —
  // mirrors the server-side calc in returns.submitExchange.
  const returnedTotal = useMemo(() => {
    if (!order || !order.items) return 0;
    let suggested = 0;
    order.items.forEach(item => {
      const qty = returnQuantities[item.productId] || 0;
      suggested += qty * item.unitPrice;
    });
    if (order.subtotal > 0 && order.discountAmount > 0) {
      const discountPercentage = order.discountAmount / order.subtotal;
      suggested = Math.round(suggested * (1 - discountPercentage));
    }
    return suggested;
  }, [returnQuantities, order]);

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
          setError(`Cannot add more ${getDisplayName(product)}. Only ${product.inventory} available in stock.`);
          return prev;
        }
        return prev.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product._id, name: getDisplayName(product), price: getOriginalPrice(product), quantity: 1, inventory: product.inventory }];
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

  // Memoized so this doesn't re-run over the full catalog on every render -
  // only when the cached catalog or the search term actually change.
  const filteredProducts = useMemo(
    () =>
      products.filter(p =>
        p.name.toLowerCase().includes(exchangeSearch.toLowerCase()) ||
        p.barcode?.includes(exchangeSearch) ||
        p.sku?.toLowerCase().includes(exchangeSearch.toLowerCase())
      ),
    [products, exchangeSearch]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const returnedItems = Object.entries(returnQuantities)
      .map(([productId, quantity]) => ({ productId, quantity, restock: !!restockChoices[productId] }))
      .filter(item => item.quantity > 0);

    if (returnedItems.length === 0) {
      showError("Please select at least one item and quantity to return.");
      return;
    }

    if (exchangeCart.length === 0) {
      showError("Please select at least one replacement product for the exchange.");
      return;
    }

    if (topUpRequired > 0 && (topUpMethod === "momo" ? !topUpMomoPhone.trim() : false)) {
      showError("MoMo phone number is required for a top-up payment.");
      return;
    }
    if (topUpRequired > 0 && (topUpMethod === "momo" || topUpMethod === "card") && !topUpCardOrderId.trim()) {
      showError("Transaction ID is required for this top-up payment method.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await submitExchangeMutation({
        token,
        orderId,
        returnedItems,
        exchangeItems: exchangeCart.map(item => ({ productId: item.productId, quantity: item.quantity })),
        topUp: topUpRequired > 0 ? {
          method: topUpMethod,
          amount: topUpRequired,
          momoPhone: topUpMethod === "momo" ? topUpMomoPhone.trim() : undefined,
          cardOrderId: (topUpMethod === "momo" || topUpMethod === "card") ? topUpCardOrderId.trim() : undefined,
        } : undefined,
        note: note.trim() || undefined
      });

      const processedReceipt = {
        isReturn: true,
        type: "return",
        returnId: res.returnId,
        receiptNumber: res.receiptNumber,
        orderReceiptNumber: order.receiptNumber,
        date: Date.now(),
        customerName: order.customerName || order.deliveryAddress?.name,
        customerPhone: order.deliveryAddress?.phone || order.customerPhone,
        cashier: user?.name || "Staff",
        returnedItems: returnedItems.map(item => {
          const orig = order.items?.find(i => i.productId === item.productId);
          return {
            name: orig?.productName || "Product",
            quantity: item.quantity,
            price: orig?.unitPrice || 0,
          };
        }),
        exchangeItems: exchangeCart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        returnedTotal,
        exchangeTotal,
        topUpAmount: topUpRequired > 0 ? topUpRequired : 0,
        topUpMethod: topUpRequired > 0 ? topUpMethod : undefined,
        note: note.trim() || undefined,
      };

      setCompletedReceipt(processedReceipt);
    } catch (err) {
      showError("Failed to process exchange: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (order === undefined) {
    return (
      <div className="staff-portal-body">
        <div className="admin-layout">
          <Sidebar storageKey={`dennan_sidebar_collapsed_${user?.accountRole}`} user={user} onLogout={logout} groups={sidebarGroups} />
          <main className="admin-main">
            <div className="admin-tab-panel is-active">
              <div className="empty-state">
                <div className="empty-title">Loading order...</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="staff-portal-body">
        <div className="admin-layout">
          <Sidebar storageKey={`dennan_sidebar_collapsed_${user?.accountRole}`} user={user} onLogout={logout} groups={sidebarGroups} />
          <main className="admin-main">
            <div className="admin-tab-panel is-active">
              <div className="empty-state">
                <div className="empty-title">Order not found.</div>
                <Link to="/" className="btn btn--secondary btn--md" style={{ marginTop: "var(--space-3)" }}>
                  <ArrowLeft size={16} /> Back
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-portal-body">
      <div className="admin-layout">
        <Sidebar storageKey={`dennan_sidebar_collapsed_${user?.accountRole}`} user={user} onLogout={logout} groups={sidebarGroups} />
        <main className="admin-main">
        <div className="admin-tab-panel is-active" style={{ maxWidth: "760px", margin: "0 auto" }}>
      <Link to="/" className="btn btn--ghost btn--sm" style={{ marginBottom: "var(--space-3)" }}>
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="admin-page-title">Process Exchange</h1>
      <p className="returns-panel-meta" style={{ marginTop: "-8px", marginBottom: "var(--space-3)" }}>
        No cash refunds — customer must take a replacement product
      </p>

      <form onSubmit={handleSubmit} className="modal-form">
        {error && (
          <div className="form-error is-visible" ref={errorRef}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="section-header">
          <h3 className="section-title">Step 1 — Items Being Returned</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Ordered Qty</th>
                <th>Unit Price</th>
                <th style={{ width: "120px" }}>Return Qty</th>
                <th style={{ width: "180px" }}>Restock?</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="item-name">
                    {item.productName}
                    {item.size && <div>Size: {item.size}</div>}
                  </td>
                  <td className="item-qty">{item.quantity}</td>
                  <td>UGX {item.unitPrice.toLocaleString()}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      className="form-input"
                      style={{ width: "80px" }}
                      value={returnQuantities[item.productId] ?? 0}
                      onChange={(e) => handleQuantityChange(item.productId, e.target.value, item.quantity)}
                      required
                      disabled={isSubmitting}
                    />
                  </td>
                  <td>
                    {(returnQuantities[item.productId] ?? 0) > 0 && (
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                          <input
                            type="radio"
                            name={`restock-${item.productId}`}
                            checked={!!restockChoices[item.productId]}
                            onChange={() => handleRestockChange(item.productId, true)}
                            disabled={isSubmitting}
                          />
                          Restock
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                          <input
                            type="radio"
                            name={`restock-${item.productId}`}
                            checked={!restockChoices[item.productId]}
                            onChange={() => handleRestockChange(item.productId, false)}
                            disabled={isSubmitting}
                          />
                          Don't restock
                        </label>
                      </div>
                    )}
                  </td>
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
          <h3 className="section-title">Step 2 — Select Replacement Product(s)</h3>
        </div>

        <CatalogDownloadBanner
          show={needsBootstrap && !catalogPromptDismissed}
          isOnline={isOnline}
          onDownload={handleDownloadCatalog}
          onDismiss={() => setCatalogPromptDismissed(true)}
          message="Product catalog isn't downloaded on this device — pick a replacement product below once it's downloaded."
        />

        {needsBootstrap ? (
          <div className="empty-state">
            <div className="empty-title">Product catalog isn't downloaded on this device yet.</div>
            <div className="empty-sub">Click "Download Products" above to fetch it, then come back here.</div>
          </div>
        ) : (
          <ProductPickerGrid
            products={filteredProducts}
            search={exchangeSearch}
            onSearchChange={setExchangeSearch}
            searchPlaceholder="Search barcode, name..."
            disabled={isSubmitting}
            getPrice={getOriginalPrice}
            getInventory={(p) => p.inventory}
            getCartQuantity={(productId) => exchangeCart.find(item => item.productId === productId)?.quantity || 0}
            onSelect={addExchangeItem}
            getDisplayName={getDisplayName}
          />
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

        <div className="form-group">
          <label className="form-label" htmlFor="note">Return / Exchange Reason / Note</label>
          <textarea
            id="note"
            className="form-input"
            placeholder="e.g. Size didn't fit, customer requested exchange"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn--secondary btn--md"
            onClick={() => navigate("/")}
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
            Process Exchange
            {!isSubmitting && <RotateCcw size={18} />}
          </button>
        </div>
      </form>
        </div>
        </main>
      </div>

      {completedReceipt && (
        <ReceiptModal
          receipt={completedReceipt}
          onClose={() => navigate("/", { state: { toast: { message: "Exchange processed successfully.", type: "success" } } })}
        />
      )}
    </div>
  );
}
