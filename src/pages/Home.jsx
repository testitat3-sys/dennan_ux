import React, { useEffect, useState } from 'react';
import Hero from '../components/home/Hero';
import SearchStrip from '../components/home/SearchStrip';
import BrandsBanner from '../components/home/BrandsBanner';
import ProductSection from '../components/home/ProductSection';
import JourneySection from '../components/home/JourneySection';
import TierSection from '../components/home/TierSection';
import ReelsSection from '../components/home/ReelsSection';
import TrustStrip from '../components/home/TrustStrip';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
import { products } from '../data/productData';

const Home = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Get data from centralized source
  const mostLovedProducts = products.filter(p => p.isMostLoved).slice(0, 5);
  const curatedProducts = products.filter(p => p.isCurated).slice(0, 4);

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };
  useEffect(() => {
    // Stagger-in observer for below-fold sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stagger-target').forEach((el, i) => {
            el.style.animationDelay = (i * 0.08) + 's';
            el.classList.add('stagger-in');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.tier-grid, .journey-grid, .product-grid, .product-scroll').forEach((grid) => {
      Array.from(grid.children).forEach((child) => child.classList.add('stagger-target'));
      observer.observe(grid);
    });
  }, []);

  return (
    <>
      <Hero />
      <SearchStrip />
      <BrandsBanner />
      
      <ProductSection 
        title="Most Loved by Parents"
        eyebrow="Performance Picks"
        products={mostLovedProducts}
        viewAllLink="/collection/most-loved"
        viewAllText="View most loved"
        isScroll={true}
        onAddToCart={handleAddToCart}
      />
      
      <JourneySection />
      <TierSection />
      
      <ProductSection 
        title="Curated picks for your journey"
        eyebrow="AI-curated picks"
        products={curatedProducts}
        viewAllLink="/collection/curated-picks"
        viewAllText="View all"
        onAddToCart={handleAddToCart}
      />
      
      <ReelsSection />
      <TrustStrip />

      {selectedProduct && (
        <QuickViewModal 
          product={selectedProduct} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleModalSuccess}
        />
      )}

      <Toast 
        isOpen={showToast} 
        message={toastMessage} 
        onClose={() => setShowToast(false)} 
      />
    </>
  );
};

export default Home;

