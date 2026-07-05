import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useUser } from '../../context/UserContext';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute Wrapper Component.
 * 
 * Secures any route that requires a logged-in user. If the user is unauthenticated:
 * 1. Automatically triggers the premium Onboarding/Login Modal via `setShowOnboarding(true)`.
 * 2. Redirects the user to the Home page ('/') seamlessly.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { setShowOnboarding } = useUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("[ProtectedRoute] Unauthenticated attempt detected. Triggering Onboarding/Login modal...");
      setShowOnboarding(true);
    }
  }, [isLoading, isAuthenticated, setShowOnboarding]);

  // Loading indicator matching the platform's high-fidelity branding
  if (isLoading) {
    return (
      <div 
        className="protected-route-loader"
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '80vh',
          gap: 'var(--space-4, 16px)'
        }}
      >
        <Loader2 
          className="animate-spin" 
          size={40} 
          style={{ 
            color: 'var(--color-brand-primary, var(--primary, #d35097))',
            animation: 'spin 1s linear infinite'
          }} 
        />
        <p style={{ color: 'var(--text-muted, #71717a)', fontSize: '0.875rem', fontFamily: 'var(--font-sans, sans-serif)' }}>
          Verifying your session…
        </p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // Redirect to home if unauthenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render private children if authenticated
  return children;
}
