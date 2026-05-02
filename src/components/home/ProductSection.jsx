import React from 'react';
import ProductCard from '../ui/ProductCard';

const ProductSection = ({ title, eyebrow, subtitle, products, viewAllLink, viewAllText = 'View all', isScroll = false }) => {
  return (
    <section className="section" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>
      <div className="rec-rail__header">
        <div className="section__header">
          {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
          <h2 className="section__title" id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>{title}</h2>
          {subtitle && <p className="section__subtitle">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <a href={viewAllLink} className="btn-ghost">
            {viewAllText}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        )}
      </div>

      <div className={isScroll ? 'product-scroll-wrap' : ''}>
        <div className={isScroll ? 'product-scroll' : 'product-grid'}>
          {products.map((product, i) => (
            <ProductCard key={i} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
