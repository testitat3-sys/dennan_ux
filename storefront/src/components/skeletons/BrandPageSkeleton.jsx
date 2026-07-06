import React from 'react';
import ProductCardSkeleton from '../products/ProductCardSkeleton';
import Page from '../ui/Page';
import CardGrid from '../ui/CardGrid';
import './PLPSkeleton.css';
import './BrandPageSkeleton.css';

const BrandPageSkeleton = () => {
  return (
    <Page noPaddingTop={true} padding="inset" bottomSpacing="loose" aria-hidden="true" className="brand-page-skel">
      {/* Brand Hero Skeleton — flat background, breadcrumb + title bars only, no photo shimmer */}
      <Page.Section as="header" fullBleed className="brand-hero-skel">
        <div className="brand-hero-skel__breadcrumb skeleton-shimmer" />
        <div className="brand-hero-skel__title skeleton-shimmer" />
      </Page.Section>

      {/* Search Strip Skeleton */}
      <Page.Section className="plp-skel__search-wrap">
        <div className="plp-skel__search-bar skeleton-shimmer" />
      </Page.Section>

      {/* Main content grid */}
      <Page.Section className="plp-skel__container">
        {/* Sidebar Filters Skeleton */}
        <aside className="plp-skel__sidebar">
          <div className="plp-skel__sidebar-inner">
            <div className="plp-skel__filter-group">
              <div className="plp-skel__filter-title skeleton-shimmer" style={{ width: '80px' }} />
              <div className="plp-skel__filter-item skeleton-shimmer" style={{ width: '120px' }} />
              <div className="plp-skel__filter-item skeleton-shimmer" style={{ width: '100px' }} />
              <div className="plp-skel__filter-item skeleton-shimmer" style={{ width: '130px' }} />
            </div>
            <div className="plp-skel__filter-group" style={{ marginTop: '24px' }}>
              <div className="plp-skel__filter-title skeleton-shimmer" style={{ width: '60px' }} />
              <div className="plp-skel__filter-item skeleton-shimmer" style={{ width: '110px' }} />
              <div className="plp-skel__filter-item skeleton-shimmer" style={{ width: '90px' }} />
            </div>
          </div>
        </aside>

        {/* Product Grid Content Skeleton */}
        <section className="plp-skel__content">
          <div className="plp-skel__toolbar">
            <div className="plp-skel__toolbar-left skeleton-shimmer" />
            <div className="plp-skel__toolbar-right skeleton-shimmer" />
          </div>

          <CardGrid columns={3} mobileColumns={2} gap="default" className="plp-skel__grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </CardGrid>
        </section>
      </Page.Section>
    </Page>
  );
};

export default BrandPageSkeleton;
