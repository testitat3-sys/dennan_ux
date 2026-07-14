import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../hooks/useTrackedQuery';
import ProductCard from '../components/products/ProductCard';
import { stripBrandFromName } from '../utils/productNameUtils';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/products/QuickViewModal';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import CardGrid from '../components/ui/CardGrid';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import BrandPageSkeleton from '../components/skeletons/BrandPageSkeleton';
import './PLP.css';
import './BrandPage.css';


const TIERS_LIST = ['Essentials', 'Must-Haves', 'Luxuries'];

const BrandPage = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  
  // Fetch live brand metadata and associated products from Convex
  const brand = useTrackedQuery(api.brands.getBrandBySlug, { slug: brandId || '' }, 20);

  const [activeFilters, setActiveFilters] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const loading = brand === undefined;

  // Clear sidebar filters whenever the brand changes
  useEffect(() => {
    setActiveFilters([]);
  }, [brandId]);

  // Scroll to top on brand mount/change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [brandId]);

  // Client-side filtering logic matching PLP.jsx
  useEffect(() => {
    if (loading || !brand || !brand.products) return;

    let results = [...brand.products];
    
    // Apply active sidebar filters: AND across categories/tiers, OR within them
    const activeCategories = activeFilters.filter(f => !TIERS_LIST.includes(f));
    const activeTiers = activeFilters.filter(f => TIERS_LIST.includes(f));

    if (activeCategories.length > 0) {
      results = results.filter(p => activeCategories.includes(p.category));
    }

    if (activeTiers.length > 0) {
      results = results.filter(p => {
        if (!p.tier) return false;
        const pl = p.tier.toLowerCase();
        return activeTiers.some(t => {
          const tl = t.toLowerCase();
          return tl === pl || (tl === 'must-haves' && pl === 'musthaves') || (tl === 'musthaves' && pl === 'must-haves');
        });
      });
    }
    
    setFilteredProducts(results);
  }, [activeFilters, brand, loading]);

  const toggleFilter = (filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product, isWishlist = false) => {
    const displayName = stripBrandFromName(product.name, product.brand);
    setToastMessage(isWishlist ? `${displayName} bookmarked to wishlist` : `${displayName} added to cart`);
    setShowToast(true);
  };

  // Loading skeleton state
  if (loading) {
    return <BrandPageSkeleton />;
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

  // Derive categories dynamically from the brand's products
  const categories = brand.products 
    ? [...new Set(brand.products.map(p => p.category).filter(Boolean))]
    : [];

  const tiers = TIERS_LIST;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Brands', href: null },
    { label: brand.name, href: null },
  ];

  return (
    <Page noPaddingTop={true} padding="inset" bottomSpacing="loose" className="brand-page">
      {/* Brand Hero — flat editorial typography, no banner image */}
      <Page.Section as="header" fullBleed className="brand-hero">
        <nav className="brand-hero__breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="brand-hero__breadcrumb-sep" aria-hidden="true">›</span>}
              {crumb.href ? (
                <Link to={crumb.href} className="brand-hero__breadcrumb-link">{crumb.label}</Link>
              ) : (
                <span className="brand-hero__breadcrumb-current">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <Text
          role="display-lg"
          as="h1"
          className="brand-hero__title"
        >
          {brand.name}
        </Text>

        <div className="brand-hero__rule" aria-hidden="true"></div>

        <Text
          role="body-sm"
          color="secondary"
          className="brand-hero__subtext"
        >
          {brand.mission || (brand.story && brand.story.content) || `High-quality essentials from ${brand.name}.`}
        </Text>
      </Page.Section>

      {/* Search strip — shown on both desktop and mobile, right after the hero */}
      <Page.Section className="plp__search-wrap">
        <SearchStrip products={brand?.products} />
      </Page.Section>

      <Page.Section className="plp__container">
        {/* Sidebar Filters */}
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
                      const isActive = activeFilters.includes(cat);
                      return (
                        <li 
                          key={cat} 
                          className={`filter-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => toggleFilter(cat)}
                        >
                          <div className="filter-item__checkbox">
                            {isActive && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
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
                <Text role="label-md" color="primary" className="filter-group__title">Tiers</Text>
              </Card.Header>
              <Card.Body>
                <ul className="filter-list">
                  {tiers.map(tier => {
                    const isActive = activeFilters.some(f => f.toLowerCase() === tier.toLowerCase());
                    return (
                      <li 
                        key={tier} 
                        className={`filter-item ${isActive ? 'is-active' : ''}`}
                        onClick={() => toggleFilter(tier)}
                      >
                        <div className="filter-item__checkbox">
                          {isActive && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <Text 
                          role={isActive ? "title-sm" : "body-sm"} 
                          color={isActive ? "primary" : "secondary"} 
                          className="filter-item__label"
                        >
                          {tier}
                        </Text>
                      </li>
                    );
                  })}
                </ul>
              </Card.Body>
            </Card>
          </Card>
        </aside>

        {/* Product Grid section */}
        <section className="plp__content">
          <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
              <div className="plp__toolbar">
                <Text role="body-sm" color="tertiary" className="plp__count">{filteredProducts.length} products found</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <button 
                    className="plp__mobile-filter-btn" 
                    onClick={() => setIsMobileFilterOpen(true)}
                    aria-label={`Filter products${activeFilters.length > 0 ? `, ${activeFilters.length} active` : ''}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
                    <span className="plp__mobile-filter-label">Filter</span>
                    {activeFilters.length > 0 && (
                      <span className="plp__mobile-filter-badge">{activeFilters.length}</span>
                    )}
                  </button>
                  <Text role="body-sm" color="secondary" className="plp__sort">
                    Sort by: <Text role="title-sm" color="primary" as="span" className="plp__sort-val">Recommended</Text>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'var(--space-1)' }}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </Text>
                </div>
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
                    <Text role="body-lg" color="secondary">No products match your current filters.</Text>
                  </Card>
                  <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
                    <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])}>Clear all filters</Button>
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

      {/* Mobile Bottom Sheet Filter Drawer */}
      <div className={`plp__filter-drawer ${isMobileFilterOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true">
        <div className="plp__filter-drawer-overlay" onClick={() => setIsMobileFilterOpen(false)} />
        <div className="plp__filter-drawer-content">
          <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true} className="plp__filter-drawer-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Text role="headline-sm" as="h3" color="primary">Filter Products</Text>
                <Button 
                  variant="ghost" 
                  className="plp__filter-drawer-close" 
                  aria-label="Close filters" 
                  onClick={() => setIsMobileFilterOpen(false)}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                />
              </div>
            </Card>
            
            <div className="plp__filter-drawer-body">
              <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true}>
                {categories.length > 0 && (
                  <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true} className="filter-group">
                    <Card.Header style={{ marginBottom: 'var(--space-4)' }}>
                      <Text role="label-md" color="primary" className="filter-group__title">Categories</Text>
                    </Card.Header>
                    <Card.Body>
                      <ul className="filter-list">
                        {categories.map(cat => {
                          const isActive = activeFilters.includes(cat);
                          return (
                            <li 
                              key={cat} 
                              className={`filter-item ${isActive ? 'is-active' : ''}`}
                              onClick={() => toggleFilter(cat)}
                            >
                              <div className="filter-item__checkbox">
                                {isActive && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"/>
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
              </Card>

              <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true}>
                <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true} className="filter-group">
                  <Card.Header style={{ marginBottom: 'var(--space-4)' }}>
                    <Text role="label-md" color="primary" className="filter-group__title">Tiers</Text>
                  </Card.Header>
                  <Card.Body>
                    <ul className="filter-list">
                      {tiers.map(tier => {
                        const isActive = activeFilters.some(f => f.toLowerCase() === tier.toLowerCase());
                        return (
                          <li 
                            key={tier} 
                            className={`filter-item ${isActive ? 'is-active' : ''}`}
                            onClick={() => toggleFilter(tier)}
                          >
                            <div className="filter-item__checkbox">
                              {isActive && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                            <Text 
                              role={isActive ? "title-sm" : "body-sm"} 
                              color={isActive ? "primary" : "secondary"} 
                              className="filter-item__label"
                            >
                              {tier}
                            </Text>
                          </li>
                        );
                      })}
                    </ul>
                  </Card.Body>
                </Card>
              </Card>
            </div>

            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true} className="plp__filter-drawer-footer">
              <div style={{ display: 'flex', gap: 'var(--space-4)', width: '100%' }}>
                <Button variant="ghost" fullWidth onClick={() => { setActiveFilters([]); setIsMobileFilterOpen(false); }}>
                  Clear All
                </Button>
                <Button variant="primary" fullWidth onClick={() => setIsMobileFilterOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </Card>
          </Card>
        </div>
      </div>
    </Page>
  );
};

export default BrandPage;
