import React, { useState, useEffect } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import './AuthPage.css';

const AuthPage = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [linkCaptured, setLinkCaptured] = useState(null);

  // Query for captured link (Always active in dev/test)
  const capturedLinkData = useQuery(api.auth_test.getLink,
    isSending && email ? { email } : "skip"
  );

  useEffect(() => {
    if (capturedLinkData && isSending) {
      setLinkCaptured(capturedLinkData.url);
      setIsSending(false);
    }
  }, [capturedLinkData, isSending]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    setLinkCaptured(null);

    const provider = "test-link";
    
    // Log the email here to be 100% sure it's not null on the client
    console.log("[AUTH] Client-side email state:", email);
    console.log("[AUTH] Sending to signIn:", { provider, email });

    const formData = new FormData();
    formData.append("email", email);

    try {
      await signIn(provider, formData);
    } catch (error) {
      console.error("[AUTH] Sign in failed:", error);
      setIsSending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome to Dennan</h1>
            <p className="auth-subtitle">Sign in or create an account to get started</p>
          </div>

          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isSending}>
              {isSending ? "Generating link..." : "Send Magic Link"}
            </button>
          </form>

          {linkCaptured && (
            <div className="magic-link-alert">
              <p><strong>Magic Link Captured!</strong></p>
              <a href={linkCaptured} className="btn-link">Click here to sign in</a>
            </div>
          )}

          <div className="auth-status-check">
            <p>Auth Status: {isLoading ? "Checking..." : isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}</p>
            {isAuthenticated && (
              <p className="success-msg">Your app is working perfectly! You can ignore the console error.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
