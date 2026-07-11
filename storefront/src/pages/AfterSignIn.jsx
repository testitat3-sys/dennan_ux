import React, { useEffect, useRef } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
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
  const saveOnboardingJourney = useMutation(api.users.saveOnboardingJourney);
  const submitReferralSource = useMutation(api.referralSources.submitReferralSource);
  const mergeGuestCart = useMutation(api.cart.mergeGuestCart);
  const mergeGuestWishlist = useMutation(api.wishlist.mergeGuestWishlist);
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

      // ── Merge Guest Wishlist ─────────────────────────────────────────────
      try {
        const rawWishlist = localStorage.getItem('dennan_guest_wishlist');
        if (rawWishlist) {
          const productIds = JSON.parse(rawWishlist);
          if (productIds.length > 0) {
            await mergeGuestWishlist({ guestProductIds: productIds });
            console.log(`[AfterSignIn.jsx] Guest wishlist merged successfully`);
          }
          localStorage.removeItem('dennan_guest_wishlist');
        }
      } catch (err) {
        console.error(`[AfterSignIn.jsx] Failed to merge guest wishlist:`, err);
      }



      // Preserve destination target page (e.g. /registry, /dashboard)
      const savedRedirectPath = localStorage.getItem('dennan_redirect_after_login');
      const targetDestination = savedRedirectPath || "/dashboard";

      const isDirectLogin = localStorage.getItem('dennan_is_direct_login') === 'true';
      localStorage.removeItem('dennan_is_direct_login');

      // ── Reconcile Cached pre-auth onboarding details ─────────────────────
      // Only reconcile when the local profile actually has a role, i.e. the
      // user went through onboarding steps 1-3 before entering their email.
      // The "Already have an account? Login" path saves a profile with no
      // role, and should fall through to the hasJourneyData check below so
      // that a login attempt with no matching account gets sent through
      // onboarding instead of silently patched with an empty profile.
      const localProfile = readLocalProfile();
      if (localProfile && localProfile.role) {
        console.log(`[AfterSignIn.jsx] Local pre-auth profile found:`, localProfile);
        try {
          await saveOnboardingJourney({
            role: localProfile.role,
            dueDate: localProfile.dueDate,
            children: localProfile.children,
            name: localProfile.name,
          });
          console.log(`[AfterSignIn.jsx] Pre-auth journey details saved to database`);

          if (localProfile.referralSource) {
            try {
              await submitReferralSource({
                source: localProfile.referralSource,
                otherDetail: localProfile.otherReferralDetail,
              });
            } catch (err) {
              console.error(`[AfterSignIn.jsx] Failed to submit pre-auth referral source:`, err);
            }
          }

          login({
            email: user.email,
            role: localProfile.role,
            dueDate: localProfile.dueDate,
            children: localProfile.children,
            name: localProfile.name,
          });
          clearLocalProfile();
          localStorage.removeItem('dennan_redirect_after_login');
          navigate(targetDestination, { replace: true });
          return;
        } catch (err) {
          console.error(`[AfterSignIn.jsx] Failed to save pre-auth onboarding journey:`, err);
        }
      }

      // ── Check if they already have journey data ──────────────────────────
      const hasJourneyData = user.isOnboarded || (user.role && (user.dueDate || (user.children && user.children.length > 0)));
      const redirectTarget = (isDirectLogin && hasJourneyData) ? "/profile" : targetDestination;

      if (hasJourneyData) {
        console.log(`[AfterSignIn.jsx] Already has journey data — redirecting to ${redirectTarget}`);
        login({
          email: user.email,
          role: user.role,
          dueDate: user.dueDate,
          children: user.children,
          username: user.username,
          name: user.name,
        });
        clearLocalProfile(); // clean up any stale local data
        localStorage.removeItem('dennan_redirect_after_login');
        navigate(redirectTarget, { replace: true });
        return;
      } else {
        // ── Missing journey data — take them through the rest of onboarding ────
        console.log(`[AfterSignIn.jsx] Missing journey data — opening onboarding modal`);
        login({
          email: user.email,
          role: user.role,
          dueDate: user.dueDate,
          children: user.children,
        });
        setShowOnboarding(true);
        navigate("/", { replace: true });
        return;
      }

    };

    run();
  }, [user, ensureFields, saveOnboardingJourney, submitReferralSource, mergeGuestCart, mergeGuestWishlist, navigate, setShowOnboarding, login]);

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
