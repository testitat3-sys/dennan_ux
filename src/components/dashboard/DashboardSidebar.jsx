import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { LayoutDashboard, User, Gift, LogOut } from 'lucide-react';
import '../../pages/Dashboard.css';

const DashboardSidebar = () => {
  const { logout } = useUser();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      console.log("[DashboardSidebar] Initiating sign out...");
      logout();
      await signOut();
    } catch (error) {
      console.error("Failed to sign out from Convex:", error);
    } finally {
      navigate('/');
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="dashboard-nav" aria-label="Dashboard navigation">
      <ul className="dashboard-nav__list">
        <li>
          <span 
            onClick={() => navigate('/dashboard')} 
            className={`dashboard-nav__link ${isActive('/dashboard') ? 'dashboard-nav__link--active' : ''}`}
          >
            <LayoutDashboard className="dashboard-nav__link-icon" />
            Overview
          </span>
        </li>
        <li>
          <span 
            onClick={() => navigate('/profile')} 
            className={`dashboard-nav__link ${isActive('/profile') ? 'dashboard-nav__link--active' : ''}`}
          >
            <User className="dashboard-nav__link-icon" />
            Profile
          </span>
        </li>
        <li>
          <span 
            onClick={() => navigate('/registry')} 
            className={`dashboard-nav__link ${isActive('/registry') ? 'dashboard-nav__link--active' : ''}`}
          >
            <Gift className="dashboard-nav__link-icon" />
            Registry
          </span>
        </li>
      </ul>
      
      <div className="dashboard-nav__logout">
        <button onClick={handleSignOut} className="dashboard-nav__logout-btn" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
          <LogOut className="dashboard-nav__link-icon" />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default DashboardSidebar;
