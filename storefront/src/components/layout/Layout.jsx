import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLeadCapture } from '../../context/LeadCaptureContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { hasLeadInfo } = useLeadCapture();
  const hideNavbar = location.pathname === '/launch' && !hasLeadInfo;

  return (
    <div className="app-layout">
      {!hideNavbar && <Navbar />}
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

