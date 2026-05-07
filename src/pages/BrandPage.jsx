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
      <div className="brand-page brand-page--loading">
        <div className="brand-loading-skeleton">
          <div className="skeleton-banner"></div>
          <div className="skeleton-header-content">
            <div className="skeleton-logo"></div>
            <div className="skeleton-text-block">
              <div className="skeleton-line skeleton-line--title"></div>
              <div className="skeleton-line skeleton-line--subtitle"></div>
            </div>
          </div>
          <div className="brand-loading">Unveiling Brand Experience...</div>
        </div>
      </div>
    );
  }

  // Fallback state if brand doesn't exist in our database (null)
  if (brand === null) {
    return (
      <div className="brand-page brand-page--error">
        <div className="brand-error-container">
          <span className="brand-error-icon">✨</span>
          <h1 className="brand-error-title">Curating Soon</h1>
          <p className="brand-error-text">
            We are currently hand-selecting the finest essentials from <strong>{brandId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong>.
          </p>
          <p className="brand-error-subtext">
            Our pediatric experts are verifying safety and comfort parameters to bring you a premium experience.
          </p>
          <button onClick={() => navigate('/')} className="brand-error-btn">
            Explore Curated Stages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-page">
      <BrandHeader brand={brand} />
      <SearchStrip />
      
      <main className="brand-page__main">
        <StageNavRail 
          activeStage={activeStage} 
          onStageChange={setActiveStage} 
        />
        
        <div className="brand-page__products">
          <ProductSection 
            title={`${activeStage === 'all' ? 'Full Collection' : activeStage.charAt(0).toUpperCase() + activeStage.slice(1) + ' Essentials'}`}
            eyebrow={brand.name}
            products={filteredProducts}
            viewAllLink="#"
            viewAllText=""
            onAddToCart={handleAddToCart}
          />
        </div>
        
        <BrandStory story={brand.story} />
        
        <section className="brand-page__bundles">
          <div className="brand-page__bundles-header">
            <h2 className="brand-page__bundles-title">Curated Bundles</h2>
            <p className="brand-page__bundles-subtitle">Shop the look with one click.</p>
          </div>
          {/* Bundle placeholder */}
          <div className="brand-page__bundle-card">
            <img src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200" alt="Bundle" className="brand-page__bundle-img" />
            <div className="brand-page__bundle-info">
              <h3>The Newborn Starter Set</h3>
              <p>Includes: 6 Bottles, Sterilizer, Bottle Warmer, and Soothers.</p>
              <button className="brand-page__bundle-btn">Add Bundle to Cart — UGX 149,000</button>
            </div>
          </div>
        </section>

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
    </div>
  );
};

export default BrandPage;

