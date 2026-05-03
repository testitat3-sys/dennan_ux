import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { stages, collections, products } from '../data/productData';
import ProductCard from '../components/ui/ProductCard';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
import './PLP.css';

const PLP = () => {
  const { stageId, collectionId } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  // Resolve view data (either from stage or collection)
  const viewData = collectionId 
    ? (collections[collectionId] || collections['curated-picks'])
    : (stages[stageId] || stages.newborn);
    
  const isCollectionView = !!collectionId;
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let results = products;
    
    // 1. Filter by collection or stage
    if (collectionId) {
      if (collectionId === 'curated-picks') {
        results = results.filter(p => p.isCurated);
      } else if (collectionId === 'most-loved') {
        results = results.filter(p => p.isMostLoved);
      } else if (collectionId === 'essentials') {
        results = results.filter(p => p.tier === 'Essentials');
      } else if (collectionId === 'must-haves') {
        results = results.filter(p => p.tier === 'Must-Haves');
      } else if (collectionId === 'luxuries') {
        results = results.filter(p => p.tier === 'Luxuries');
      }
    } else if (stageId && stageId !== 'all') {
      results = results.filter(p => p.stage === stageId);
    }
    
    // 2. Apply search query
    if (query) {
      const lowQuery = query.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(lowQuery) || 
        p.category.toLowerCase().includes(lowQuery) ||
        (p.tier && p.tier.toLowerCase().includes(lowQuery))
      );
    }
    
    // 3. Apply sidebar filters
    if (activeFilters.length > 0) {
      results = results.filter(p => activeFilters.includes(p.category) || activeFilters.includes(p.tier));
    }
    
    setFilteredProducts(results);
    window.scrollTo(0, 0);
  }, [stageId, collectionId, activeFilters, query]);

  const toggleFilter = (filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };

  // Derive categories for the sidebar based on the current results
  const categories = [...new Set(products.filter(p => {
    if (collectionId) return true; // Show all categories in collection view? Or just relevant ones?
    return p.stage === stageId;
  }).map(p => p.category))];
  
  const tiers = ['Essentials', 'Must-Haves', 'Luxuries'];

  return (
    <main className="plp">
      <header className={`plp__hero ${isCollectionView ? 'plp__hero--banner' : ''}`}>
        <div className="plp__hero-bg">
          <img src={viewData.heroImage} alt={viewData.title} />
        </div>
        <div className="plp__hero-content">
          <div className="plp__hero-shape" aria-hidden="true"></div>
          <h1 className="plp__hero-title">{viewData.title}</h1>
          <p className="plp__hero-subtext">{viewData.subtext}</p>
        </div>
      </header>

      <section className="plp__search-wrap">
        <SearchStrip initialQuery={query} />
      </section>

      <div className="plp__container">
        <aside className="plp__sidebar">
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

          <div className="filter-group">
            <span className="filter-group__title">Tiers</span>
            <ul className="filter-list">
              {tiers.map(tier => (
                <li 
                  key={tier} 
                  className={`filter-item ${activeFilters.includes(tier) ? 'is-active' : ''}`}
                  onClick={() => toggleFilter(tier)}
                >
                  <div className="filter-item__checkbox">
                    {activeFilters.includes(tier) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className="filter-item__label">{tier}</span>
                </li>
              ))}
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
                key={product.id} 
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

