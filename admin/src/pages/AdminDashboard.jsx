import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "../hooks/useStaffAuth";
import CustomerActivityModal from "../components/CustomerActivityModal";
import OrderDetailModal from "../components/OrderDetailModal";
import RemindersWidget from "../components/RemindersWidget";
import CalendarPanel from "../components/CalendarPanel";
import SalesMetricsPanel from "../components/SalesMetricsPanel";
import ReturnsPanel from "../components/ReturnsPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import StockManagerPanel from "../components/StockManagerPanel";
import DiscountsPanel from "../components/DiscountsPanel";
import ProductSalesPanel from "../components/ProductSalesPanel";
import OnlineOrdersPanel from "../components/OnlineOrdersPanel";
import { getTodayStr } from "../utils/reminderHelpers";
import sosLogo from "../assets/SOS.png";
import profileImg from "../assets/about-dennan.png";
import {
  LayoutDashboard,
  Boxes,
  Tag,
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  LogOut,
  ChevronRight,
  DollarSign,
  BarChart3,
  Calendar as CalendarIcon,
  RotateCcw,
  History,
  ClipboardList,
  Search,
  Package
} from "lucide-react";

export default function AdminDashboard() {
  const { user, token, logout } = useStaffAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    () => new URLSearchParams(window.location.search).get("tab") || "overview"
  );

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

  // Staff roster
  const staffList = useQuery(api.staffAuth.getStaffList, { token });

  // Customer List
  const customerList = useQuery(api.customerActivities.getCustomerList, { token });
  const [customerSearch, setCustomerSearch] = useState("");

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            <img src={sosLogo} alt="Dennan" className="sidebar-logo" />
            <span className="sidebar-brand-sub">Admin Hub</span>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Overview</span>
              <button
                className={`sidebar-nav-item ${activeTab === "overview" ? "is-active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>
            </div>

            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Sales & Orders</span>
              <button
                className={`sidebar-nav-item ${activeTab === "onlineOrders" ? "is-active" : ""}`}
                onClick={() => setActiveTab("onlineOrders")}
              >
                <Package size={18} />
                <span>Online Orders</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "metrics" ? "is-active" : ""}`}
                onClick={() => setActiveTab("metrics")}
              >
                <BarChart3 size={18} />
                <span>Sales Metrics</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "history" ? "is-active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <History size={18} />
                <span>Order History</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "returns" ? "is-active" : ""}`}
                onClick={() => setActiveTab("returns")}
              >
                <RotateCcw size={18} />
                <span>Returns</span>
              </button>
            </div>

            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Catalogue</span>
              <button
                className={`sidebar-nav-item ${activeTab === "stock" ? "is-active" : ""}`}
                onClick={() => setActiveTab("stock")}
              >
                <Boxes size={18} />
                <span>Stock Manager</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "salesReport" ? "is-active" : ""}`}
                onClick={() => setActiveTab("salesReport")}
              >
                <ClipboardList size={18} />
                <span>Sales Report</span>
              </button>
              <button
                className={`sidebar-nav-item ${activeTab === "discounts" ? "is-active" : ""}`}
                onClick={() => setActiveTab("discounts")}
              >
                <Tag size={18} />
                <span>Discounts & Promos</span>
              </button>
            </div>

            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">People & Planning</span>
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
              <button
                className={`sidebar-nav-item ${activeTab === "staff" ? "is-active" : ""}`}
                onClick={() => setActiveTab("staff")}
              >
                <UserCheck size={18} />
                <span>Staff Roster</span>
              </button>
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="avatar">
                <img src={profileImg} alt={user?.name || "Profile"} className="avatar-img" />
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className="sidebar-user-role">{user?.accountRole?.toUpperCase()}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout} type="button">
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

          {/* TAB: ONLINE ORDERS QUEUE */}
          {activeTab === "onlineOrders" && (
            <OnlineOrdersPanel token={token} />
          )}

          {/* TAB 2: STOCK MANAGER */}
          {activeTab === "stock" && (
            <StockManagerPanel token={token} navigate={navigate} />
          )}

          {/* TAB: SALES REPORT (products sold in a date range) */}
          {activeTab === "salesReport" && (
            <ProductSalesPanel token={token} />
          )}

          {/* TAB 3: DISCOUNTS & PROMOS */}
          {activeTab === "discounts" && (
            <DiscountsPanel token={token} />
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

          {/* TAB: ORDER HISTORY (all orders, admin-wide) */}
          {activeTab === "history" && (
            <OrderHistoryPanel token={token} onOpenOrder={setViewingOrder} />
          )}

          {/* TAB 6: CALENDAR / REMINDERS */}
          {activeTab === "calendar" && (
            <CalendarPanel token={token} onOpenOrder={setPendingOrderId} />
          )}

          {/* TAB 7: SALES METRICS */}
          {activeTab === "metrics" && (
            <SalesMetricsPanel token={token} onOpenOrder={setPendingOrderId} />
          )}

          {/* TAB 8: RETURNS APPROVAL */}
          {activeTab === "returns" && (
            <ReturnsPanel token={token} />
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
