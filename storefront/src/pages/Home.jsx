import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../hooks/useTrackedQuery';
import { staticData } from '../constants/staticData';
import { stripBrandFromName } from '../utils/productNameUtils';
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

  // Live Convex queries for hero/trust content, featured products, stages, tiers
  const heroData = useQuery(api.data.getHero);
  const trustItemsData = useQuery(api.data.getTrustItems);
  const featuredProducts = useTrackedQuery(api.data.getHomeFeaturedProducts, {}, 20);
  const liveStages = useQuery(api.data.getStages);
  const liveTiers = useQuery(api.data.getTiers);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${stripBrandFromName(product.name, product.brand)} added to cart`);
    setShowToast(true);
  };

  const loading = heroData === undefined || trustItemsData === undefined;

  const hero = heroData || staticData.hero;
  const trustItems = (trustItemsData && trustItemsData.length > 0) ? trustItemsData : staticData.trustItems;

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
  }, [loading, featuredProducts, liveStages, liveTiers]);

  if (loading) {
    return isMobile ? <MobileHomeSkeleton /> : <HomeSkeleton />;
  }

  const mostLovedProducts = featuredProducts?.mostLoved || [];
  const curatedProducts = featuredProducts?.curated || [];

  const modifiedStages = liveStages?.map(stage =>
    stage.type === 'mother'
      ? { ...stage, heroImage: '/assets/stage_expectant.webp' }
      : stage
  );

  const modifiedTiers = liveTiers?.map(tier => {
    if (tier.type === 'essentials') {
      return { ...tier, image: '/assets/essentials.png' };
    }
    if (tier.type === 'musthaves') {
      return { ...tier, image: '/assets/Must haves.png' };
    }
    if (tier.type === 'luxuries') {
      return { ...tier, image: '/assets/luxuries.png' };
    }
    return tier;
  });

  return (
    <>
      <Helmet>
        <title>Dennan — Shop for baby, kid and mum care.</title>
        <meta name="description" content="Shop Dennan for baby, kid and mum care essentials — most-loved picks, curated bundles for every stage, and gifts they'll love." />
        <link rel="canonical" href="https://dennan.ug/" />
      </Helmet>
      <Hero content={hero} />
      <SearchStrip className="search-strip--home" products={featuredProducts ? [...mostLovedProducts, ...curatedProducts] : null} />
      <BrandsBanner />
      <GiftingBanner href="/registry" />


      {featuredProducts && (
        <ProductSection
          title="Most Loved by Parents          "
          eyebrow="Performance Picks"
          products={mostLovedProducts}
          viewAllLink="/collection/most-loved"
          viewAllText="See more"
          desktopScrollMobileGrid={true}
          onAddToCart={handleAddToCart}
        />
      )}

      <JourneySection stages={modifiedStages} />
      <TommeeTippeeBanner />
      <TierSection tiers={modifiedTiers} />

      {featuredProducts && (
        <ProductSection
          title="Curated picks for your journey"
          eyebrow="AI-curated picks"
          products={curatedProducts}
          viewAllLink="/collection/curated-picks"
          viewAllText="View all"
          onAddToCart={handleAddToCart}
        />
      )}

      <ReelsSection />
      <TrustStrip items={trustItems} />

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

