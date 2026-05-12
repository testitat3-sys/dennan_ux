import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import BrandPage from './pages/BrandPage';
import PLP from './pages/PLP';
import Dashboard from './pages/Dashboard';
import RegistryPage from './pages/RegistryPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import PDP from './pages/PDP';
import DesignSystemPage from './pages/DesignSystemPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AuthPage from './pages/AuthPage';
import AfterSignIn from './pages/AfterSignIn';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/layout/ProtectedRoute';

import ScrollToTop from './utils/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/after-signin" element={<AfterSignIn />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          {/* Protected Private Routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={<AdminDashboard />} />
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
          
          <Route path="/registry/:registryId" element={<RegistryPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
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

