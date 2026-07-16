import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StaffAuthProvider, useStaffAuth } from './hooks/useStaffAuth';
import { ErrorLogProvider } from './hooks/useErrorLog';
import AppErrorBoundary from './components/AppErrorBoundary';
import ErrorLogFab from './components/ErrorLogFab';
import StaffLogin from './pages/StaffLogin';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AccountingDashboard from './pages/AccountingDashboard';
import StockManagerDashboard from './pages/StockManagerDashboard';
import AdminProductEdit from './pages/AdminProductEdit';
import AdminProductCreate from './pages/AdminProductCreate';
import OrderExchangePage from './pages/OrderExchangePage';
import sosLogo from './assets/SOS.png';

function MainRouter() {
  const { user, isLoading } = useStaffAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#FAF9F8',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <img 
            src={sosLogo} 
            alt="SOS Logo" 
            style={{ 
              width: '140px', 
              height: 'auto',
              display: 'block'
            }} 
          />
          <div style={{
            width: '140px',
            height: '4px',
            background: 'rgba(33, 37, 39, 0.15)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              height: '100%',
              backgroundColor: '#212527',
              borderRadius: '2px',
              animation: 'progress-loading 1.5s infinite ease-in-out'
            }} />
          </div>
        </div>
        <style>{`
          @keyframes progress-loading {
            0% {
              left: -40%;
              width: 40%;
            }
            50% {
              left: 20%;
              width: 60%;
            }
            100% {
              left: 100%;
              width: 40%;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <StaffLogin />} />

      {/* Protected Dashboard Gate */}
      <Route path="/" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.accountRole === "admin" ? (
          <AdminDashboard />
        ) : user.accountRole === "staff" ? (
          <StaffDashboard />
        ) : user.accountRole === "accounting" ? (
          <AccountingDashboard />
        ) : user.accountRole === "stockManager" ? (
          <StockManagerDashboard />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: '#0b0f19',
            color: '#ef4444',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <h2>Access Denied</h2>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>You do not have administrative or staff privileges.</p>
          </div>
        )
      } />

      {/* Protected Admin Product Create */}
      <Route path="/admin/products/new" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.accountRole === "admin" || user.accountRole === "stockManager" ? (
          <AdminProductCreate />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      {/* Protected Admin Product Edit */}
      <Route path="/admin/products/:productId" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.accountRole === "admin" || user.accountRole === "stockManager" ? (
          <AdminProductEdit />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      {/* Walk-in exchange from an order's "return" button */}
      <Route path="/admin/orders/:orderId/exchange" element={
        !user ? (
          <Navigate to="/login" replace />
        ) : user.accountRole === "staff" || user.accountRole === "admin" ? (
          <OrderExchangePage />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <StaffAuthProvider>
        <ErrorLogProvider>
          <AppErrorBoundary name="App">
            <MainRouter />
          </AppErrorBoundary>
          <ErrorLogFab />
        </ErrorLogProvider>
      </StaffAuthProvider>
    </Router>
  );
}

export default App;

