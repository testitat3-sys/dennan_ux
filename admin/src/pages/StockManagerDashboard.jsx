import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../hooks/useStaffAuth";
import StockManagerPanel from "../components/StockManagerPanel";
import DiscountsPanel from "../components/DiscountsPanel";
import ProductSalesPanel from "../components/ProductSalesPanel";
import sosLogo from "../assets/SOS.png";
import profileImg from "../assets/about-dennan.png";
import { Boxes, Tag, ClipboardList, LogOut } from "lucide-react";

export default function StockManagerDashboard() {
  const { user, token, logout } = useStaffAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    () => new URLSearchParams(window.location.search).get("tab") || "stock"
  );

  return (
    <div className="staff-portal-body">
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src={sosLogo} alt="Dennan" className="sidebar-logo" />
            <span className="sidebar-brand-sub">Stock Manager Hub</span>
          </div>

          <nav className="sidebar-nav">
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
          {activeTab === "stock" && (
            <StockManagerPanel token={token} navigate={navigate} user={user} />
          )}

          {activeTab === "salesReport" && (
            <ProductSalesPanel token={token} user={user} />
          )}

          {activeTab === "discounts" && (
            <DiscountsPanel token={token} />
          )}
        </main>
      </div>
    </div>
  );
}
