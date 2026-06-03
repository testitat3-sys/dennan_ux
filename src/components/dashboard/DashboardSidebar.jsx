import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useCart } from '../../context/CartContext';
import { LayoutDashboard, User, Gift, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import '../../pages/Dashboard.css';

const DashboardSidebar = () => {
  const { logout } = useUser();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const { isCartOpen } = useCart();

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
    <nav className={`dashboard-nav ${isCartOpen ? 'dashboard-nav--hidden' : ''}`} aria-label="Dashboard navigation">
      <ul className="dashboard-nav__list">
        <li>
          <span 
            onClick={() => navigate('/dashboard')} 
            className={`dashboard-nav__link ${isActive('/dashboard') ? 'dashboard-nav__link--active' : ''}`}
          >
            <LayoutDashboard className="dashboard-nav__link-icon" />
            <span className="dashboard-nav__link-text">Overview</span>
          </span>
        </li>
        <li>
          <span 
            onClick={() => navigate('/profile')} 
            className={`dashboard-nav__link ${isActive('/profile') ? 'dashboard-nav__link--active' : ''}`}
          >
            <User className="dashboard-nav__link-icon" />
            <span className="dashboard-nav__link-text">Profile</span>
          </span>
        </li>
        <li>
          <span 
            onClick={() => navigate('/registry')} 
            className={`dashboard-nav__link ${isActive('/registry') ? 'dashboard-nav__link--active' : ''}`}
          >
            <Gift className="dashboard-nav__link-icon" />
            <span className="dashboard-nav__link-text">Registry</span>
          </span>
        </li>
        <li className="dashboard-nav__logout-item">
          <span 
            onClick={handleSignOut} 
            className="dashboard-nav__link dashboard-nav__link--logout"
          >
            <LogOut className="dashboard-nav__link-icon" />
            <span className="dashboard-nav__link-text">Sign Out</span>
          </span>
        </li>
      </ul>
    </nav>
  );
};

export default DashboardSidebar;
