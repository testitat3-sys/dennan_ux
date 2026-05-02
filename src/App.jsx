import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import BrandPage from './pages/BrandPage';
import PLP from './pages/PLP';
import Dashboard from './pages/Dashboard';
import RegistryPage from './pages/RegistryPage';
import CheckoutPage from './pages/CheckoutPage';
import PDP from './pages/PDP';

import ScrollToTop from './utils/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/brand/:brandId" element={<BrandPage />} />
          <Route path="/category/:stageId" element={<PLP />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/registry" element={<RegistryPage />} />
          <Route path="/registry/:registryId" element={<RegistryPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/product/:productId" element={<PDP />} />
          {/* Catch-all route to home for now */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
