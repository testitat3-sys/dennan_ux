import React from 'react';
import './ProductCardSkeleton.css';

const ProductCardSkeleton = ({ className = '' }) => {
  return (
    <article className={`product-card product-card--skeleton ${className}`} aria-hidden="true">
      {/* 1:1 Image Placeholder */}
      <div className="product-card__image product-card__image--skeleton skeleton-shimmer">
        <div className="skeleton-badge-mini skeleton-shimmer" />
      </div>
      
      {/* Card Details Padding Container */}
      <div className="product-card__info product-card__info--skeleton">
        {/* Category/Tier small label */}
        <div className="skeleton-tier skeleton-shimmer" />
        
        {/* Dual-line product name placeholder (90% & 60% widths) */}
        <div className="skeleton-title skeleton-title--1 skeleton-shimmer" />
        <div className="skeleton-title skeleton-title--2 skeleton-shimmer" />
        
        {/* Price row container with slightly thicker price pill */}
        <div className="product-card__price-row product-card__price-row--skeleton">
          <div className="skeleton-price skeleton-shimmer" />
        </div>
        
        {/* Full-width Add to Cart button placeholder */}
        <div className="skeleton-button skeleton-shimmer" />
      </div>
    </article>
  );
};

export default ProductCardSkeleton;
