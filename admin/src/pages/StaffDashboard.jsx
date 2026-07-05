import React, { useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "../hooks/useStaffAuth";
import OrderDetailModal from "../components/OrderDetailModal";
import HandoverModal from "../components/HandoverModal";
import ReturnProcessModal from "../components/ReturnProcessModal";
import CustomerActivityModal from "../components/CustomerActivityModal";
import RemindersWidget from "../components/RemindersWidget";
import CalendarPanel from "../components/CalendarPanel";
import { getTodayStr } from "../utils/reminderHelpers";
import {
  ClipboardList,
  ShoppingCart,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Truck,
  Minus,
  Plus,
  X,
  Eye,
  Hand,
  Sparkles,
  LogOut,
  ChevronRight,
  Banknote,
  Smartphone,
  CreditCard,
  Calendar as CalendarIcon
} from "lucide-react";

export default function StaffDashboard() {
  const { user, token, logout } = useStaffAuth();
  const [activeTab, setActiveTab] = useState("orders");

  // Modals state
  const [viewingOrder, setViewingOrder] = useState(null);
  const [handoverOrderId, setHandoverOrderId] = useState(null);
  const [returningOrder, setReturningOrder] = useState(null);
  const [crmCustomer, setCrmCustomer] = useState(null);

  // --- TAB 1: ORDERS QUEUE ---
  const { results: ordersList, status: ordersStatus, loadMore: loadMoreOrders } = usePaginatedQuery(
    api.orders.getOrdersForStaff,
    { token },
    { initialNumItems: 50 }
  );

  const claimOrderMutation = useMutation(api.orders.claimOrder);
  const handoverMutation = useMutation(api.orders.handoverToDelivery);
  const completeOrderMutation = useMutation(api.orders.completeOrder);
  const markFailedMutation = useMutation(api.orders.markOrderFailed);
  const processReturnMutation = useMutation(api.returns.processReturn);

  const handleClaimOrder = async (orderId) => {
    try {
      await claimOrderMutation({ token, orderId });
    } catch (err) {
      alert("Failed to claim order: " + err.message);
    }
  };

  const handleHandoverSubmit = async (data) => {
    try {
      await handoverMutation({
        token,
        orderId: data.orderId,
        deliveryPersonName: data.deliveryPersonName,
        riderPhone: data.riderPhone,
        expectedDeliveryTime: data.expectedDeliveryTime
      });
      setHandoverOrderId(null);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeOrderMutation({ token, orderId });
    } catch (err) {
      alert("Error completing order: " + err.message);
    }
  };

  const handleFailOrder = async (orderId) => {
    if (window.confirm("Mark this order as FAILED? Inventory will be automatically restocked.")) {
      try {
        await markFailedMutation({ token, orderId });
      } catch (err) {
        alert("Error marking order failed: " + err.message);
      }
    }
  };

  const handleReturnSubmit = async (data) => {
    try {
      await processReturnMutation({
        token,
        orderId: data.orderId,
        returnedItems: data.returnedItems,
        refundAmount: data.refundAmount,
        note: data.note
      });
      setReturningOrder(null);
      setViewingOrder(null); // Close order details modal
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // --- TAB 2: WALK-IN POS ---
  const posProducts = useQuery(api.products.getProductsForPOS, { token });
  const createPhysicalOrderMutation = useMutation(api.orders.createPhysicalOrder);

  const [posSearch, setPosSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [posCustomer, setPosCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    note: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("physical"); // "physical" | "momo" | "card"
  const [momoPhone, setMomoPhone] = useState("");
  const [cardOrderId, setCardOrderId] = useState("");
  const [scheduleReminder, setScheduleReminder] = useState(false);
  const [reminderType, setReminderType] = useState("call");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderPriority, setReminderPriority] = useState("normal");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const todayStr = getTodayStr();

  // --- Linked-order lookup, used when a Calendar reminder references an order ---
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const pendingOrderDetail = useQuery(
    api.orders.getOrderDetailById,
    pendingOrderId ? { token, orderId: pendingOrderId } : "skip"
  );
  React.useEffect(() => {
    if (pendingOrderDetail) {
      setViewingOrder(pendingOrderDetail);
      setPendingOrderId(null);
    }
  }, [pendingOrderDetail]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product._id);
      if (existing) {
        if (product.inventory !== undefined && existing.quantity >= product.inventory) {
          alert(`Cannot add more. Only ${product.inventory} available in stock.`);
          return prev;
        }
        return prev.map(item => item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product._id, name: product.name, price: product.price, quantity: 1, inventory: product.inventory }];
    });
  };

  const updateCartQty = (productId, delta, max) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (max !== undefined && newQty > max) {
          alert(`Stock limit reached. Only ${max} items available.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const resetPosForm = () => {
    setCart([]);
    setPosCustomer({ name: "", phone: "", email: "", note: "" });
    setPaymentMethod("physical");
    setMomoPhone("");
    setCardOrderId("");
    setScheduleReminder(false);
    setReminderType("call");
    setReminderDate("");
    setReminderTime("");
    setReminderNote("");
    setReminderPriority("normal");
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setCheckoutError("Cart is empty.");
      return;
    }
    if (!posCustomer.name.trim()) {
      setCheckoutError("Customer name is required.");
      return;
    }
    if (paymentMethod === "momo" && !momoPhone.trim()) {
      setCheckoutError("Mobile money phone number is required.");
      return;
    }
    if (paymentMethod === "card" && !cardOrderId.trim()) {
      setCheckoutError("Card Order ID is required for card payments.");
      return;
    }
    if (scheduleReminder && !reminderDate) {
      setCheckoutError("Please choose a reminder date.");
      return;
    }
    if (scheduleReminder && !reminderNote.trim()) {
      setCheckoutError("Please describe the reminder.");
      return;
    }

    setCheckoutError("");
    setIsCheckoutSubmitting(true);

    try {
      const itemsPayload = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      await createPhysicalOrderMutation({
        token,
        customerName: posCustomer.name.trim(),
        phone: posCustomer.phone.trim() || undefined,
        email: posCustomer.email.trim() || undefined,
        items: itemsPayload,
        paymentMethod,
        momoPhone: paymentMethod === "momo" ? momoPhone.trim() : undefined,
        cardOrderId: paymentMethod === "card" ? cardOrderId.trim() : undefined,
        note: posCustomer.note.trim() || undefined,
        reminder: scheduleReminder
          ? {
              type: reminderType,
              note: reminderNote.trim(),
              scheduledDate: reminderDate,
              scheduledTime: reminderTime || undefined,
              priority: reminderPriority
            }
          : undefined
      });

      setCheckoutSuccess(true);
      resetPosForm();
      setTimeout(() => setCheckoutSuccess(false), 5000);
    } catch (err) {
      setCheckoutError("Checkout failed: " + err.message);
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  // --- TAB 3: CUSTOMERS CRM ---
  const customerList = useQuery(api.customerActivities.getCustomerList, { token });
  const [customerSearch, setCustomerSearch] = useState("");

  // --- TAB 4: CALENDAR / REMINDERS ---
  const dueActivities = useQuery(api.customerActivities.getDueActivities, { token, currentDate: todayStr });

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const initials = (name) => (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const unclaimedOrders = ordersList?.filter(o => o.status === "preparing") || [];
  const activeOrders = ordersList?.filter(o => o.claimedBy === user?.id && ["packing", "dispatched"].includes(o.status)) || [];

  const filteredPosProducts = posProducts?.filter(p =>
    p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
    p.barcode.includes(posSearch) ||
    p.sku?.toLowerCase().includes(posSearch.toLowerCase())
  ) || [];

  const filteredCustomers = customerList?.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  ) || [];

  return (
    <div className="staff-portal-body">
      <div className="admin-layout">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="sidebar-brand-title">Dennan</span>
            <span className="sidebar-brand-sub">Staff Hub</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeTab === "orders" ? "is-active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              <ClipboardList size={18} />
              <span>Orders Queue</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "pos" ? "is-active" : ""}`}
              onClick={() => setActiveTab("pos")}
            >
              <ShoppingCart size={18} />
              <span>Walk-in POS</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "customers" ? "is-active" : ""}`}
              onClick={() => setActiveTab("customers")}
            >
              <Users size={18} />
              <span>Customers CRM</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "calendar" ? "is-active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              <CalendarIcon size={18} />
              <span>Calendar</span>
              {dueActivities && dueActivities.length > 0 && (
                <span className="sidebar-nav-badge">{dueActivities.length}</span>
              )}
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="avatar">{initials(user?.name)}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className="sidebar-user-role">{user?.accountRole?.toUpperCase()}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          {/* TAB 1: ORDERS QUEUE */}
          {activeTab === "orders" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Orders Queue</h1>
              </div>

              <RemindersWidget token={token} onViewCalendar={() => setActiveTab("calendar")} />

              <div className="tab-strip">
                <span className="tab-btn is-active">New & Unclaimed ({unclaimedOrders.length})</span>
                <span className="tab-btn">My Active Shipments ({activeOrders.length})</span>
              </div>

              <div className="order-feed">
                {ordersList === undefined ? (
                  <div className="empty-state">
                    <div className="empty-title">Syncing queue...</div>
                  </div>
                ) : unclaimedOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-title">No new orders in queue.</div>
                  </div>
                ) : (
                  unclaimedOrders.map(order => (
                    <article key={order._id} className="order-card order-card--new">
                      <div className="order-card-header">
                        <div>
                          <h2 className="order-customer-name">{order.customerName}</h2>
                          <div className="order-meta-line">
                            <span>UGX {order.grandTotal.toLocaleString()}</span>
                            <span className="meta-separator">·</span>
                            <span>Zone: {order.deliveryAddress?.zone}</span>
                          </div>
                        </div>
                        <span className="status-badge status-badge--new">
                          <span className="status-dot" />
                          New
                        </span>
                      </div>

                      <div className="order-details">
                        <div className="order-detail-row">
                          <span className="order-detail-icon"><ShoppingCart size={15} /></span>
                          <div className="order-detail-content">Items: {order.items?.length || 0} items</div>
                        </div>
                      </div>

                      <div className="order-card-footer">
                        <div className="order-footer-left" />
                        <div className="order-actions">
                          <button className="btn btn--secondary btn--sm" onClick={() => setViewingOrder(order)}>
                            <span className="btn-icon btn-icon--left"><Eye size={14} /></span>
                            <span className="btn-text">Details</span>
                          </button>
                          <button className="btn btn--primary btn--sm" onClick={() => handleClaimOrder(order._id)}>
                            <span className="btn-icon btn-icon--left"><Hand size={14} /></span>
                            <span className="btn-text">Claim Order</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="section-header">
                <h2 className="section-title">My Active Shipments</h2>
              </div>
              <div className="order-feed">
                {ordersList === undefined ? (
                  <div className="empty-state">
                    <div className="empty-title">Syncing queue...</div>
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-title">No active claimed orders.</div>
                  </div>
                ) : (
                  activeOrders.map(order => (
                    <article key={order._id} className={`order-card order-card--${order.status}`}>
                      <div className="order-card-header">
                        <div>
                          <h2 className="order-customer-name">{order.customerName}</h2>
                          <div className="order-meta-line">
                            <span>Zone: {order.deliveryAddress?.zone}</span>
                            <span className="meta-separator">·</span>
                            <span>UGX {order.grandTotal.toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={`status-badge status-badge--${order.status}`}>
                          <span className="status-dot" />
                          {order.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="order-card-footer">
                        <div className="order-footer-left" />
                        <div className="order-actions">
                          <button className="btn btn--secondary btn--sm" onClick={() => setViewingOrder(order)}>
                            <span className="btn-icon btn-icon--left"><Eye size={14} /></span>
                            <span className="btn-text">Details</span>
                          </button>

                          {order.status === "packing" && (
                            <button className="btn btn--primary btn--sm" onClick={() => setHandoverOrderId(order._id)}>
                              <span className="btn-icon btn-icon--left"><Truck size={14} /></span>
                              <span className="btn-text">Dispatch</span>
                            </button>
                          )}

                          {order.status === "dispatched" && (
                            <>
                              <button className="btn btn--outline btn--sm" onClick={() => handleCompleteOrder(order._id)}>
                                <span className="btn-icon btn-icon--left"><CheckCircle size={14} /></span>
                                <span className="btn-text">Complete</span>
                              </button>
                              <button className="btn btn--ghost btn--danger btn--sm" onClick={() => handleFailOrder(order._id)}>
                                <span className="btn-icon btn-icon--left"><XCircle size={14} /></span>
                                <span className="btn-text">Mark Failed</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WALK-IN POS */}
          {activeTab === "pos" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Walk-in Order</h1>
              </div>

              <div className="pos-layout">
                <div className="pos-products-container">
                  <div className="stock-search-wrap">
                    <Search className="stock-search-icon" size={15} />
                    <input
                      className="stock-search-input"
                      type="text"
                      placeholder="Search barcode, description..."
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                    />
                    {posSearch && (
                      <button className="stock-search-clear" onClick={() => setPosSearch("")}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {posProducts === undefined ? (
                    <div className="empty-state">
                      <div className="empty-title">Loading POS database...</div>
                    </div>
                  ) : (
                    <div className="pos-products-grid">
                      {filteredPosProducts.map(p => {
                        const inStock = p.inventory === undefined || p.inventory > 0;
                        const cartItem = cart.find(item => item.id === p._id);
                        const atMax = cartItem && p.inventory !== undefined && cartItem.quantity >= p.inventory;
                        return (
                          <button
                            key={p._id}
                            onClick={() => addToCart(p)}
                            disabled={!inStock || atMax}
                            style={{
                              background: "var(--surface-container-low)",
                              border: cartItem ? "2px solid var(--color-brand-primary)" : "1px solid var(--surface-container-highest)",
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
                                alt={p.name}
                                style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)", display: "block" }}
                              />
                            ) : (
                              <div style={{ width: "100%", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)", background: "var(--surface-container)", fontWeight: 700, fontSize: "20px", color: "var(--text-tertiary)" }}>
                                {p.name[0]}
                              </div>
                            )}
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "3px" }}>{p.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>Barcode: {p.barcode}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-brand-primary)" }}>UGX {p.price.toLocaleString()}</span>
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: !inStock ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: !inStock ? "#ef4444" : "#16a34a" }}>
                                {p.inventory !== undefined ? (!inStock ? "Out" : `${p.inventory} left`) : "In Stock"}
                              </span>
                            </div>
                            {cartItem && (
                              <div style={{ position: "absolute", top: 8, right: 8, background: "var(--color-brand-primary)", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                                {cartItem.quantity}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cart Drawer and Checkout Info */}
                <div style={{ position: "sticky", top: "20px" }}>
                  {checkoutSuccess && (
                    <div className="form-error is-visible" style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a", marginBottom: "var(--space-3)" }}>
                      <Sparkles size={16} />
                      <span>Physical order processed successfully!</span>
                    </div>
                  )}
                  {checkoutError && <div className="form-error is-visible">{checkoutError}</div>}

                  {cart.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-title">Cart is empty.</div>
                      <div className="empty-sub">Tap products to add them.</div>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckout} className="pos-checkout-form">
                      <div className="pos-cart-items-wrapper">
                        {cart.map(item => (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--surface-container-highest)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>UGX {item.price.toLocaleString()} each</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button type="button" className="btn btn--stepper" onClick={() => updateCartQty(item.id, -1)}>
                                <Minus size={12} />
                              </button>
                              <span style={{ fontSize: "13px", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>{item.quantity}</span>
                              <button type="button" className="btn btn--stepper" onClick={() => updateCartQty(item.id, 1, item.inventory)}>
                                <Plus size={12} />
                              </button>
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 700, minWidth: "90px", textAlign: "right" }}>
                              UGX {(item.price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "2px solid var(--surface-container-high)" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>Total Payable</span>
                        <strong style={{ fontSize: "16px" }}>UGX {cartSubtotal.toLocaleString()}</strong>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Walk-in Customer"
                          value={posCustomer.name}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, name: e.target.value }))}
                          required
                          disabled={isCheckoutSubmitting}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Phone (Optional)</label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="e.g. +256701..."
                          value={posCustomer.phone}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          disabled={isCheckoutSubmitting}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Email (Optional)</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. customer@domain.com"
                          value={posCustomer.email}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, email: e.target.value }))}
                          disabled={isCheckoutSubmitting}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Checkout Note</label>
                        <textarea
                          rows={2}
                          className="form-input"
                          placeholder="Special instructions or receipt references..."
                          value={posCustomer.note}
                          onChange={(e) => setPosCustomer(prev => ({ ...prev, note: e.target.value }))}
                          disabled={isCheckoutSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Payment Method</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                          <button
                            type="button"
                            className={`btn btn--sm ${paymentMethod === "physical" ? "btn--primary" : "btn--secondary"}`}
                            onClick={() => setPaymentMethod("physical")}
                            disabled={isCheckoutSubmitting}
                            style={{ padding: "8px 4px", fontSize: "12px", minWidth: 0 }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Banknote size={12} /> Cash</span>
                          </button>
                          <button
                            type="button"
                            className={`btn btn--sm ${paymentMethod === "momo" ? "btn--primary" : "btn--secondary"}`}
                            onClick={() => setPaymentMethod("momo")}
                            disabled={isCheckoutSubmitting}
                            style={{ padding: "8px 4px", fontSize: "12px", minWidth: 0 }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Smartphone size={12} /> MoMo</span>
                          </button>
                          <button
                            type="button"
                            className={`btn btn--sm ${paymentMethod === "card" ? "btn--primary" : "btn--secondary"}`}
                            onClick={() => setPaymentMethod("card")}
                            disabled={isCheckoutSubmitting}
                            style={{ padding: "8px 4px", fontSize: "12px", minWidth: 0 }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><CreditCard size={12} /> Card</span>
                          </button>
                        </div>
                      </div>

                      {paymentMethod === "momo" && (
                        <div className="form-group">
                          <label className="form-label">Mobile Money Phone</label>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="e.g. +256701..."
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value)}
                            disabled={isCheckoutSubmitting}
                            required
                          />
                        </div>
                      )}

                      {paymentMethod === "card" && (
                        <div className="form-group">
                          <label className="form-label">Card Order ID (from terminal receipt)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. terminal reference number"
                            value={cardOrderId}
                            onChange={(e) => setCardOrderId(e.target.value)}
                            disabled={isCheckoutSubmitting}
                            required
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label className="toggle-container" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={scheduleReminder}
                            onChange={(e) => {
                              setScheduleReminder(e.target.checked);
                              if (e.target.checked && !reminderDate) setReminderDate(todayStr);
                            }}
                            disabled={isCheckoutSubmitting}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label" style={{ fontSize: "12px", fontWeight: 700 }}>Schedule a follow-up call / reminder?</span>
                        </label>
                      </div>

                      {scheduleReminder && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", background: "var(--surface-container)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--surface-container-highest)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Date</label>
                              <input type="date" className="form-input" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} disabled={isCheckoutSubmitting} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Time (optional)</label>
                              <input type="time" className="form-input" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isCheckoutSubmitting} />
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Type</label>
                              <select className="form-input" value={reminderType} onChange={(e) => setReminderType(e.target.value)} disabled={isCheckoutSubmitting} style={{ padding: "0 8px", height: "36px", fontSize: "12px" }}>
                                <option value="call">Call</option>
                                <option value="meeting">Meeting</option>
                                <option value="email">Email</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "11px" }}>Priority</label>
                              <select className="form-input" value={reminderPriority} onChange={(e) => setReminderPriority(e.target.value)} disabled={isCheckoutSubmitting} style={{ padding: "0 8px", height: "36px", fontSize: "12px" }}>
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: "11px" }}>Reminder Notes</label>
                            <textarea
                              className="form-input"
                              rows={2}
                              placeholder="e.g. Call to confirm delivery satisfaction..."
                              value={reminderNote}
                              onChange={(e) => setReminderNote(e.target.value)}
                              disabled={isCheckoutSubmitting}
                              style={{ fontSize: "12px" }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className={`btn btn--primary btn--md btn--full-width${isCheckoutSubmitting ? " is-loading" : ""}`}
                        disabled={isCheckoutSubmitting}
                      >
                        {isCheckoutSubmitting && <span className="btn-spinner" />}
                        Complete Store Purchase
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMERS CRM */}
          {activeTab === "customers" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">Customer Directory & Interactions</h1>
                <div className="stock-search-wrap">
                  <Search className="stock-search-icon" size={16} />
                  <input
                    className="stock-search-input"
                    type="text"
                    placeholder="Search by name, phone, email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>

              {customerList === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading customer roster...</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Orders Completed</th>
                        <th>Notes Summary</th>
                        <th style={{ width: "120px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr key={c.id}>
                          <td className="td-customer">{c.name}</td>
                          <td className="td-email">{c.email || "—"}</td>
                          <td className="td-phone">{c.phone || "—"}</td>
                          <td>{c.ordersCount}</td>
                          <td>{c.customerNotes ? (c.customerNotes.length > 50 ? c.customerNotes.substring(0, 50) + "..." : c.customerNotes) : "No notes logged."}</td>
                          <td className="td-action">
                            <button className="btn btn--secondary btn--sm" onClick={() => setCrmCustomer(c)}>
                              View CRM <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CALENDAR / REMINDERS */}
          {activeTab === "calendar" && (
            <CalendarPanel token={token} onOpenOrder={setPendingOrderId} />
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onOpenReturn={(order) => setReturningOrder(order)}
          token={token}
        />
      )}

      {/* Rider Handover Modal */}
      {handoverOrderId && (
        <HandoverModal
          orderId={handoverOrderId}
          onClose={() => setHandoverOrderId(null)}
          onSubmit={handleHandoverSubmit}
        />
      )}

      {/* Returns processing modal */}
      {returningOrder && (
        <ReturnProcessModal
          order={returningOrder}
          onClose={() => setReturningOrder(null)}
          onSubmit={handleReturnSubmit}
        />
      )}

      {/* Customer CRM modal */}
      {crmCustomer && (
        <CustomerActivityModal
          customer={crmCustomer}
          token={token}
          onClose={() => {
            setCrmCustomer(null);
            // Convex automatically updates queries when state changes!
          }}
        />
      )}
    </div>
  );
}
