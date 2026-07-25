import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './App.css';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import ProtectedRoute from './components/layout/ProtectedRoute';

const BrandPage = lazy(() => import('./pages/BrandPage'));
const PLP = lazy(() => import('./pages/PLP'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RegistryPage = lazy(() => import('./pages/RegistryPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage'));
const PDP = lazy(() => import('./pages/PDP'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'));
const PDPDemo = lazy(() => import('./pages/PDPDemo'));
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));
const LaunchPage = lazy(() => import('./pages/LaunchPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AfterSignIn = lazy(() => import('./pages/AfterSignIn'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PublicRegistryPage = lazy(() => import('./pages/PublicRegistryPage'));

import ScrollToTop from './utils/ScrollToTop';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import OnboardingModal from './components/ui/OnboardingModal';
import { initClarity } from './utils/clarity';
import { initGoogleAnalytics } from './utils/googleAnalytics';
import { identifyUser } from './utils/analytics';

// A lightweight route wrapper that brings up the OnboardingModal automatically
function OnboardingRoute() {
  const navigate = useNavigate();
  const convexUser = useQuery(api.users.viewer);

  React.useEffect(() => {
    if (convexUser && convexUser.isOnboarded) {
      console.log("[OnboardingRoute] Already onboarded, redirecting to /dashboard");
      navigate('/dashboard', { replace: true });
    }
  }, [convexUser, navigate]);

  return <OnboardingModal isOpen={true} onClose={() => navigate('/')} />;
}

function App() {
  React.useEffect(() => {
    // Initialize Clarity & GA4 tracking
    initClarity();
    initGoogleAnalytics();

    // User identification check from localStorage if available
    try {
      const savedUser = localStorage.getItem('dennan_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        const id = user.phone || user.id || user._id;
        if (id) {
          identifyUser(id, user.name || user.friendlyName || '');
        }
      }
    } catch (e) {
      // ignore parse error
    }
  }, []);

  return (
    <HelmetProvider>
    <Router>
      <ScrollToTop />
      <Layout>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/after-signin" element={<AfterSignIn />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          
          {/* Protected Private Routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/brand/:brandId" element={<BrandPage />} />
          <Route path="/category/:stageId" element={<PLP />} />
          <Route path="/collection/:collectionId" element={<PLP />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/registry" element={
            <ProtectedRoute>
              <RegistryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/registry/:registryId" element={<PublicRegistryPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/callback" element={<PaymentCallbackPage />} />
          <Route path="/product/:productId" element={<PDP />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="/pdp-demo" element={<PDPDemo />} />
          <Route path="/launch" element={<LaunchPage />} />
          
          {/* Unimplemented placeholder routes */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/safety" element={<ComingSoonPage />} />
          <Route path="/support" element={<ComingSoonPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/wholesale" element={<ComingSoonPage />} />
          <Route path="/brands" element={<ComingSoonPage />} />
          
          {/* Catch-all route for unknown paths */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </Layout>
    </Router>
    </HelmetProvider>
  );
}

export default App;

