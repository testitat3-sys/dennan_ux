import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "../hooks/useStaffAuth";
import OrderDetailModal from "../components/OrderDetailModal";
import SalesMetricsPanel from "../components/SalesMetricsPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import sosLogo from "../assets/SOS.png";
import profileImg from "../assets/about-dennan.png";
import { BarChart3, History, LogOut } from "lucide-react";

export default function AccountingDashboard() {
  const { user, token, logout } = useStaffAuth();
  const [activeTab, setActiveTab] = useState(
    () => new URLSearchParams(window.location.search).get("tab") || "metrics"
  );

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

  return (
    <div className="staff-portal-body">
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src={sosLogo} alt="Dennan" className="sidebar-logo" />
            <span className="sidebar-brand-sub">Accounting Hub</span>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Sales & Orders</span>
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

        <main className="admin-main">
          {activeTab === "metrics" && (
            <SalesMetricsPanel token={token} onOpenOrder={setPendingOrderId} />
          )}

          {activeTab === "history" && (
            <OrderHistoryPanel token={token} onOpenOrder={setViewingOrder} />
          )}
        </main>
      </div>

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
