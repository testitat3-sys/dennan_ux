import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const AfterSignIn = () => {
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);

  useEffect(() => {
    if (user === undefined) return; // Still loading

    if (user === null) {
      // Something went wrong, not authenticated
      navigate('/auth');
      return;
    }

    // Determine where to go
    if (!user.onboardingComplete) {
      navigate('/onboarding');
    } else if (user.isAdmin) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--color-brand-primary, #6366f1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ color: '#666', fontWeight: 500 }}>Finalizing your sign in...</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AfterSignIn;
