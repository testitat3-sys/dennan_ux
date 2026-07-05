import React, { useEffect, useRef } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";

/**
 * Redirection callback handler for the Admin App (port 5174).
 * 
 * Ensures the logged-in user is actually an administrator.
 * If yes, routes them to the Admin dashboard.
 * If no, redirects them back to the Storefront (port 5173).
 */
export default function AfterSignIn() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const navigate = useNavigate();
  const { search, hash, pathname } = useLocation();

  const redirecting = useRef(false);

  useEffect(() => {
    console.log(`[Admin AfterSignIn] Mounted - isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
    const hasAuthParams = search.includes("code=") || search.includes("token=") || hash.includes("access_token=");

    if (!isLoading && !isAuthenticated && !hasAuthParams) {
      console.log(`[Admin AfterSignIn] No auth found, redirecting normal users to storefront`);
      window.location.replace("http://localhost:5173/");
    }
  }, [isLoading, isAuthenticated, search, navigate]);

  useEffect(() => {
    if (user === null) {
      console.log(`[Admin AfterSignIn] User record is null (waiting for sync)`);
      return;
    }
    if (!user) return; // Loading
    if (redirecting.current) return;

    redirecting.current = true;

    if (user.isAdmin) {
      console.log(`[Admin AfterSignIn] Authorized admin - navigating to admin dashboard`);
      navigate("/", { replace: true });
    } else {
      console.log(`[Admin AfterSignIn] Unauthorized non-admin - redirecting to storefront`);
      window.location.replace("http://localhost:5173/");
    }
  }, [user, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#f9fafb'
    }}>
      <div style={{
        background: '#ffffff',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem 0' }}>
          Verifying credentials...
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Accessing the administrative portal. Please hold on.
        </p>
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '3px solid #e5e7eb', borderTopColor: '#d35097',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}
        />
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
