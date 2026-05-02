import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BrandHeader from '../components/brand/BrandHeader';
import StageNavRail from '../components/brand/StageNavRail';
import BrandStory from '../components/brand/BrandStory';
import ProductSection from '../components/home/ProductSection';
import SearchStrip from '../components/home/SearchStrip';
import { brands } from '../data/brandData';
import './BrandPage.css';

const BrandPage = () => {
  const { brandId } = useParams();
  const [brand, setBrand] = useState(null);
  const [activeStage, setActiveStage] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    // Get brand data
    const data = brands[brandId] || brands['tommee-tippee'];
    setBrand(data);
    setFilteredProducts(data.products);
  }, [brandId]);

  useEffect(() => {
    if (!brand) return;
    
    if (activeStage === 'all') {
      setFilteredProducts(brand.products);
    } else {
      setFilteredProducts(brand.products.filter(p => p.stage === activeStage));
    }
  }, [activeStage, brand]);

  if (!brand) return <div className="brand-loading">Loading Brand Experience...</div>;

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
              <button className="brand-page__bundle-btn">Add Bundle to Cart — £149.00</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BrandPage;
