import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/home/Hero';
import SearchStrip from '../components/home/SearchStrip';
import BrandsBanner from '../components/home/BrandsBanner';
import ProductSection from '../components/home/ProductSection';
import JourneySection from '../components/home/JourneySection';
import TierSection from '../components/home/TierSection';
import ReelsSection from '../components/home/ReelsSection';
import TrustStrip from '../components/home/TrustStrip';
import QuickViewModal from '../components/products/QuickViewModal';
import Toast from '../components/ui/Toast';
import { getHomepageData } from '../services/api';
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import HomeSkeleton from '../components/home/HomeSkeleton';

const Home = () => {
  const navigate = useNavigate();


  // Live Convex queries for products, stages, tiers, reels
  const liveProducts = useQuery(api.data.getProducts);
  const liveStages = useQuery(api.data.getStages);
  const liveTiers = useQuery(api.data.getTiers);
  const liveReels = useQuery(api.data.getReels);

  // REST data fallback for static design items (hero, brands banner, trust items)
  const [restData, setRestData] = useState(null);
  const [restLoading, setRestLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const result = await getHomepageData();
      setRestData(result);
      setRestLoading(false);
    };
    loadData();
  }, []);

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };

  const loading = restLoading || !restData || liveProducts === undefined || liveStages === undefined || liveTiers === undefined || liveReels === undefined;

  useEffect(() => {
    if (loading) return;
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
  }, [loading]);

  if (loading) {
    return <HomeSkeleton />;
  }

  const mostLovedProducts = liveProducts.filter(p => p.isMostLoved).slice(0, 8);
  const curatedProducts = liveProducts.filter(p => p.isCurated).slice(0, 4);

  return (
    <>
      <Hero content={restData.hero} />
      <SearchStrip />
      <BrandsBanner brands={restData.brands} />


      <ProductSection
        title="Most Loved by Parents          "
        eyebrow="Performance Picks"
        products={mostLovedProducts}
        viewAllLink="/collection/most-loved"
        viewAllText="See more"
        desktopScrollMobileGrid={true}
        onAddToCart={handleAddToCart}
      />

      <JourneySection stages={liveStages} />
      <TierSection tiers={liveTiers} />

      <ProductSection
        title="Curated picks for your journey"
        eyebrow="AI-curated picks"
        products={curatedProducts}
        viewAllLink="/collection/curated-picks"
        viewAllText="View all"
        onAddToCart={handleAddToCart}
      />

      <ReelsSection reels={liveReels} />
      <TrustStrip items={restData.trustItems} />

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

