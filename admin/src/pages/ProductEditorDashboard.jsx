import React from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../hooks/useStaffAuth";
import ProductEditorPanel from "../components/ProductEditorPanel";
import sosLogo from "../assets/SOS.png";
import sosLogoDark from "../assets/SOS-dark.png";
import profileImg from "../assets/about-dennan.png";
import { Package, LogOut } from "lucide-react";

export default function ProductEditorDashboard() {
  const { user, token, logout } = useStaffAuth();
  const navigate = useNavigate();

  return (
    <div className="staff-portal-body">
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src={sosLogo} alt="Dennan" className="sidebar-logo logo-light" />
            <img src={sosLogoDark} alt="Dennan" className="sidebar-logo logo-dark" />
            <span className="sidebar-brand-sub">Product Editor Hub</span>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-nav-group">
              <span className="sidebar-nav-group-label">Management</span>
              <button
                className="sidebar-nav-item is-active"
                type="button"
              >
                <Package size={18} />
                <span>Products</span>
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
                <span className="sidebar-user-role">PRODUCT EDITOR</span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout} type="button">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <ProductEditorPanel token={token} navigate={navigate} user={user} />
        </main>
      </div>
    </div>
  );
}
