import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "../hooks/useStaffAuth";
import CustomerActivityModal from "../components/CustomerActivityModal";
import OrderDetailModal from "../components/OrderDetailModal";
import RemindersWidget from "../components/RemindersWidget";
import CalendarPanel from "../components/CalendarPanel";
import { getTodayStr } from "../utils/reminderHelpers";
import {
  LayoutDashboard,
  Boxes,
  Tag,
  Users,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  RefreshCcw,
  LogOut,
  ChevronRight,
  DollarSign,
  Calendar as CalendarIcon
} from "lucide-react";

export default function AdminDashboard() {
  const { user, token, logout } = useStaffAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // CRM customer modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Reminders / Calendar
  const todayStr = getTodayStr();
  const dueActivities = useQuery(api.customerActivities.getDueActivities, { token, currentDate: todayStr });

  // Linked-order lookup, used when a Calendar reminder references an order
  const [viewingOrder, setViewingOrder] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const pendingOrderDetail = useQuery(
    api.orders.getOrderDetailById,
    pendingOrderId ? { token, orderId: pendingOrderId } : "skip"
  );
  useEffect(() => {
    if (pendingOrderDetail) {
      setViewingOrder(pendingOrderDetail);
      setPendingOrderId(null);
    }
  }, [pendingOrderDetail]);

  // Stats Query
  const stats = useQuery(api.orders.adminGetOverviewStats, { token });

  // Stock list
  const stockList = useQuery(api.products.getStockList, { token });
  const adjustStockMutation = useMutation(api.products.adjustStock);
  const [stockSearch, setStockSearch] = useState("");
  const [stockAdjustment, setStockAdjustment] = useState({}); // productId -> delta

  // Discount list
  const discountList = useQuery(api.products.getDiscountList, { token });
  const setDiscountMutation = useMutation(api.products.setDiscount);
  const [discountForm, setDiscountForm] = useState({
    productId: "",
    discountPrice: 0,
    expiryDays: 7,
  });
  const [discountStatus, setDiscountStatus] = useState("");

  // Staff roster
  const staffList = useQuery(api.staffAuth.getStaffList, { token });

  // Customer List
  const customerList = useQuery(api.customerActivities.getCustomerList, { token });
  const [customerSearch, setCustomerSearch] = useState("");

  // Handler for stock delta adjustments
  const handleStockAdjustment = async (productId, delta) => {
    try {
      await adjustStockMutation({ token, productId, delta });
      // Reset input value
      setStockAdjustment(prev => ({ ...prev, [productId]: "" }));
    } catch (err) {
      alert("Failed to adjust stock: " + err.message);
    }
  };

  // Handler for setting discount
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
      setTimeout(() => setDiscountStatus(""), 4000);
    } catch (err) {
      setDiscountStatus("Error: " + err.message);
    }
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const filteredStock = stockList?.filter(p =>
    p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(stockSearch.toLowerCase()) ||
    p.barcode.includes(stockSearch)
  ) || [];
  const stockStats = stockList ? {
    ok: stockList.filter(p => p.inventory > p.reorderPoint).length,
    low: stockList.filter(p => p.inventory > 0 && p.inventory <= p.reorderPoint).length,
    out: stockList.filter(p => p.inventory <= 0).length,
  } : null;

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
            <span className="sidebar-brand-sub">Admin Console</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeTab === "overview" ? "is-active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "stock" ? "is-active" : ""}`}
              onClick={() => setActiveTab("stock")}
            >
              <Boxes size={18} />
              <span>Stock Manager</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "discounts" ? "is-active" : ""}`}
              onClick={() => setActiveTab("discounts")}
            >
              <Tag size={18} />
              <span>Discounts & Promos</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "staff" ? "is-active" : ""}`}
              onClick={() => setActiveTab("staff")}
            >
              <UserCheck size={18} />
              <span>Staff Roster</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === "customers" ? "is-active" : ""}`}
              onClick={() => setActiveTab("customers")}
            >
              <Users size={18} />
              <span>Customers</span>
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
              <div className="avatar">{initials}</div>
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
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="admin-tab-panel is-active">
              <h1 className="admin-page-title">Dashboard Overview</h1>
              <RemindersWidget token={token} onViewCalendar={() => setActiveTab("calendar")} />
              {stats === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading portal statistics...</div>
                </div>
              ) : (
                <>
                  <div className="stats-row">
                    <div className="stat-card">
                      <div className="stat-icon stat-icon--orchid">
                        <TrendingUp size={20} />
                      </div>
                      <span className="stat-value">UGX {stats.grossSales.toLocaleString()}</span>
                      <span className="stat-label">Gross Sales</span>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon stat-icon--blue">
                        <DollarSign size={20} />
                      </div>
                      <span className="stat-value">UGX {stats.aov.toLocaleString()}</span>
                      <span className="stat-label">Average Order Value</span>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon stat-icon--green">
                        <CheckCircle size={20} />
                      </div>
                      <span className="stat-value">{stats.completedOrdersCount}</span>
                      <span className="stat-label">Completed Orders</span>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon stat-icon--saffron">
                        <XCircle size={20} />
                      </div>
                      <span className="stat-value">{stats.failedOrdersCount}</span>
                      <span className="stat-label">Failed Orders</span>
                    </div>
                  </div>

                  <div className="section-header">
                    <h2 className="section-title">Fulfillment Leaderboard</h2>
                  </div>
                  {stats.leaderboard.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-title">No orders processed by staff yet.</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Staff Member</th>
                            <th>Orders Completed</th>
                            <th>Sales Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.leaderboard.map((staff, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong>{staff.name}</strong>
                                <div>{staff.email}</div>
                              </td>
                              <td>{staff.ordersCompletedCount}</td>
                              <td>UGX {staff.salesCompletedAmount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: STOCK MANAGER */}
          {activeTab === "stock" && (
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
              </div>

              {stockList === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Fetching stock listing...</div>
                </div>
              ) : (
                <>
                  <div className="stock-summary-row">
                    <div className="stock-summary-chip stock-summary-chip--green">
                      <span className="stock-chip-value">{stockStats.ok}</span>
                      <span className="stock-chip-label">In Stock</span>
                    </div>
                    <div className="stock-summary-chip stock-summary-chip--amber">
                      <span className="stock-chip-value">{stockStats.low}</span>
                      <span className="stock-chip-label">Low Stock</span>
                    </div>
                    <div className="stock-summary-chip stock-summary-chip--red">
                      <span className="stock-chip-value">{stockStats.out}</span>
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
                          <th>Status</th>
                          <th style={{ width: "200px" }}>Stock Adjustment</th>
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: DISCOUNTS & PROMOS */}
          {activeTab === "discounts" && (
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
                    <div className="form-group">
                      <label className="form-label">Select Product</label>
                      <select
                        className="form-input"
                        value={discountForm.productId}
                        onChange={(e) => setDiscountForm(prev => ({ ...prev, productId: e.target.value }))}
                        required
                      >
                        <option value="">-- Choose Product --</option>
                        {stockList?.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Barcode: {p.barcode})
                          </option>
                        ))}
                      </select>
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
                                <td><strong>{product.name}</strong></td>
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
          )}

          {/* TAB 4: STAFF ROSTER */}
          {activeTab === "staff" && (
            <div className="admin-tab-panel is-active">
              <h1 className="admin-page-title">Fulfillment Team Roster</h1>

              {staffList === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading team registry...</div>
                </div>
              ) : (
                <div className="staff-grid">
                  {staffList.map((member) => {
                    const totalOrders = member.orders?.length || 0;
                    const totalSales = member.orders?.reduce((sum, o) => sum + o.amountPaid, 0) || 0;
                    const memberInitials = (member.name || "?")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <div key={member.id} className="staff-card">
                        <div className="staff-card-header">
                          <div className="avatar avatar--lg">{memberInitials}</div>
                          <div className="staff-info">
                            <span className="staff-name">{member.name}</span>
                            <span className="staff-email">{member.email}</span>
                          </div>
                          <span className={`active-badge ${member.accountRole === "admin" ? "active-badge--on" : "active-badge--off"}`}>
                            <span className="active-dot" />
                            {member.accountRole.toUpperCase()}
                          </span>
                        </div>
                        <div className="staff-stats">
                          <div className="staff-stat">
                            <span className="staff-stat-value">{totalOrders}</span>
                            <span className="staff-stat-label">Orders Claimed</span>
                          </div>
                          <div className="staff-stat">
                            <span className="staff-stat-value">UGX {totalSales.toLocaleString()}</span>
                            <span className="staff-stat-label">Total Sales</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CUSTOMERS CRM */}
          {activeTab === "customers" && (
            <div className="admin-tab-panel is-active">
              <div className="page-header">
                <h1 className="admin-page-title">CRM Client Roster</h1>
                <div className="stock-search-wrap">
                  <Search className="stock-search-icon" size={16} />
                  <input
                    className="stock-search-input"
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>

              {customerList === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading customer data...</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Total Orders</th>
                        <th>CRM Notes Summary</th>
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
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => setSelectedCustomer(c)}
                            >
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

          {/* TAB 6: CALENDAR / REMINDERS */}
          {activeTab === "calendar" && (
            <CalendarPanel token={token} onOpenOrder={setPendingOrderId} />
          )}
        </main>
      </div>

      {/* CRM Customer Activity Modal */}
      {selectedCustomer && (
        <CustomerActivityModal
          customer={selectedCustomer}
          token={token}
          onClose={() => {
            setSelectedCustomer(null);
            // Refresh customerList is handled automatically because Convex queries are reactive!
          }}
        />
      )}

      {/* Order Detail Modal (opened from a Calendar reminder linked to an order) */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          token={token}
        />
      )}
    </div>
  );
}
