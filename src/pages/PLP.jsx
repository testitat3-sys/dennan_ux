import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import ProductCard from '../components/ui/ProductCard';
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
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
  const allProducts = useQuery(api.data.getProducts);
  const stages = useQuery(api.data.getStages);

  const [activeFilters, setActiveFilters] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    
    // 1. Filter by collection or stage
    if (collectionId) {
      if (collectionId === 'curated-picks') {
        results = results.filter(p => p.isCurated);
      } else if (collectionId === 'most-loved') {
        results = results.filter(p => p.isMostLoved);
      } else if (collectionId === 'essentials') {
        results = results.filter(p => p.tier?.toLowerCase() === 'essentials');
      } else if (collectionId === 'must-haves') {
        results = results.filter(p => p.tier?.toLowerCase() === 'musthaves' || p.tier?.toLowerCase() === 'must-haves');
      } else if (collectionId === 'luxuries') {
        results = results.filter(p => p.tier?.toLowerCase() === 'luxuries');
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
          (p.tier && p.tier.toLowerCase().includes(lowQuery))
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

  if (loading) {
    return (
      <main className="plp plp--loading" aria-hidden="true">
        <header className="plp__hero plp__hero--skeleton">
          <div className="plp__hero-bg skeleton-shimmer" style={{ background: 'var(--surface-container-high, #ede9e5)', height: '100%' }} />
          <div className="plp__hero-content">
            <div className="plp__hero-shape" aria-hidden="true" />
            <div className="skeleton-title skeleton-shimmer" style={{ height: '40px', width: '280px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }} />
            <div className="skeleton-subtext skeleton-shimmer" style={{ height: '20px', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-sm)' }} />
          </div>
        </header>

        <section className="plp__search-wrap">
          <div className="skeleton-shimmer" style={{ height: '56px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-container-low)' }} />
        </section>

        <div className="plp__container">
          <aside className="plp__sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton-shimmer" style={{ height: '18px', width: '80px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
                <div className="skeleton-shimmer" style={{ height: '14px', width: '120px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
                <div className="skeleton-shimmer" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
                <div className="skeleton-shimmer" style={{ height: '14px', width: '130px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton-shimmer" style={{ height: '18px', width: '60px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
                <div className="skeleton-shimmer" style={{ height: '14px', width: '110px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
                <div className="skeleton-shimmer" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
              </div>
            </div>
          </aside>

          <section className="plp__content">
            <div className="plp__toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton-shimmer" style={{ height: '14px', width: '140px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
              <div className="skeleton-shimmer" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--surface-container-high)' }} />
            </div>

            <div className="plp__grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Resolve page header and lifestyle banner details
  const isCollectionView = !!collectionId;
  const viewData = isCollectionView 
    ? (COLLECTIONS_METADATA[collectionId] || COLLECTIONS_METADATA['curated-picks'])
    : (stages?.find(s => s.type === stageId) || {
        title: 'Curated Essentials',
        subtext: 'High-quality essentials hand-selected by our pediatric specialists.',
        heroImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200'
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
    setToastMessage(isWishlist ? `${product.name} bookmarked to wishlist` : `${product.name} added to cart`);
    setShowToast(true);
  };

  // Derive categories for the sidebar based on the current stage/collection context
  const categories = allProducts 
    ? [...new Set(allProducts.filter(p => {
        if (collectionId) {
          if (collectionId === 'curated-picks') return p.isCurated;
          if (collectionId === 'most-loved') return p.isMostLoved;
          if (collectionId === 'essentials') return p.tier?.toLowerCase() === 'essentials';
          if (collectionId === 'must-haves') return p.tier?.toLowerCase() === 'musthaves' || p.tier?.toLowerCase() === 'must-haves';
          if (collectionId === 'luxuries') return p.tier?.toLowerCase() === 'luxuries';
          return true;
        }
        return p.stage === stageId;
      }).map(p => p.category))]
    : [];
  
  const tiers = TIERS_LIST;

  return (
    <main className="plp">
      <header className={`plp__hero ${isCollectionView ? 'plp__hero--banner' : ''}`}>
        <div className="plp__hero-bg">
          <img src={viewData.heroImage || viewData.image || ''} alt={viewData.title || ''} />
        </div>
        <div className="plp__hero-content">
          <div className="plp__hero-shape" aria-hidden="true"></div>
          <h1 className="plp__hero-title" dangerouslySetInnerHTML={{ __html: viewData.title || '' }}></h1>
          <p className="plp__hero-subtext">{viewData.subtext || viewData.copy || ''}</p>
        </div>
      </header>

      <section className="plp__search-wrap">
        <SearchStrip initialQuery={query} />
      </section>

      <div className="plp__container">
        <aside className="plp__sidebar">
          {categories.length > 0 && (
            <div className="filter-group">
              <span className="filter-group__title">Categories</span>
              <ul className="filter-list">
                {categories.map(cat => (
                  <li 
                    key={cat} 
                    className={`filter-item ${activeFilters.includes(cat) ? 'is-active' : ''}`}
                    onClick={() => toggleFilter(cat)}
                  >
                    <div className="filter-item__checkbox">
                      {activeFilters.includes(cat) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span className="filter-item__label">{cat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="filter-group">
            <span className="filter-group__title">Tiers</span>
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
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span className="filter-item__label">{tier}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="plp__content">
          <div className="plp__toolbar">
            <span className="plp__count">{filteredProducts.length} products found</span>
            <div className="plp__sort">
              Sort by: <span className="plp__sort-val">{isCollectionView ? 'Curated' : 'Recommended'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>

          <div className="plp__grid">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product._id || product.id} 
                product={product} 
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="plp__empty">
              <p>No products match your current filters.</p>
              <button className="btn-ghost" onClick={() => setActiveFilters([])}>Clear all filters</button>
            </div>
          )}
        </section>
      </div>

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
    </main>
  );
};

export default PLP;

