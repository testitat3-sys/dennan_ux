import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../hooks/useTrackedQuery';
import { stripBrandFromName } from '../utils/productNameUtils';
import ProductCard from '../components/products/ProductCard';
import ProductCardSkeleton from '../components/products/ProductCardSkeleton';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/products/QuickViewModal';
import StoreRequestModal from '../components/search/StoreRequestModal';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import CardGrid from '../components/ui/CardGrid';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import PLPSkeleton from '../components/skeletons/PLPSkeleton';
import './PLP.css';

const COLLECTIONS_METADATA = {
  'curated-picks': {
    title: 'Curated Picks',
    subtext: 'Hand-selected essentials backed by pediatric guidelines and expert care.',
    heroImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200'
  },
  'most-loved': {
    title: 'Most Loved',
    subtext: 'Top-rated favorites adored by our vibrant community of parents.',
    heroImage: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200'
  },
  'essentials': {
    title: 'The Essentials',
    subtext: 'The absolute basics you need to feel confident and prepared.',
    heroImage: 'https://images.unsplash.com/photo-1544126592-807daa215a05?auto=format&fit=crop&q=80&w=1200'
  },
  'must-haves': {
    title: 'Must-Haves',
    subtext: 'Highly recommended gear that will make your daily parenting life smoother.',
    heroImage: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&q=80&w=1200'
  },
  'luxuries': {
    title: 'Luxuries',
    subtext: 'Premium items to pamper yourself and your little one.',
    heroImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200'
  }
};

const SUBCATEGORY_MAP = {
  // Comfort subcategories
  "pregnancy pillows": "Comfort",
  "support belts": "Comfort",
  "sleep aids": "Comfort",
  "relaxation kits": "Comfort",

  // Apparel subcategories
  "nightdresses": "Apparel",
  "nursing pajamas": "Apparel",
  "cozy robes": "Apparel",
  "slippers & footwear": "Apparel",

  // Nursing subcategories
  "nursing bras": "Nursing",
  "breast pads": "Nursing",
  "nipple care": "Nursing",
  "breast pumps": "Nursing",

  // Recovery subcategories
  "postpartum care": "Recovery",
  "soothe & heal": "Recovery",
  "wellness": "Recovery",

  // Newborn Sleep subcategories
  "swaddles": "Sleep",
  "sleeping bags": "Sleep",
  "crib bedding": "Sleep",
  "night lights": "Sleep",

  // Newborn Clothing subcategories
  "sleepsuits": "Clothing",
  "bodysuits": "Clothing",
  "knitted sets": "Clothing",
  "organic cotton": "Clothing",

  // Newborn Bath & Care subcategories
  "baby bathtubs": "Bath & Care",
  "grooming kits": "Bath & Care",
  "skincare": "Bath & Care",
  "hooded towels": "Bath & Care",

  // Newborn Essentials subcategories
  "bottle feeding": "Essentials",
  "changing mats": "Essentials",
  "nappy caddies": "Essentials",
  "first gifts": "Essentials",

  // Toddler Play & Learn subcategories
  "activity mats": "Play & Learn",
  "wooden toys": "Play & Learn",
  "educational": "Play & Learn",
  "board books": "Play & Learn",

  // Toddler Weaning subcategories
  "high chairs": "Weaning",
  "bowls & plates": "Weaning",
  "baby spoons": "Weaning",
  "food blenders": "Weaning",

  // Toddler On the Move subcategories
  "strollers": "On the Move",
  "car seats": "On the Move",
  "baby carriers": "On the Move",
  "travel bags": "On the Move",

  // Toddler Safety subcategories
  "baby monitors": "Safety",
  "safety gates": "Safety",
  "corner protectors": "Safety",
  "socket plugs": "Safety"
};

const TIERS_LIST = ['Essentials', 'Must-Haves', 'Luxuries'];

const PLP = () => {
  const { stageId, collectionId } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  // Live fetch products and stage list from Convex
  const allProducts = useTrackedQuery(api.data.getProducts, {}, 20);
  const stages = useQuery(api.data.getStages);

  const [activeFilters, setActiveFilters] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showStoreRequestModal, setShowStoreRequestModal] = useState(false);

  const loading = allProducts === undefined || stages === undefined;

  // Clear sidebar filters whenever the user navigates to a different stage or collection
  useEffect(() => {
    setActiveFilters([]);
  }, [stageId, collectionId]);

  // Highlight and filter by category automatically if search matches a subcategory
  useEffect(() => {
    if (!query) {
      return;
    }

    const lowQuery = query.toLowerCase().trim();
    const mappedCategory = SUBCATEGORY_MAP[lowQuery];

    if (mappedCategory) {
      setActiveFilters([mappedCategory]);
    } else {
      setActiveFilters([]);
    }
  }, [query]);

  // Main client-side filtering effect
  useEffect(() => {
    if (loading || !allProducts) return;

    let results = [...allProducts];

    // Filter developer product: show ONLY on developer queries, hide otherwise
    const isDevQuery = query && ['500', 'developer', 'dev', 'dev-product', 'developer-product', 'developer product'].includes(query.toLowerCase().trim());
    if (isDevQuery) {
      results = results.filter(p => p.slug === 'developer-product');
    } else {
      results = results.filter(p => p.slug !== 'developer-product');
    }


    // 1. Filter by collection or stage
    if (collectionId) {
      if (collectionId === 'curated-picks') {
        results = results.filter(p => p.isCuratedForYou || p.isCurated);
      } else if (collectionId === 'most-loved') {
        results = results.filter(p => p.isMostLoved);
      } else if (collectionId === 'essentials') {
        results = results.filter(p => p.isEssentials);
      } else if (collectionId === 'must-haves') {
        results = results.filter(p => p.isMustHave);
      } else if (collectionId === 'luxuries') {
        results = results.filter(p => p.isLuxury);
      }
    } else if (stageId && stageId !== 'all') {
      results = results.filter(p => p.stage === stageId);
    }

    // 2. Apply search query
    if (query) {
      const lowQuery = query.toLowerCase().trim();
      const mappedCategory = SUBCATEGORY_MAP[lowQuery];

      // If search matches a mapped subcategory category, we do not double-filter by the query text,
      // as that might return empty results due to randomized seed name generations.
      if (!mappedCategory) {
        results = results.filter(p =>
          p.name.toLowerCase().includes(lowQuery) ||
          p.category.toLowerCase().includes(lowQuery) ||
          p.description?.toLowerCase().includes(lowQuery) ||
          (p.tier && p.tier.toLowerCase().includes(lowQuery)) ||
          p.tags?.some(t => t.text.toLowerCase().includes(lowQuery))
        );
      }
    }

    // 3. Apply active sidebar filters: AND across categories/tiers, OR within them
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
    window.scrollTo(0, 0);
  }, [stageId, collectionId, activeFilters, query, allProducts, loading]);

  // Auto-open the "request from physical store" modal shortly after a real,
  // user-driven search/filter yields zero results — once per browser session
  // so it doesn't nag on every subsequent empty search.
  useEffect(() => {
    if (loading) return;
    const isUserDrivenEmpty = filteredProducts.length === 0 && (!!query || activeFilters.length > 0);
    if (!isUserDrivenEmpty) return;
    if (sessionStorage.getItem('dennan_store_request_auto_shown')) return;

    const timer = setTimeout(() => {
      setShowStoreRequestModal(true);
      sessionStorage.setItem('dennan_store_request_auto_shown', 'true');
    }, 1500);

    return () => clearTimeout(timer);
  }, [filteredProducts, query, activeFilters, loading]);

  if (loading) {
    return <PLPSkeleton />;
  }


  // Resolve page header and lifestyle banner details
  const modifiedStages = stages?.map(stage =>
    stage.type === 'mother'
      ? { ...stage, heroImage: '/assets/stage_expectant.webp' }
      : stage
  );

  const isCollectionView = !!collectionId;
  const viewData = isCollectionView
    ? (COLLECTIONS_METADATA[collectionId] || COLLECTIONS_METADATA['curated-picks'])
    : (modifiedStages?.find(s => s.type === stageId) || {
      title: 'Curated Essentials',
      subtext: 'High-quality essentials hand-selected by our pediatric specialists.',
      heroImage: stageId === 'mother' ? '/assets/stage_expectant.webp' : 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200'
    });

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

  // Derive page-specific products based on the stage/collection context
  const pageProducts = allProducts
    ? allProducts.filter(p => {
      if (collectionId) {
        if (collectionId === 'curated-picks') return p.isCuratedForYou || p.isCurated;
        if (collectionId === 'most-loved') return p.isMostLoved;
        if (collectionId === 'essentials') return p.isEssentials;
        if (collectionId === 'must-haves') return p.isMustHave;
        if (collectionId === 'luxuries') return p.isLuxury;
        return true;
      }
      return stageId === 'all' ? true : p.stage === stageId;
    })
    : [];

  // Derive categories for the sidebar based on the current stage/collection context
  const categories = pageProducts.length > 0
    ? [...new Set(pageProducts.map(p => p.category).filter(Boolean))]
    : [];

  const tiers = TIERS_LIST;

  // Build breadcrumb trail based on route type
  const breadcrumbs = isCollectionView
    ? [
      { label: 'Home', href: '/' },
      { label: 'Collections', href: null },
      { label: viewData.title || collectionId, href: null },
    ]
    : [
      { label: 'Home', href: '/' },
      { label: viewData.title || stageId, href: null },
    ];

  const plpPathSegment = isCollectionView ? `collection/${collectionId}` : `category/${stageId}`;
  const plpCanonicalUrl = `https://dennan.ug/${plpPathSegment}`;
  const plpTitle = `${viewData.title || 'Shop'} | Dennan`;
  const plpDescription = viewData.subtext || viewData.copy || `Shop ${viewData.title || 'baby, kid and mum care essentials'} at Dennan — ${filteredProducts.length} products available, priced in UGX with delivery in Kampala.`;

  return (
    <Page noPaddingTop={true} padding="inset" bottomSpacing="loose">
      <Helmet>
        <title>{plpTitle}</title>
        <meta name="description" content={plpDescription} />
        <link rel="canonical" href={plpCanonicalUrl} />
        <meta property="og:title" content={plpTitle} />
        <meta property="og:description" content={plpDescription} />
        <meta property="og:url" content={plpCanonicalUrl} />
      </Helmet>
      <Page.Section as="header" fullBleed className={`plp__hero ${isCollectionView ? 'plp__hero--banner' : ''}`}>
        <div className="plp__hero-bg">
          <img src={viewData.heroImage || viewData.image || ''} alt={viewData.title || ''} />
        </div>
        <div className="plp__hero-content">
          <div className="plp__hero-shape" aria-hidden="true"></div>

          {/* Breadcrumbs — mobile only (desktop hidden via CSS) */}
          <nav className="plp__breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="plp__breadcrumb-sep" aria-hidden="true">›</span>}
                {crumb.href ? (
                  <Link to={crumb.href} className="plp__breadcrumb-link">{crumb.label}</Link>
                ) : (
                  <span className="plp__breadcrumb-current">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
              <Text
                role="display-lg"
                color="#ffffff"
                className="plp__hero-title"
                dangerouslySetInnerHTML={{ __html: viewData.title || '' }}
              />
            </Card>
            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
              <Text
                role="body-sm"
                color="rgba(255, 255, 255, 0.9)"
                className="plp__hero-subtext"
              >
                {viewData.subtext || viewData.copy || ''}
              </Text>
            </Card>
          </Card>

          {/* Search bar embedded in hero — visible on mobile only */}
          <div className="plp__hero-search">
            <SearchStrip initialQuery={query} products={pageProducts} />
          </div>
        </div>
      </Page.Section>

      {/* Search strip below hero — visible on desktop only */}
      <Page.Section className="plp__search-wrap plp__search-wrap--desktop">
        <SearchStrip initialQuery={query} products={pageProducts} />
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
                <Text role="label-md" color="primary" className="filter-group__title">Tiers</Text>
              </Card.Header>
              <Card.Body>
                <ul className="filter-list">
                  {tiers.map(tier => {
                    const isActive = activeFilters.some(f => f.toLowerCase() === tier.toLowerCase() || (f.toLowerCase() === 'must-haves' && tier.toLowerCase() === 'must-haves'));
                    return (
                      <li
                        key={tier}
                        className={`filter-item ${isActive ? 'is-active' : ''}`}
                        onClick={() => toggleFilter(tier)}
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

        <section className="plp__content">
          <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
            <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
              <div className="plp__toolbar">
                {filteredProducts.length > 0 && (
                  <Text role="body-sm" color="tertiary" className="plp__count">
                    <Package size={16} strokeWidth={2} aria-hidden="true" />
                    {filteredProducts.length} products found
                  </Text>
                )}
                <button
                  className="plp__mobile-filter-btn"
                  onClick={() => setIsMobileFilterOpen(true)}
                  aria-label={`Filter products${activeFilters.length > 0 ? `, ${activeFilters.length} active` : ''}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
                  <span className="plp__mobile-filter-label">Filter</span>
                  {activeFilters.length > 0 && (
                    <span className="plp__mobile-filter-badge">{activeFilters.length}</span>
                  )}
                </button>
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
                      {activeFilters.length > 0 && (
                        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])}>Clear all filters</Button>
                        </div>
                      )}
                      <Text role="title-sm" as="p" color="primary" style={{ fontWeight: 700, margin: 0 }}>
                        Can't find what you're looking for?
                      </Text>
                      <img
                        src="/assets/order-from-dennan.png"
                        alt="Can't find what you're looking for?"
                        className="plp__empty-image"
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--radius-lg)' }}
                      />
                      <Button variant="primary" size="sm" onClick={() => setShowStoreRequestModal(true)}>
                        Check our physical store
                      </Button>
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

      <StoreRequestModal
        isOpen={showStoreRequestModal}
        onClose={() => setShowStoreRequestModal(false)}
        initialItemDescription={query}
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
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>}
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
              </Card>

              <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePaddingHorizontal={true}>
                <Card variant="section" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true} className="filter-group">
                  <Card.Header style={{ marginBottom: 'var(--space-4)' }}>
                    <Text role="label-md" color="primary" className="filter-group__title">Tiers</Text>
                  </Card.Header>
                  <Card.Body>
                    <ul className="filter-list">
                      {tiers.map(tier => {
                        const isActive = activeFilters.some(f => f.toLowerCase() === tier.toLowerCase() || (f.toLowerCase() === 'must-haves' && tier.toLowerCase() === 'must-haves'));
                        return (
                          <li
                            key={tier}
                            className={`filter-item ${isActive ? 'is-active' : ''}`}
                            onClick={() => toggleFilter(tier)}
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

export default PLP;

