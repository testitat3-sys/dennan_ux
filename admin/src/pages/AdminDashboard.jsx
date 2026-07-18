import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { useStaffAuth } from "../hooks/useStaffAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import OfflineBanner from "../components/OfflineBanner";
import Sidebar from "../components/Sidebar";
import CustomerActivityModal from "../components/CustomerActivityModal";
import OrderDetailModal from "../components/OrderDetailModal";
import HandoverModal from "../components/HandoverModal";
import DeliveryFailureModal from "../components/DeliveryFailureModal";
import RemindersWidget from "../components/RemindersWidget";
import CalendarPanel from "../components/CalendarPanel";
import SalesMetricsPanel from "../components/SalesMetricsPanel";
import ReturnsPanel from "../components/ReturnsPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import StockManagerPanel from "../components/StockManagerPanel";
import DiscountsPanel from "../components/DiscountsPanel";
import ProductSalesPanel from "../components/ProductSalesPanel";
import OnlineOrdersPanel from "../components/OnlineOrdersPanel";
import ErrorLogSettingsPanel from "../components/ErrorLogSettingsPanel";
import ProductDisplaySettingsPanel from "../components/ProductDisplaySettingsPanel";
import DbIOPanel from "../components/DbIOPanel";
import LeadsPanel from "../components/LeadsPanel";
import CashUpPanel from "../components/CashUpPanel";
import { getTodayStr } from "../utils/reminderHelpers";
import {
  LayoutDashboard,
  Boxes,
  Tag,
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronRight,
  DollarSign,
  BarChart3,
  Calendar as CalendarIcon,
  RotateCcw,
  History,
  ClipboardList,
  Search,
  Package,
  Settings,
  Inbox,
  Database,
  Wallet
} from "lucide-react";

const LAST_TAB_KEY = "dennan_admin_last_tab";

export default function AdminDashboard() {
  const { user, token, logout } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState(
    () =>
      new URLSearchParams(window.location.search).get("tab") ||
      localStorage.getItem(LAST_TAB_KEY) ||
      "overview"
  );

  useEffect(() => {
    localStorage.setItem(LAST_TAB_KEY, activeTab);
  }, [activeTab]);

  // Toast System
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (location.state?.toast) {
      showToast(location.state.toast.message, location.state.toast.type);
      // Clean up state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, showToast, navigate]);

  // Queries for badges and overview
  const pendingOrders = useQuery(api.orders.getPendingOrders, { token });
  const pendingReturns = useTrackedQuery(api.returns.getPendingReturns, { token });

  // Unseen logic
  const [lastSeenOrders, setLastSeenOrders] = useState(() => parseInt(localStorage.getItem("dennan_admin_last_seen_orders") || "0"));
  const [lastSeenReturns, setLastSeenReturns] = useState(() => parseInt(localStorage.getItem("dennan_admin_last_seen_returns") || "0"));

  useEffect(() => {
    if (activeTab === "onlineOrders" && pendingOrders && pendingOrders.length > 0) {
      const maxTime = Math.max(...pendingOrders.map(o => o.createdAt));
      localStorage.setItem("dennan_admin_last_seen_orders", maxTime.toString());
      setLastSeenOrders(maxTime);
    }
  }, [activeTab, pendingOrders]);

  useEffect(() => {
    if (activeTab === "returns" && pendingReturns && pendingReturns.length > 0) {
      const maxTime = Math.max(...pendingReturns.map(r => r.createdAt));
      localStorage.setItem("dennan_admin_last_seen_returns", maxTime.toString());
      setLastSeenReturns(maxTime);
    }
  }, [activeTab, pendingReturns]);

  const unseenOrdersCount = pendingOrders ? pendingOrders.filter(o => o.createdAt > lastSeenOrders).length : 0;
  const unseenReturnsCount = pendingReturns ? pendingReturns.filter(r => r.createdAt > lastSeenReturns).length : 0;

  // CRM customer modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Reminders / Calendar
  const todayStr = getTodayStr();
  const dueActivities = useTrackedQuery(api.customerActivities.getDueActivities, { token, currentDate: todayStr });

  // Linked-order lookup, used when a Calendar reminder references an order
  const [viewingOrder, setViewingOrder] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const pendingOrderDetail = useTrackedQuery(
    api.orders.getOrderDetailById,
    pendingOrderId ? { token, orderId: pendingOrderId } : "skip"
  );
  useEffect(() => {
    if (pendingOrderDetail) {
      setViewingOrder(pendingOrderDetail);
      setPendingOrderId(null);
    }
  }, [pendingOrderDetail]);

  // Fulfillment actions on the order detail modal (Order History / Calendar entry points)
  const [handoverOrder, setHandoverOrder] = useState(null);
  const [failureOrder, setFailureOrder] = useState(null);
  const claimOrderMutation = useMutation(api.orders.claimOrder);
  const handoverMutation = useMutation(api.orders.handoverToDelivery);
  const completeOrderMutation = useMutation(api.orders.completeOrder);
  const reportDeliveryFailureMutation = useMutation(api.orders.reportDeliveryFailure);

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
        expectedDeliveryTime: data.expectedDeliveryTime,
      });
      setHandoverOrder(null);
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

  const handleReportDeliveryFailure = async (data) => {
    try {
      await reportDeliveryFailureMutation({
        token,
        orderId: data.orderId,
        failedItems: data.failedItems,
        note: data.note,
      });
      setFailureOrder(null);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Stats Query
  const stats = useQuery(api.orders.adminGetOverviewStats, { token });

  // Staff roster
  const staffList = useTrackedQuery(api.staffAuth.getStaffList, { token });

  // Customer List
  const customerList = useTrackedQuery(
    api.customerActivities.getCustomerList,
    activeTab === "customers" ? { token } : "skip"
  );
  const [customerSearch, setCustomerSearch] = useState("");

  // Leads (store requests + back-in-stock signups)
  const leadsList = useTrackedQuery(api.leads.getLeads, { token });
  const unresolvedLeadsCount = leadsList?.filter((l) => l.status !== "resolved").length || 0;

  const filteredCustomers = customerList?.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  ) || [];

  const adminSidebarGroups = [
    {
      id: "overview",
      label: "Overview",
      items: [
        { key: "overview", label: "Dashboard", icon: LayoutDashboard, isActive: activeTab === "overview", onClick: () => setActiveTab("overview") },
      ],
    },
    {
      id: "salesOrders",
      label: "Sales & Orders",
      items: [
        { key: "onlineOrders", label: "Online Orders", icon: Package, badge: unseenOrdersCount > 0 ? unseenOrdersCount : undefined, isActive: activeTab === "onlineOrders", onClick: () => setActiveTab("onlineOrders") },
        { key: "metrics", label: "Sales Metrics", icon: BarChart3, isActive: activeTab === "metrics", onClick: () => setActiveTab("metrics") },
        { key: "history", label: "Order History", icon: History, isActive: activeTab === "history", onClick: () => setActiveTab("history") },
        { key: "returns", label: "Returns", icon: RotateCcw, badge: unseenReturnsCount > 0 ? unseenReturnsCount : undefined, isActive: activeTab === "returns", onClick: () => setActiveTab("returns") },
      ],
    },
    {
      id: "catalogue",
      label: "Catalogue",
      items: [
        { key: "stock", label: "Stock Manager", icon: Boxes, isActive: activeTab === "stock", onClick: () => setActiveTab("stock") },
        { key: "salesReport", label: "Sales Report", icon: ClipboardList, isActive: activeTab === "salesReport", onClick: () => setActiveTab("salesReport") },
        { key: "discounts", label: "Discounts & Promos", icon: Tag, isActive: activeTab === "discounts", onClick: () => setActiveTab("discounts") },
      ],
    },
    {
      id: "peoplePlanning",
      label: "People & Planning",
      items: [
        { key: "customers", label: "Customers", icon: Users, isActive: activeTab === "customers", onClick: () => setActiveTab("customers") },
        { key: "leads", label: "Leads", icon: Inbox, badge: unresolvedLeadsCount, isActive: activeTab === "leads", onClick: () => setActiveTab("leads") },
        { key: "calendar", label: "Calendar", icon: CalendarIcon, badge: dueActivities?.length || 0, isActive: activeTab === "calendar", onClick: () => setActiveTab("calendar") },
        { key: "staff", label: "Staff Roster", icon: UserCheck, isActive: activeTab === "staff", onClick: () => setActiveTab("staff") },
        { key: "cashup", label: "Balance Books", icon: Wallet, isActive: activeTab === "cashup", onClick: () => setActiveTab("cashup") },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [
        { key: "settings", label: "Settings", icon: Settings, isActive: activeTab === "settings", onClick: () => setActiveTab("settings") },
        { key: "dbio", label: "DB I/O", icon: Database, isActive: activeTab === "dbio", onClick: () => setActiveTab("dbio") },
      ],
    },
  ];

  return (
    <div className="staff-portal-body">
      <OfflineBanner isOnline={isOnline} />
      <div className="admin-layout">
        <Sidebar
          storageKey="dennan_sidebar_collapsed_admin"
          user={user}
          onLogout={logout}
          groups={adminSidebarGroups}
        />

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

                  <div className="section-header" style={{ marginTop: "var(--space-4)" }}>
                    <h2 className="section-title">Pending Orders</h2>
                  </div>
                  {pendingOrders === undefined ? (
                    <div className="empty-state">
                      <div className="empty-title">Loading pending orders...</div>
                    </div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-title">No pending orders. All caught up!</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Grand Total</th>
                            <th>Assigned Staff</th>
                            <th>Created At</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOrders.map((order) => (
                            <tr key={order._id}>
                              <td>
                                <strong>{order.customerName}</strong>
                                {order.customerPhone && <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{order.customerPhone}</div>}
                              </td>
                              <td>
                                <span className={`status-badge status-badge--${order.status}`}>
                                  <span className="status-dot" />
                                  {order.status.toUpperCase()}
                                </span>
                              </td>
                              <td>UGX {order.grandTotal.toLocaleString()}</td>
                              <td>{order.claimantName || "Unassigned"}</td>
                              <td>{new Date(order.createdAt).toLocaleString()}</td>
                              <td>
                                <button
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => setViewingOrder(order)}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="section-header" style={{ marginTop: "var(--space-4)" }}>
                    <h2 className="section-title">Pending Returns</h2>
                  </div>
                  {pendingReturns === undefined ? (
                    <div className="empty-state">
                      <div className="empty-title">Loading pending returns...</div>
                    </div>
                  ) : pendingReturns.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-title">No pending returns.</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Submitted By</th>
                            <th>Returned Total</th>
                            <th>Exchange Total</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingReturns.map((ret) => (
                            <tr key={ret.returnId}>
                              <td><strong>{ret.customerName}</strong></td>
                              <td>{ret.staffName}</td>
                              <td>UGX {(ret.returnedTotal || 0).toLocaleString()}</td>
                              <td>UGX {(ret.exchangeTotal || 0).toLocaleString()}</td>
                              <td>{new Date(ret.createdAt).toLocaleString()}</td>
                              <td>
                                <button
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => setActiveTab("returns")}
                                >
                                  Review Return
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="section-header" style={{ marginTop: "var(--space-4)" }}>
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
                    const totalOrders = member.totalOrders || 0;
                    const totalSales = member.totalSales || 0;
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
                <h1 className="admin-page-title">Customers</h1>
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

          {/* TAB: LEADS (store requests + back-in-stock signups) */}
          {activeTab === "leads" && (
            <LeadsPanel token={token} />
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
            <ReturnsPanel token={token} showToast={showToast} />
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === "settings" && (
            <>
              <ProductDisplaySettingsPanel token={token} />
              <ErrorLogSettingsPanel token={token} />
            </>
          )}

          {/* TAB 10: DB I/O BASELINE */}
          {activeTab === "dbio" && (
            <DbIOPanel token={token} />
          )}

          {/* TAB 11: BALANCE BOOKS (end-of-day cash-up) */}
          {activeTab === "cashup" && (
            <CashUpPanel token={token} />
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

      {/* Order Detail Modal (opened from Order History or a Calendar reminder linked to an order) */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onOpenReturn={(order) => navigate(`/admin/orders/${order._id}/exchange`)}
          onClaim={(id) => { handleClaimOrder(id); setViewingOrder(null); }}
          onDispatch={() => { setHandoverOrder(viewingOrder); setViewingOrder(null); }}
          onComplete={(id) => { handleCompleteOrder(id); setViewingOrder(null); }}
          onMarkFailed={(order) => { setFailureOrder(order); setViewingOrder(null); }}
          token={token}
        />
      )}

      {/* Rider Handover Modal */}
      {handoverOrder && (
        <HandoverModal
          orderId={handoverOrder._id}
          customerName={handoverOrder.customerName}
          customerPhone={handoverOrder.customerPhone}
          deliveryAddress={handoverOrder.deliveryAddress}
          onClose={() => setHandoverOrder(null)}
          onSubmit={handleHandoverSubmit}
        />
      )}

      {/* Delivery failure / returns-to-approval modal */}
      {failureOrder && (
        <DeliveryFailureModal
          order={failureOrder}
          onClose={() => setFailureOrder(null)}
          onSubmit={handleReportDeliveryFailure}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
