import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AfterSignIn from './pages/AfterSignIn';

// Redirect handler for storefront paths accessed on admin app
function StorefrontRedirect() {
  const location = useLocation();

  useEffect(() => {
    const storefrontUrl = "http://localhost:5173" + location.pathname + location.search + location.hash;
    console.log(`[Admin App] Redirecting storefront route to: ${storefrontUrl}`);
    window.location.replace(storefrontUrl);
  }, [location]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '1.125rem',
      color: '#6b7280'
    }}>
      Redirecting to storefront…
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin auth callback handler */}
        <Route path="/after-signin" element={<AfterSignIn />} />

        {/* Dashboard placeholder */}
        <Route path="/" element={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '1.5rem',
            fontWeight: '500',
            color: '#374151'
          }}>
            Admin portal coming soon
          </div>
        } />

        {/* Catch-all storefront route redirector */}
        <Route path="*" element={<StorefrontRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
