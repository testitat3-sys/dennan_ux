import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import BrandHeader from '../components/brand/BrandHeader';
import StageNavRail from '../components/brand/StageNavRail';
import BrandStory from '../components/brand/BrandStory';
import ProductSection from '../components/home/ProductSection';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import Text from '../components/ui/Text';
import './BrandPage.css';

const BrandPage = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  
  // Fetch live brand metadata and associated products from Convex
  const brand = useQuery(api.brands.getBrandBySlug, { slug: brandId || '' });

  const [activeStage, setActiveStage] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };

  // Scroll to top on brand mount/change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [brandId]);

  // Handle product stage filtering when brand data or active stage changes
  useEffect(() => {
    if (!brand) return;
    
    const products = brand.products || [];
    
    if (activeStage === 'all') {
      setFilteredProducts(products);
    } else {
      // Map frontend stages from StageNavRail.jsx to database stage fields
      // StageNavRail has: all, newborn, toddler, maternity
      // Database products has stage values: newborn, kid, mother
      let targetStage = activeStage;
      if (activeStage === 'toddler') {
        targetStage = 'kid';
      } else if (activeStage === 'maternity') {
        targetStage = 'mother';
      }
      
      setFilteredProducts(products.filter(p => p.stage === targetStage));
    }
  }, [activeStage, brand]);

  // Loading skeleton state (when brand query is undefined)
  if (brand === undefined) {
    return (
      <Page className="brand-page brand-page--loading" aria-hidden="true">
        {/* 1. Header Skeleton */}
        <Page.Section fullBleed className="brand-header brand-header--skeleton">
          <div className="brand-header__banner skeleton-shimmer" style={{ height: '400px' }}></div>
          <div className="brand-header__content">
            <div className="brand-header__identity">
              <div className="brand-header__logo-container skeleton-shimmer"></div>
              <div className="brand-header__info">
                <div className="skeleton-shimmer" style={{ width: '220px', height: '36px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}></div>
                <div className="skeleton-shimmer" style={{ width: '80%', maxWidth: '380px', height: '18px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}></div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <div className="skeleton-shimmer" style={{ width: '110px', height: '26px', borderRadius: 'var(--radius-pill)' }}></div>
                  <div className="skeleton-shimmer" style={{ width: '130px', height: '26px', borderRadius: 'var(--radius-pill)' }}></div>
                </div>
              </div>
            </div>
            <div className="brand-header__actions">
              <div className="skeleton-shimmer" style={{ width: '130px', height: '42px', borderRadius: 'var(--radius-md)' }}></div>
              <div className="skeleton-shimmer" style={{ width: '160px', height: '42px', borderRadius: 'var(--radius-md)' }}></div>
            </div>
          </div>
        </Page.Section>

        {/* 2. Overlapping Search Strip Skeleton */}
        <Page.Section className="search-strip search-strip--skeleton" style={{ paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="skeleton-shimmer" style={{ width: '200px', height: '14px', margin: '0 auto var(--space-4)', borderRadius: 'var(--radius-sm)' }}></div>
          <div className="skeleton-shimmer" style={{ height: '56px', width: '100%', maxWidth: '680px', margin: '0 auto var(--space-5)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-container-low)' }}></div>
          <div className="search-suggestions" style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', width: '100%' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ width: '120px', height: '32px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-container-low)' }}></div>
            ))}
          </div>
        </Page.Section>

        {/* 3. Main content area skeleton */}
        <Page.Section className="brand-page__main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--space-6)' }}>
          {/* Nav Rail tabs skeleton */}
          <div className="skeleton-tabs" style={{ display: 'flex', gap: 'var(--space-6)', borderBottom: '2px solid var(--surface-container)', padding: 'var(--space-4) 0', marginBottom: 'var(--space-10)' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ width: '80px', height: '18px', borderRadius: 'var(--radius-sm)' }}></div>
            ))}
          </div>

          {/* Product Grid Skeleton */}
          <div className="skeleton-products" style={{ marginBottom: 'var(--space-16)' }}>
            <div className="skeleton-shimmer" style={{ width: '180px', height: '24px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}></div>
            <CardGrid className="plp__grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </CardGrid>
          </div>
        </Page.Section>
      </Page>
    );
  }

  // Fallback state if brand doesn't exist in our database (null)
  if (brand === null) {
    return (
      <Page className="brand-page brand-page--error">
        <Page.Section>
          <Card variant="feature" hasShadow={false} className="brand-error-container">
            <span className="brand-error-icon">✨</span>
            <Text variant="headline-lg" as="h1" className="brand-error-title">Curating Soon</Text>
            <Text variant="body-lg" className="brand-error-text">
              We are currently hand-selecting the finest essentials from <strong>{brandId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong>.
            </Text>
            <Text variant="body-sm" className="brand-error-subtext">
              Our pediatric experts are verifying safety and comfort parameters to bring you a premium experience.
            </Text>
            <Button onClick={() => navigate('/')} variant="primary" className="brand-error-btn">
              Explore Curated Stages
            </Button>
          </Card>
        </Page.Section>
      </Page>
    );
  }

  return (
    <Page noPaddingTop className="brand-page">
      <Page.Section fullBleed noPadding>
        <BrandHeader brand={brand} />
      </Page.Section>
      <Page.Section>
        <SearchStrip />
      </Page.Section>
      
      <Page.Section className="brand-page__main" spacing="tight">
        <StageNavRail 
          activeStage={activeStage} 
          onStageChange={setActiveStage} 
        />
        
        <ProductSection 
          products={filteredProducts}
          onAddToCart={handleAddToCart}
        />
      </Page.Section>

      <Page.Section spacing="loose" fullBleed>
        <BrandStory story={brand.story} banner={brand.banner} />
      </Page.Section>
      
      <Page.Section spacing="loose" className="brand-page__bundles">
        <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} className="brand-page__bundles-header">
          <Card.Header align="center">
            <Text variant="headline-md" as="h2" className="brand-page__bundles-title">Curated Bundles</Text>
            <Text variant="body-sm" className="brand-page__bundles-subtitle">Shop the look with one click.</Text>
          </Card.Header>
        </Card>
        {/* Bundle placeholder */}
        <Card className="brand-page__bundle-card" variant="feature" layout="horizontal">
          <img src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200" alt="Bundle" className="brand-page__bundle-img" />
          <Card.Body className="brand-page__bundle-info">
            <Text variant="headline-md" as="h3">The Newborn Starter Set</Text>
            <Text variant="body-sm">Includes: 6 Bottles, Sterilizer, Bottle Warmer, and Soothers.</Text>
            <Button variant="hero" fullWidth>
              Add Bundle to Cart — UGX 149,000
            </Button>
          </Card.Body>
        </Card>
      </Page.Section>

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
    </Page>
  );
};

export default BrandPage;

