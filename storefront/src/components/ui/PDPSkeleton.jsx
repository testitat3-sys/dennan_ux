import React from 'react';
import './PDPSkeleton.css';

const PDPSkeleton = () => {
  return (
    <div className="pdp-skeleton">
      <div className="pdp-skeleton__container">
        {/* Breadcrumb Skeleton */}
        <div className="pdp-skeleton__breadcrumbs skeleton-shimmer" />

        <div className="pdp-skeleton__grid">
          {/* Left Column: Gallery Skeleton */}
          <div className="pdp-skeleton__gallery">
            <div className="pdp-skeleton__main-image skeleton-shimmer" />
            <div className="pdp-skeleton__thumbnails">
              <div className="pdp-skeleton__thumbnail skeleton-shimmer" />
              <div className="pdp-skeleton__thumbnail skeleton-shimmer" />
              <div className="pdp-skeleton__thumbnail skeleton-shimmer" />
              <div className="pdp-skeleton__thumbnail skeleton-shimmer" />
            </div>
          </div>

          {/* Right Column: Info Skeleton */}
          <div className="pdp-skeleton__info">
            <div className="pdp-skeleton__brand-row">
              <div className="pdp-skeleton__brand skeleton-shimmer" />
              <div className="pdp-skeleton__sold skeleton-shimmer" />
            </div>
            
            <div>
              <div className="pdp-skeleton__title-line1 skeleton-shimmer" />
              <div className="pdp-skeleton__title-line2 skeleton-shimmer" />
            </div>

            <div className="pdp-skeleton__price-wrap skeleton-shimmer" />

            <div className="pdp-skeleton__age-scale skeleton-shimmer" />

            <div className="pdp-skeleton__tags-list">
              <div className="pdp-skeleton__tag skeleton-shimmer" />
              <div className="pdp-skeleton__tag skeleton-shimmer" />
            </div>

            <div className="pdp-skeleton__urgency skeleton-shimmer" />

            <div className="pdp-skeleton__controls-row">
              <div className="pdp-skeleton__control skeleton-shimmer" />
              <div className="pdp-skeleton__control skeleton-shimmer" />
            </div>

            <div className="pdp-skeleton__actions-row">
              <div className="pdp-skeleton__btn-primary skeleton-shimmer" />
              <div className="pdp-skeleton__btn-secondary skeleton-shimmer" />
            </div>
          </div>
        </div>

        {/* Details Skeleton Section */}
        <div className="pdp-skeleton__details">
          <div className="pdp-skeleton__tabs">
            <div className="pdp-skeleton__tab skeleton-shimmer" />
            <div className="pdp-skeleton__tab skeleton-shimmer" />
            <div className="pdp-skeleton__tab skeleton-shimmer" />
          </div>
          <div>
            <div className="pdp-skeleton__desc-line skeleton-shimmer" style={{ width: '100%' }} />
            <div className="pdp-skeleton__desc-line skeleton-shimmer" style={{ width: '95%' }} />
            <div className="pdp-skeleton__desc-line skeleton-shimmer" style={{ width: '98%' }} />
            <div className="pdp-skeleton__desc-line skeleton-shimmer" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDPSkeleton;
