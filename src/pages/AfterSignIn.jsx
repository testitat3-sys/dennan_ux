import React, { useEffect, useRef } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useUser } from "../context/UserContext";

// ─── localStorage helpers (mirrors OnboardingModal) ──────────────────────────
const PROFILE_KEY = 'dennan_onboarding_profile';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed._savedAt || Date.now() - parsed._savedAt > MAX_AGE_MS) {
      localStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

function clearLocalProfile() {
  localStorage.removeItem(PROFILE_KEY);
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page that handles redirection after a successful sign-in.
 * 
 * For users who haven't completed onboarding yet, it reconciles the
 * pre-auth profile collected in localStorage with the Convex user record,
 * then navigates to /dashboard.
 */
export default function AfterSignIn() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const ensureFields = useMutation(api.users.ensureUserFields);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const mergeGuestCart = useMutation(api.cart.mergeGuestCart);
  const { setShowOnboarding, login } = useUser();
  const navigate = useNavigate();
  const { search, hash, pathname } = useLocation();

  // Guard against the reconciliation running more than once per mount
  const reconciling = useRef(false);

  // ── Guard 1: redirect to /auth if no auth params and not authenticated ──────
  useEffect(() => {
    console.log(`[AfterSignIn.jsx] Mounted - isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
    const hasAuthParams = search.includes("code=") || search.includes("token=") || hash.includes("access_token=");
    console.log(`[AfterSignIn.jsx] Auth check - hasAuthParams: ${hasAuthParams}`);

    if (!isLoading && !isAuthenticated && !hasAuthParams) {
      if (pathname !== "/auth") {
        console.log(`[AfterSignIn.jsx] No auth found, redirecting to /auth`);
        navigate("/auth", { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, search, hash, navigate, pathname]);

  // ── Guard 2: once user record is loaded, reconcile and navigate ─────────────
  useEffect(() => {
    if (user === null) {
      console.log(`[AfterSignIn.jsx] User record is null (waiting for sync)`);
      return;
    }
    if (!user) return; // still undefined (loading)
    if (reconciling.current) return; // already running

    console.log(`[AfterSignIn.jsx] User loaded: ${user.email}, onboarded: ${user.isOnboarded}, admin: ${user.isAdmin}`);

    // Ensure default fields exist (idempotent)
    if (user.isAdmin === undefined || user.isOnboarded === undefined) {
      console.log(`[AfterSignIn.jsx] Fields missing, triggering ensureFields`);
      ensureFields().catch(console.error);
    }

    const run = async () => {
      reconciling.current = true;

      // ── Merge Guest Cart ───────────────────────────────────────────────────
      try {
        const rawCart = localStorage.getItem('dennan_guest_cart');
        if (rawCart) {
          const items = JSON.parse(rawCart);
          if (items.length > 0) {
            const payload = items.map(item => ({
              productId: item.id || item._id,
              quantity: item.quantity,
              size: item.size
            }));
            await mergeGuestCart({ guestCartItems: payload });
            console.log(`[AfterSignIn.jsx] Guest cart merged successfully`);
          }
          localStorage.removeItem('dennan_guest_cart');
        }
      } catch (err) {
        console.error(`[AfterSignIn.jsx] Failed to merge guest cart:`, err);
      }

      if (user.isAdmin) {
        console.log(`[AfterSignIn.jsx] Admin user — redirecting to /admin`);
        navigate("/admin", { replace: true });
        return;
      }

      if (user.isOnboarded) {
        // ── Already fully onboarded ──────────────────────────────────────────
        console.log(`[AfterSignIn.jsx] Already onboarded — redirecting to /dashboard`);
        // Hydrate UserContext from the Convex record so dashboard works immediately
        login({
          email: user.email,
          role: user.role,
          dueDate: user.dueDate,
          children: user.children,
        });
        clearLocalProfile(); // clean up any stale local data
        navigate("/dashboard", { replace: true });
        return;
      }

      // ── Not yet onboarded: attempt reconciliation ────────────────────────────
      const localProfile = readLocalProfile();

      if (localProfile) {
        console.log(`[AfterSignIn.jsx] Local profile found, reconciling with Convex...`, localProfile);
        try {
          const defaultName = user.email ? user.email.split('@')[0] : 'User';
          await completeOnboarding({
            name: defaultName,
            username: defaultName,
            interests: [],
            role: localProfile.role,
            dueDate: localProfile.dueDate,
            children: localProfile.children
              ? localProfile.children.map(c => ({ dob: c.dob }))
              : undefined,
          });
          console.log(`[AfterSignIn.jsx] completeOnboarding succeeded`);

          // Hydrate UserContext so /dashboard getStageInfo() works immediately
          login({
            email: user.email,
            role: localProfile.role,
            dueDate: localProfile.dueDate,
            children: localProfile.children,
          });

          // Data now lives in Convex — clean up localStorage
          clearLocalProfile();

          navigate("/dashboard", { replace: true });
        } catch (error) {
          console.error(`[AfterSignIn.jsx] completeOnboarding failed:`, error);
          // Even on failure, don't leave user stuck — re-open onboarding
          setShowOnboarding(true);
          navigate("/", { replace: true });
        }
      } else {
        // ── No local profile available — re-open onboarding at role step ──────
        console.log(`[AfterSignIn.jsx] No local profile — re-opening onboarding modal`);
        setShowOnboarding(true);
        navigate("/", { replace: true });
      }
    };

    run();
  }, [user, ensureFields, completeOnboarding, mergeGuestCart, navigate, setShowOnboarding, login]);

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card glass" style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h2 className="title-lg text-gradient">Signing you in…</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>
          We're preparing your personal experience. This will only take a moment.
        </p>
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <div
            className="glass"
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              borderLeftColor: 'var(--accent-primary)', borderWidth: '3px',
              borderStyle: 'solid', animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
