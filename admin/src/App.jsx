import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StaffAuthProvider, useStaffAuth } from './hooks/useStaffAuth';
import StaffLogin from './pages/StaffLogin';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';

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
        background: '#0b0f19',
        color: '#9ca3af'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.05)',
          borderTopColor: '#d35097',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <span>Authenticating staff portal...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
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

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <StaffAuthProvider>
        <MainRouter />
      </StaffAuthProvider>
    </Router>
  );
}

export default App;

