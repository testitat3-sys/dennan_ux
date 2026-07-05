import React from 'react';
import CheckoutStepper from './CheckoutStepper';
import './CheckoutSkeleton.css';

const CheckoutSkeleton = () => {
  return (
    <div className="checkout-page checkout-skeleton-page" aria-hidden="true">
      <header className="checkout-header">
        <CheckoutStepper currentStep={2} />
      </header>

      <div className="checkout-container">
        <div className="checkout-main">
          {/* Section 1: Delivery Placeholder */}
          <div className="checkout-section">
            <div className="section-header">
              <div className="skeleton-number skeleton-shimmer" />
              <div className="skeleton-title-md skeleton-shimmer" style={{ width: '180px' }} />
            </div>
            <div className="skeleton-card skeleton-shimmer" style={{ height: '140px' }} />
          </div>

          {/* Section 2: Payment Placeholder */}
          <div className="checkout-section">
            <div className="section-header">
              <div className="skeleton-number skeleton-shimmer" />
              <div className="skeleton-title-md skeleton-shimmer" style={{ width: '160px' }} />
            </div>
            <div className="skeleton-payment-options">
              <div className="skeleton-card skeleton-shimmer" style={{ height: '80px' }} />
              <div className="skeleton-card skeleton-shimmer" style={{ height: '80px' }} />
            </div>
          </div>
        </div>

        {/* Sidebar: Order Summary Placeholder */}
        <div className="checkout-sidebar">
          <div className="skeleton-sidebar-card skeleton-shimmer">
            <div className="skeleton-title-sm skeleton-shimmer" style={{ width: '120px', marginBottom: '2rem' }} />
            <div className="skeleton-rows">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-row">
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '80px' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '60px' }} />
                </div>
              ))}
            </div>
            <div className="skeleton-divider" />
            <div className="skeleton-row" style={{ marginTop: '1rem' }}>
              <div className="skeleton-line skeleton-shimmer" style={{ width: '100px', height: '24px' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '80px', height: '24px' }} />
            </div>
            <div className="skeleton-button-lg skeleton-shimmer" style={{ marginTop: '2.5rem' }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: '140px', height: '12px', margin: '1rem auto 0' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSkeleton;
