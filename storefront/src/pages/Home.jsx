import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/home/Hero';
import SearchStrip from '../components/home/SearchStrip';
import BrandsBanner from '../components/home/BrandsBanner';
import GiftingBanner from '../components/home/GiftingBanner';
import ProductSection from '../components/home/ProductSection';
import JourneySection from '../components/home/JourneySection';
import TierSection from '../components/home/TierSection';
import TommeeTippeeBanner from '../components/home/TommeeTippeeBanner';
import ReelsSection from '../components/home/ReelsSection';
import TrustStrip from '../components/home/TrustStrip';
import QuickViewModal from '../components/products/QuickViewModal';
import Toast from '../components/ui/Toast';
import { getHomepageData } from '../services/api';
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import HomeSkeleton from '../components/home/HomeSkeleton';
import MobileHomeSkeleton from '../components/skeletons/MobileHomeSkeleton';

const Home = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live Convex queries for products, stages, tiers
  const liveProducts = useQuery(api.data.getProducts);
  const liveStages = useQuery(api.data.getStages);
  const liveTiers = useQuery(api.data.getTiers);

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

  const loading = restLoading || !restData || liveProducts === undefined || liveStages === undefined || liveTiers === undefined;

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

    if (window.location.hash === '#journey-section') {
      const element = document.getElementById('journey-section');
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [loading]);

  if (loading) {
    return isMobile ? <MobileHomeSkeleton /> : <HomeSkeleton />;
  }

  const mostLovedProducts = liveProducts.filter(p => p.isMostLoved).slice(0, 8);
  const curatedProducts = liveProducts.filter(p => p.isCuratedForYou).slice(0, 4);

  const modifiedStages = liveStages?.map(stage => 
    stage.type === 'mother' 
      ? { ...stage, heroImage: '/new_assets/stage_expectant.webp' } 
      : stage
  );

  const modifiedTiers = liveTiers?.map(tier => {
    if (tier.type === 'essentials') {
      return { ...tier, image: '/new_assets/essentials.png' };
    }
    if (tier.type === 'musthaves') {
      return { ...tier, image: '/new_assets/Must haves.png' };
    }
    if (tier.type === 'luxuries') {
      return { ...tier, image: '/new_assets/luxuries.png' };
    }
    return tier;
  });

  return (
    <>
      <Hero content={restData.hero} />
      <SearchStrip className="search-strip--home" />
      <BrandsBanner />
      <GiftingBanner href="/registry" />


      <ProductSection
        title="Most Loved by Parents          "
        eyebrow="Performance Picks"
        products={mostLovedProducts}
        viewAllLink="/collection/most-loved"
        viewAllText="See more"
        desktopScrollMobileGrid={true}
        onAddToCart={handleAddToCart}
      />

      <JourneySection stages={modifiedStages} />
      <TommeeTippeeBanner />
      <TierSection tiers={modifiedTiers} />

      <ProductSection
        title="Curated picks for your journey"
        eyebrow="AI-curated picks"
        products={curatedProducts}
        viewAllLink="/collection/curated-picks"
        viewAllText="View all"
        onAddToCart={handleAddToCart}
      />

      <ReelsSection />
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

