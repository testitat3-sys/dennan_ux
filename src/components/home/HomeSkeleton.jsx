import React from 'react';
import ProductCardSkeleton from '../ui/ProductCardSkeleton';
import SearchStrip from './SearchStrip';
import './HomeSkeleton.css';

const HomeSkeleton = () => {
  return (
    <div className="home-skeleton" aria-hidden="true">
      {/* 1. Hero Section Skeleton */}
      <section className="skeleton-hero">
        <div className="skeleton-hero__content">
          <div className="skeleton-hero__eyebrow skeleton-shimmer" />
          
          <div className="skeleton-hero__headline">
            <div className="skeleton-hero__headline-line skeleton-shimmer" />
            <div className="skeleton-hero__headline-line skeleton-shimmer" />
          </div>

          <div className="skeleton-hero__subcopy">
            <div className="skeleton-hero__subcopy-line skeleton-shimmer" />
            <div className="skeleton-hero__subcopy-line skeleton-shimmer" />
          </div>

          <div className="skeleton-hero__actions">
            <div className="skeleton-btn-mock skeleton-shimmer" />
            <div className="skeleton-btn-mock skeleton-shimmer" />
          </div>
          
          <div className="skeleton-hero__heritage">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-heritage-card">
                <div className="skeleton-heritage-card__icon skeleton-shimmer" />
                <div className="skeleton-heritage-card__stat skeleton-shimmer" />
                <div className="skeleton-heritage-card__label skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        <div className="skeleton-hero__image-wrap skeleton-shimmer" />
      </section>

      {/* 2. Interactive Search Strip (Rendered fully for instant action!) */}
      <SearchStrip />

      {/* 3. Brands Banner Skeleton */}
      <section className="skeleton-brands-banner">
        <div className="skeleton-brands-banner__header">
          <div className="skeleton-text skeleton-text--eyebrow skeleton-shimmer" />
          <div className="skeleton-text skeleton-text--title skeleton-shimmer" style={{ width: '300px' }} />
        </div>
        
        <div className="skeleton-brands-track-wrap">
          <div className="skeleton-brands-track">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-brand-item">
                <div className="skeleton-brand-logo skeleton-shimmer" />
                <div className="skeleton-brand-name skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Product Section 1 (Most Loved - Scrolling list) */}
      <section className="section">
        <div className="rec-rail__header" style={{ padding: '0 var(--space-8)' }}>
          <div className="section__header">
            <div className="skeleton-text skeleton-text--eyebrow skeleton-shimmer" />
            <div className="skeleton-text skeleton-text--title skeleton-shimmer" />
          </div>
          <div className="skeleton-link skeleton-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
        </div>
        <div className="product-scroll-wrap">
          <div className="product-scroll">
            {[1, 2, 3, 4, 5].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Journey Section (3-column grid) */}
      <section className="section journey-section" style={{ marginTop: 'var(--space-12)' }}>
        <div className="section__header">
          <div className="skeleton-text skeleton-text--eyebrow skeleton-shimmer" />
          <div className="skeleton-text skeleton-text--title skeleton-shimmer" />
          <div className="skeleton-text skeleton-text--subtitle skeleton-shimmer" style={{ marginTop: 'var(--space-2)' }} />
        </div>
        <div className="journey-grid" style={{ marginTop: 'var(--space-8)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-stage-tile skeleton-shimmer" />
          ))}
        </div>
      </section>

      {/* 6. Tier Section (3-column grid) */}
      <section className="section tier-strip" style={{ marginTop: 'var(--space-12)' }}>
        <div className="section__header" style={{ padding: '0 var(--space-8)' }}>
          <div className="skeleton-text skeleton-text--eyebrow skeleton-shimmer" />
          <div className="skeleton-text skeleton-text--title skeleton-shimmer" />
          <div className="skeleton-text skeleton-text--subtitle skeleton-shimmer" style={{ marginTop: 'var(--space-2)' }} />
        </div>
        <div className="tier-grid" style={{ padding: '0 var(--space-8)', marginTop: 'var(--space-8)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-tier-card">
              <div className="skeleton-tier-card__image skeleton-shimmer" />
              <div className="skeleton-tier-card__content">
                <div className="skeleton-tier-card__badge skeleton-shimmer" />
                <div className="skeleton-tier-card__title skeleton-shimmer" />
                <div className="skeleton-tier-card__copy">
                  <div className="skeleton-tier-card__copy-line skeleton-shimmer" />
                  <div className="skeleton-tier-card__copy-line skeleton-shimmer" />
                </div>
                <div className="skeleton-tier-card__cta skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Product Section 2 (Curated Picks - 4-column grid) */}
      <section className="section" style={{ marginTop: 'var(--space-12)' }}>
        <div className="rec-rail__header" style={{ padding: '0 var(--space-8)' }}>
          <div className="section__header">
            <div className="skeleton-text skeleton-text--eyebrow skeleton-shimmer" />
            <div className="skeleton-text skeleton-text--title skeleton-shimmer" />
          </div>
          <div className="skeleton-link skeleton-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
        </div>
        <div style={{ padding: '0 var(--space-8)', marginTop: 'var(--space-4)' }}>
          <div className="product-grid">
            {[1, 2, 3, 4].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Reels Section */}
      <section className="section reels-section" style={{ marginTop: 'var(--space-12)' }}>
        <div className="reels-section__header-row" style={{ padding: '0 var(--space-8)' }}>
          <div className="section__header">
            <div className="skeleton-text skeleton-text--title skeleton-shimmer" style={{ width: '250px' }} />
            <div className="skeleton-text skeleton-text--subtitle skeleton-shimmer" style={{ width: '200px', height: '14px', marginTop: 'var(--space-1)' }} />
          </div>
        </div>
        <div className="reels-carousel-container" style={{ padding: '0 var(--space-8)' }}>
          <div className="reels-carousel">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-reel-card skeleton-shimmer" />
            ))}
          </div>
        </div>
      </section>

      {/* 9. Trust Strip */}
      <section className="skeleton-trust-strip">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-trust-item">
            <div className="skeleton-trust-icon skeleton-shimmer" />
            <div className="skeleton-trust-text">
              <div className="skeleton-trust-title skeleton-shimmer" />
              <div className="skeleton-trust-sub skeleton-shimmer" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default HomeSkeleton;
