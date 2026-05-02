import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { stages, products } from '../data/productData';
import ProductCard from '../components/ui/ProductCard';
import SearchStrip from '../components/home/SearchStrip';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
import './PLP.css';

const PLP = () => {
  const { stageId } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const stage = stages[stageId] || stages.newborn;
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Filter by stage
    let results = products;
    
    // Only filter by stage if it's not 'all'
    if (stageId !== 'all') {
      results = results.filter(p => p.stage === stageId);
    }
    
    // Apply search query
    if (query) {
      const lowQuery = query.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(lowQuery) || 
        p.category.toLowerCase().includes(lowQuery) ||
        (p.tier && p.tier.toLowerCase().includes(lowQuery))
      );
    }
    
    // Apply additional filters if any
    if (activeFilters.length > 0) {
      results = results.filter(p => activeFilters.includes(p.category) || activeFilters.includes(p.tier));
    }
    
    setFilteredProducts(results);
    window.scrollTo(0, 0);
  }, [stageId, activeFilters, query]);

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

  const categories = [...new Set(products.filter(p => p.stage === stageId).map(p => p.category))];
  const tiers = ['Essentials', 'Must-Haves', 'Luxuries'];

  return (
    <main className="plp">
      <header className="plp__hero">
        <div className="plp__hero-bg">
          <img src={stage.heroImage} alt={stage.title} />
        </div>
        <div className="plp__hero-content">
          <div className="plp__hero-shape" aria-hidden="true"></div>
          <h1 className="plp__hero-title">{stage.title}</h1>
          <p className="plp__hero-subtext">{stage.subtext}</p>
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
              Sort by: <span className="plp__sort-val">Curated for you</span>
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
