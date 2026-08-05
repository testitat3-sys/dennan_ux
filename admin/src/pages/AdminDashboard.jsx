import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { useStaffAuth } from "../hooks/useStaffAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import OfflineBanner from "../components/OfflineBanner";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "../components/DataTableControls";

import Sidebar from "../components/Sidebar";
import CustomerActivityModal from "../components/CustomerActivityModal";
import OrderDetailModal from "../components/OrderDetailModal";
import ReceiptModal from "../components/ReceiptModal";
import HandoverModal from "../components/HandoverModal";
import DeliveryFailureModal from "../components/DeliveryFailureModal";
import RemindersWidget from "../components/RemindersWidget";
import CalendarPanel from "../components/CalendarPanel";
import SalesMetricsPanel from "../components/SalesMetricsPanel";
import ReturnsPanel from "../components/ReturnsPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import StockManagerPanel from "../components/StockManagerPanel";
import StockApprovalsPanel from "../components/StockApprovalsPanel";
import StockHistoryPanel from "../components/StockHistoryPanel";
import DiscountsPanel from "../components/DiscountsPanel";
import ProductSalesPanel from "../components/ProductSalesPanel";
import OnlineOrdersPanel from "../components/OnlineOrdersPanel";
import ErrorLogSettingsPanel from "../components/ErrorLogSettingsPanel";
import ProductDisplaySettingsPanel from "../components/ProductDisplaySettingsPanel";
import ThemeSettingsPanel from "../components/ThemeSettingsPanel";
import PerfSettingsPanel from "../components/PerfSettingsPanel";
import DbIOPanel from "../components/DbIOPanel";
import LeadsPanel from "../components/LeadsPanel";
import BusinessHealthPanel from "../components/BusinessHealthPanel";
import CashUpPanel from "../components/CashUpPanel";
import BusinessExpensesPanel from "../components/BusinessExpensesPanel";
import { getTodayStr } from "../utils/reminderHelpers";
import {
  getChurnBand,
  CHURN_BAND_LABELS,
  LOYALTY_TIER_LABELS,
  LOYALTY_TIER_OPTIONS,
  CHURN_BAND_OPTIONS,
  CHURN_BAND_BADGE_CLASS,
  LOYALTY_TIER_BADGE_CLASS,
} from "../utils/customerScoreHelpers";
import {
  LayoutDashboard,
  Boxes,
  Tag,
  Users,
  UserCheck,
  BarChart3,
  Calendar as CalendarIcon,
  RotateCcw,
  History,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  ChevronRight,
  ClipboardList,
  Package,
  Settings,
  Inbox,
  Database,
  Wallet,
  ClipboardCheck,
  Receipt,
  Activity
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

  const {
    processedData: filteredPendingOrders,
    sortConfig: pendingOrdersSort,
    requestSort: requestPendingOrdersSort,
  } = useTableSortAndFilter(pendingOrders || [], {
    searchFields: ["customerName", "customerPhone", "status", "claimantName"],
    initialSort: { key: "createdAt", direction: "desc" },
  });

  const {
    processedData: filteredPendingReturns,
    sortConfig: pendingReturnsSort,
    requestSort: requestPendingReturnsSort,
  } = useTableSortAndFilter(pendingReturns || [], {
    searchFields: ["customerName", "staffName"],
    initialSort: { key: "createdAt", direction: "desc" },
  });


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

  // Stock decrease approvals (Stock Managers submit batches for admin review)
  const pendingStockRequests = useTrackedQuery(api.stockRequests.getPendingStockRequests, { token });
  const [lastSeenStockRequests, setLastSeenStockRequests] = useState(() => parseInt(localStorage.getItem("dennan_admin_last_seen_stock_requests") || "0"));
  useEffect(() => {
    if (activeTab === "stockApprovals" && pendingStockRequests && pendingStockRequests.length > 0) {
      const maxTime = Math.max(...pendingStockRequests.map(r => r.submittedAt));
      localStorage.setItem("dennan_admin_last_seen_stock_requests", maxTime.toString());
      setLastSeenStockRequests(maxTime);
    }
  }, [activeTab, pendingStockRequests]);
  const unseenStockRequestsCount = pendingStockRequests
    ? pendingStockRequests.filter(r => r.submittedAt > lastSeenStockRequests).length
    : 0;

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
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  const buildReceiptFromOrder = (order) => ({
    orderId: order._id,
    receiptNumber: order.receiptNumber,
    date: new Date(order.createdAt),
    cashier: order.claimantName || user?.name || "Admin",
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items?.map(i => ({
      name: i.productName,
      quantity: i.quantity,
      price: i.unitPrice,
    })) || [],
    payments: order.payments || [],
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    deliveryFee: order.deliveryFee || 0,
    couponApplied: order.couponApplied,
    total: order.grandTotal,
  });
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
  // churnRisk is a raw 0-100 number; bucket it into bands so it can be a
  // filter-select option the same way loyaltyTier already is.
  const customersWithDerived = useMemo(() => {
    return (customerList || []).map((c) => ({
      ...c,
      churnBand: getChurnBand(c.churnRisk),
    }));
  }, [customerList]);

  const {
    processedData: filteredCustomers,
    sortConfig: customersSort,
    requestSort: requestCustomersSort,
    searchQuery: customerSearch,
    setSearchQuery: setCustomerSearch,
    filterValues: customerFilterValues,
    setFilterValue: setCustomerFilterValue,
    resetFilters: resetCustomerFilters,
    isFiltered: isCustomersFiltered,
    totalCount: customersTotalCount,
    filteredCount: customersFilteredCount,
  } = useTableSortAndFilter(customersWithDerived, {
    searchFields: ["name", "email", "phone", "customerNotes"],
    initialSort: { key: "name", direction: "asc" },
  });

  // Leads (store requests + back-in-stock signups)
  const leadsList = useTrackedQuery(api.leads.getLeads, { token });
  const unresolvedLeadsCount = leadsList?.filter((l) => l.status !== "resolved").length || 0;

  const adminSidebarGroups = [
    {
      id: "overview",
      label: "Overview",
      items: [
        { key: "overview", label: "Dashboard", icon: LayoutDashboard, isActive: activeTab === "overview", onClick: () => setActiveTab("overview") },
        { key: "businessHealth", label: "Business Health", icon: Activity, isActive: activeTab === "businessHealth", onClick: () => setActiveTab("businessHealth") },
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
        { key: "stockApprovals", label: "Stock Approvals", icon: ClipboardCheck, badge: unseenStockRequestsCount > 0 ? unseenStockRequestsCount : undefined, isActive: activeTab === "stockApprovals", onClick: () => setActiveTab("stockApprovals") },
        { key: "stockHistory", label: "Stock History", icon: History, isActive: activeTab === "stockHistory", onClick: () => setActiveTab("stockHistory") },
        { key: "salesReport", label: "Stock Report", icon: ClipboardList, isActive: activeTab === "salesReport", onClick: () => setActiveTab("salesReport") },
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
        { key: "expenses", label: "Business Expenses", icon: Receipt, isActive: activeTab === "expenses", onClick: () => setActiveTab("expenses") },
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
                            <SortableHeader sortKey="customerName" sortConfig={pendingOrdersSort} onRequestSort={requestPendingOrdersSort}>
                              Customer
                            </SortableHeader>
                            <SortableHeader sortKey="status" sortConfig={pendingOrdersSort} onRequestSort={requestPendingOrdersSort}>
                              Status
                            </SortableHeader>
                            <SortableHeader sortKey="grandTotal" sortConfig={pendingOrdersSort} onRequestSort={requestPendingOrdersSort}>
                              Grand Total
                            </SortableHeader>
                            <SortableHeader sortKey="claimantName" sortConfig={pendingOrdersSort} onRequestSort={requestPendingOrdersSort}>
                              Assigned Staff
                            </SortableHeader>
                            <SortableHeader sortKey="createdAt" sortConfig={pendingOrdersSort} onRequestSort={requestPendingOrdersSort}>
                              Created At
                            </SortableHeader>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPendingOrders.map((order) => (

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
                            <SortableHeader sortKey="customerName" sortConfig={pendingReturnsSort} onRequestSort={requestPendingReturnsSort}>
                              Customer
                            </SortableHeader>
                            <SortableHeader sortKey="staffName" sortConfig={pendingReturnsSort} onRequestSort={requestPendingReturnsSort}>
                              Submitted By
                            </SortableHeader>
                            <SortableHeader sortKey="returnedTotal" sortConfig={pendingReturnsSort} onRequestSort={requestPendingReturnsSort}>
                              Returned Total
                            </SortableHeader>
                            <SortableHeader sortKey="exchangeTotal" sortConfig={pendingReturnsSort} onRequestSort={requestPendingReturnsSort}>
                              Exchange Total
                            </SortableHeader>
                            <SortableHeader sortKey="createdAt" sortConfig={pendingReturnsSort} onRequestSort={requestPendingReturnsSort}>
                              Date
                            </SortableHeader>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPendingReturns.map((ret) => (
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
            <StockManagerPanel token={token} navigate={navigate} user={user} showToast={showToast} />
          )}

          {/* TAB: STOCK APPROVALS (admin review of stock manager reduction requests) */}
          {activeTab === "stockApprovals" && (
            <StockApprovalsPanel token={token} showToast={showToast} />
          )}

          {/* TAB: STOCK HISTORY (master log of all product stock changes) */}
          {activeTab === "stockHistory" && (
            <StockHistoryPanel token={token} />
          )}

          {/* TAB: STOCK REPORT (products sold in a date range) */}
          {activeTab === "salesReport" && (
            <ProductSalesPanel token={token} user={user} />
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
              </div>

              {customerList === undefined ? (
                <div className="empty-state">
                  <div className="empty-title">Loading customer data...</div>
                </div>
              ) : (
                <>
                  <TableFilterBar
                    searchQuery={customerSearch}
                    onSearchChange={setCustomerSearch}
                    searchPlaceholder="Search by name, email, phone..."
                    filterValues={customerFilterValues}
                    onFilterChange={(key, val) => setCustomerFilterValue(key, val === "all" ? "" : val)}
                    filters={[
                      { key: "loyaltyTier", width: "140px", options: LOYALTY_TIER_OPTIONS },
                      { key: "churnBand", width: "150px", options: CHURN_BAND_OPTIONS },
                    ]}
                    isFiltered={isCustomersFiltered}
                    onResetFilters={resetCustomerFilters}
                    totalCount={customersTotalCount}
                    filteredCount={customersFilteredCount}
                  />
                  <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <SortableHeader sortKey="name" sortConfig={customersSort} onRequestSort={requestCustomersSort}>
                          Customer Name
                        </SortableHeader>
                        <SortableHeader sortKey="email" sortConfig={customersSort} onRequestSort={requestCustomersSort}>
                          Email
                        </SortableHeader>
                        <SortableHeader sortKey="phone" sortConfig={customersSort} onRequestSort={requestCustomersSort}>
                          Phone
                        </SortableHeader>
                        <SortableHeader sortKey="ordersCount" sortConfig={customersSort} onRequestSort={requestCustomersSort}>
                          Total Orders
                        </SortableHeader>
                        <SortableHeader sortKey="loyaltyTier" sortConfig={customersSort} onRequestSort={requestCustomersSort}>
                          Tier
                        </SortableHeader>
                        <SortableHeader sortKey="churnRisk" sortConfig={customersSort} onRequestSort={requestCustomersSort}>
                          Churn Risk
                        </SortableHeader>
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
                          <td>
                            <span className={`active-badge ${LOYALTY_TIER_BADGE_CLASS[c.loyaltyTier] || "active-badge--off"}`}>
                              {LOYALTY_TIER_LABELS[c.loyaltyTier] || "Bronze"}
                            </span>
                          </td>
                          <td>
                            <span className={`active-badge ${CHURN_BAND_BADGE_CLASS[c.churnBand]}`}>
                              {CHURN_BAND_LABELS[c.churnBand]}
                              {c.churnRisk !== undefined && c.churnRisk !== null ? ` (${c.churnRisk})` : ""}
                            </span>
                          </td>
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
                </>
              )}
            </div>
          )}

          {/* TAB: LEADS (store requests + back-in-stock signups) */}
          {activeTab === "leads" && (
            <LeadsPanel token={token} />
          )}

          {/* TAB: ORDER HISTORY (all orders, admin-wide) */}
          {activeTab === "history" && (
            <OrderHistoryPanel token={token} onOpenOrder={setViewingOrder} user={user} />
          )}

          {/* TAB 6: CALENDAR / REMINDERS */}
          {activeTab === "calendar" && (
            <CalendarPanel token={token} onOpenOrder={setPendingOrderId} />
          )}

          {/* TAB 7: SALES METRICS */}
          {activeTab === "metrics" && (
            <SalesMetricsPanel token={token} onOpenOrder={setPendingOrderId} user={user} />
          )}

          {/* TAB 8: RETURNS APPROVAL */}
          {activeTab === "returns" && (
            <ReturnsPanel token={token} showToast={showToast} />
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <ThemeSettingsPanel />
              <ProductDisplaySettingsPanel token={token} />
              <PerfSettingsPanel token={token} />
              <ErrorLogSettingsPanel token={token} />
            </div>
          )}

          {/* TAB 10: DB I/O BASELINE */}
          {activeTab === "dbio" && (
            <DbIOPanel token={token} />
          )}

          {/* TAB 11: BALANCE BOOKS (end-of-day cash-up) */}
          {activeTab === "cashup" && (
            <CashUpPanel token={token} />
          )}

          {/* TAB 12: BUSINESS EXPENSES */}
          {activeTab === "expenses" && (
            <BusinessExpensesPanel token={token} />
          )}

          {/* TAB 13: BUSINESS HEALTH & PROFITABILITY (Admin Only) */}
          {activeTab === "businessHealth" && (
            <BusinessHealthPanel token={token} user={user} />
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
          onPrintReceipt={(order) => { setLastReceipt(buildReceiptFromOrder(order)); setShowReceipt(true); }}
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

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <ReceiptModal
          receipt={lastReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
