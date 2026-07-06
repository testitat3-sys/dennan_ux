import React from 'react';
import ProductCardSkeleton from '../products/ProductCardSkeleton';
import SearchStrip from '../home/SearchStrip';
import './MobileHomeSkeleton.css';

const MobileHomeSkeleton = () => {
  return (
    <div className="mobile-home-skeleton" aria-hidden="true">
      {/* 1. Hero Section Skeleton - Content only, no image for mobile */}
      <section className="skel-m-hero">
        <div className="skel-m-hero__title">
          <div className="skel-m-hero__line skeleton-shimmer" style={{ width: '90%' }} />
          <div className="skel-m-hero__line skeleton-shimmer" style={{ width: '75%' }} />
        </div>
        <div className="skel-m-hero__subcopy">
          <div className="skel-m-hero__sub-line skeleton-shimmer" style={{ width: '100%' }} />
          <div className="skel-m-hero__sub-line skeleton-shimmer" style={{ width: '85%' }} />
        </div>
        <div className="skel-m-hero__actions">
          <div className="skel-m-hero__btn-primary skeleton-shimmer" />
          <div className="skel-m-hero__btn-ghost skeleton-shimmer" />
        </div>

        {/* 1b. Heritage / Stats Cards Skeleton */}
        <div className="skel-m-heritage-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skel-m-heritage-card">
              <div className="skel-m-heritage-card__left">
                <div className="skel-m-heritage-card__icon skeleton-shimmer" />
                <div className="skel-m-heritage-card__stat skeleton-shimmer" />
                <div className="skel-m-heritage-card__label skeleton-shimmer" />
              </div>
              <div className="skel-m-heritage-card__right">
                <div className="skel-m-heritage-card__desc skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Interactive Search Strip */}
      <SearchStrip />

      {/* 3. Brands Banner Skeleton */}
      <section className="skel-m-brands">
        <div className="skel-m-brands__header">
          <div className="skel-m-title skeleton-shimmer" style={{ width: '180px', height: '22px' }} />
        </div>
        <div className="skel-m-brands__track">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skel-m-brand-card">
              <div className="skel-m-brand-logo skeleton-shimmer" />
              <div className="skel-m-brand-name skeleton-shimmer" style={{ width: '60px', height: '10px' }} />
            </div>
          ))}
        </div>
      </section>

      {/* 4. Most Loved Product Section Skeleton */}
      <section className="skel-m-section">
        <div className="skel-m-section__header">
          <div className="skel-m-eyebrow skeleton-shimmer" style={{ width: '100px' }} />
          <div className="skel-m-title skeleton-shimmer" style={{ width: '220px', marginTop: '6px' }} />
        </div>
        <div className="skel-m-product-grid">
          {[1, 2].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* 5. Journey Section Skeleton */}
      <section className="skel-m-section">
        <div className="skel-m-section__header">
          <div className="skel-m-eyebrow skeleton-shimmer" style={{ width: '80px' }} />
          <div className="skel-m-title skeleton-shimmer" style={{ width: '160px', marginTop: '6px' }} />
        </div>
        <div className="skel-m-journey-list">
          {[1, 2].map((i) => (
            <div key={i} className="skel-m-journey-card skeleton-shimmer" />
          ))}
        </div>
      </section>

      {/* 6. Tier Section Skeleton */}
      <section className="skel-m-section">
        <div className="skel-m-section__header">
          <div className="skel-m-eyebrow skeleton-shimmer" style={{ width: '90px' }} />
          <div className="skel-m-title skeleton-shimmer" style={{ width: '190px', marginTop: '6px' }} />
        </div>
        <div className="skel-m-tier-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skel-m-tier-card">
              <div className="skel-m-tier-card__image skeleton-shimmer" />
              <div className="skel-m-tier-card__content">
                <div className="skel-m-tier-card__title skeleton-shimmer" style={{ width: '100px', height: '16px' }} />
                <div className="skel-m-tier-card__desc skeleton-shimmer" style={{ width: '150px', height: '10px', marginTop: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MobileHomeSkeleton;
