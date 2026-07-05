import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import BrandPage from './pages/BrandPage';
import PLP from './pages/PLP';
import Dashboard from './pages/Dashboard';
import RegistryPage from './pages/RegistryPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import PDP from './pages/PDP';
import DesignSystemPage from './pages/DesignSystemPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AuthPage from './pages/AuthPage';
import AfterSignIn from './pages/AfterSignIn';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import PublicRegistryPage from './pages/PublicRegistryPage';
import ProtectedRoute from './components/layout/ProtectedRoute';

import ScrollToTop from './utils/ScrollToTop';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import OnboardingModal from './components/ui/OnboardingModal';

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
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
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
          
          {/* Unimplemented placeholder routes */}
          <Route path="/about" element={<ComingSoonPage />} />
          <Route path="/safety" element={<ComingSoonPage />} />
          <Route path="/support" element={<ComingSoonPage />} />
          <Route path="/faq" element={<ComingSoonPage />} />
          <Route path="/wholesale" element={<ComingSoonPage />} />
          <Route path="/brands" element={<ComingSoonPage />} />
          
          {/* Catch-all route for unknown paths */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

