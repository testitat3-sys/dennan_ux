import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../hooks/useTrackedQuery';
import { stripBrandFromName } from '../utils/productNameUtils';
import { useLeadCapture } from '../context/LeadCaptureContext';
import ProductCard from '../components/products/ProductCard';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/products/QuickViewModal';
import LaunchGate from '../components/registry/LaunchGate';
import OfferCountdownBanner from '../components/registry/OfferCountdownBanner';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import CardGrid from '../components/ui/CardGrid';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import PLPSkeleton from '../components/skeletons/PLPSkeleton';
import './PLP.css';

const HERO = {
  title: 'Launch Offers',
  subtext: 'Choose a product to enjoy our limited-time discounts.',
  heroImage: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200',
};

const DISCOUNT_BUCKETS = [
  { id: '10', label: '10% off', min: 10, max: 24 },
  { id: '25', label: '25% off', min: 25, max: 49 },
  { id: '50', label: '50% off', min: 50, max: Infinity },
];

const LaunchPage = () => {
  const { leadCaptured } = useLeadCapture();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const allProducts = useTrackedQuery(api.data.getProducts, {}, 20);
  const loading = allProducts === undefined;

  const [activeCategories, setActiveCategories] = useState([]);
  const [activeBuckets, setActiveBuckets] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');



  if (loading) {
    return <PLPSkeleton />;
  }

  // Only products with an active, non-expired discount carry a wasPrice > price
  // (see convex/products.ts::normalizeProductPrice).
  const discountedProducts = allProducts
    .filter(p => p.wasPrice && p.wasPrice > p.price)
    .map(p => ({ ...p, discountPercent: Math.round(((p.wasPrice - p.price) / p.wasPrice) * 100) }));

  const toggleCategory = (cat) => {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleBucket = (bucketId) => {
    setActiveBuckets(prev =>
      prev.includes(bucketId) ? prev.filter(b => b !== bucketId) : [...prev, bucketId]
    );
  };

  const clearFilters = () => {
    setActiveCategories([]);
    setActiveBuckets([]);
  };

  let filteredProducts = discountedProducts;

  if (query) {
    const lowQuery = query.toLowerCase().trim();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(lowQuery) ||
      p.category.toLowerCase().includes(lowQuery) ||
      p.description?.toLowerCase().includes(lowQuery) ||
      (p.tier && p.tier.toLowerCase().includes(lowQuery)) ||
      p.tags?.some(t => t.text.toLowerCase().includes(lowQuery))
    );
  }

  if (activeCategories.length > 0) {
    filteredProducts = filteredProducts.filter(p => activeCategories.includes(p.category));
  }

  if (activeBuckets.length > 0) {
    const buckets = DISCOUNT_BUCKETS.filter(b => activeBuckets.includes(b.id));
    filteredProducts = filteredProducts.filter(p =>
      buckets.some(b => p.discountPercent >= b.min && p.discountPercent <= b.max)
    );
  }

  const categories = [...new Set(discountedProducts.map(p => p.category).filter(Boolean))];
  const activeFilterCount = activeCategories.length + activeBuckets.length;

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product, isWishlist = false) => {
    const displayName = stripBrandFromName(product.name, product.brand);
    setToastMessage(isWishlist ? `${displayName} bookmarked to wishlist` : `${displayName} added to cart`);
    setShowToast(true);
  };

  const handleSearchSubmit = (text) => {
    if (text && text.trim()) {
      setSearchParams({ q: text.trim() });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <div className="launch-page__hero-banner">
        <img
          src="/assets/launch_offers_home.png"
          alt="Launch offers — up to UGX 190,000 off"
          className="launch-page__hero-banner-image"
        />
      </div>

      <Page padding="inset" bottomSpacing="loose" noPaddingTop={true}>
      <Helmet>
        <title>Launch Offers | Dennan</title>
        <meta name="description" content={HERO.subtext} />
      </Helmet>

      <div className="launch-page__sticky-banner">
        <OfferCountdownBanner />
      </div>

      <Page.Section className="plp__search-wrap plp__search-wrap--no-hero">
        <SearchStrip initialQuery={query} products={discountedProducts} onSubmit={handleSearchSubmit} />
      </Page.Section>

      <Page.Section className="plp__container">
        <aside className="plp__sidebar">
          <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
            {categories.length > 0 && (
              <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true}>
                <Card.Header style={{ marginBottom: 'var(--space-4)' }}>
                  <Text role="label-md" color="primary" className="filter-group__title">Categories</Text>
                </Card.Header>
                <Card.Body>
                  <ul className="filter-list">
                    {categories.map(cat => {
                      const isActive = activeCategories.includes(cat);
                      return (
                        <li
                          key={cat}
                          className={`filter-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => toggleCategory(cat)}
                        >
                          <div className="filter-item__checkbox">
                            {isActive && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <Text
                            role={isActive ? "title-sm" : "body-sm"}
                            color={isActive ? "primary" : "secondary"}
                            className="filter-item__label"
                          >
                            {cat}
                          </Text>
                        </li>
                      );
                    })}
                  </ul>
                </Card.Body>
              </Card>
            )}

            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true}>
              <Card.Header style={{ marginBottom: 'var(--space-4)' }}>
                <Text role="label-md" color="primary" className="filter-group__title">Discount</Text>
              </Card.Header>
              <Card.Body>
                <ul className="filter-list">
                  {DISCOUNT_BUCKETS.map(bucket => {
                    const isActive = activeBuckets.includes(bucket.id);
                    return (
                      <li
                        key={bucket.id}
                        className={`filter-item ${isActive ? 'is-active' : ''}`}
                        onClick={() => toggleBucket(bucket.id)}
                      >
                        <div className="filter-item__checkbox">
                          {isActive && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <Text
                          role={isActive ? "title-sm" : "body-sm"}
                          color={isActive ? "primary" : "secondary"}
                          className="filter-item__label"
                        >
                          {bucket.label}
                        </Text>
                      </li>
                    );
                  })}
                </ul>
              </Card.Body>
            </Card>
          </Card>
        </aside>

        <section className="plp__content">
          <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
              <div className="plp__toolbar">
                {filteredProducts.length > 0 && (
                  <Text role="body-sm" color="tertiary" className="plp__count">
                    <Package size={16} strokeWidth={2} aria-hidden="true" />
                    {filteredProducts.length} offers found
                  </Text>
                )}
              </div>
            </Card>

            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
              <CardGrid columns={3} mobileColumns={2} gap="default" className="plp__grid">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product._id || product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </CardGrid>
            </Card>

            {filteredProducts.length === 0 && (
              <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
                <div className="plp__empty">
                  <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center' }}>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>
                      )}
                      <Text role="title-sm" as="p" color="primary" style={{ fontWeight: 700, margin: 0 }}>
                        No offers live right now — check back soon.
                      </Text>
                    </div>
                  </Card>
                </div>
              </Card>
            )}
          </Card>
        </section>
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
    </>
  );
};

export default LaunchPage;
