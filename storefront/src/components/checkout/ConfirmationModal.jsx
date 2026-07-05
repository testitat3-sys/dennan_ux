import React, { useEffect, useState } from 'react';
import { getKampalaETA } from '../../utils/deliveryUtils';
import { formatPrice } from '../../utils/priceUtils';
import Button from '../ui/Button';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, location, orderItems = [] }) => {
  const [active, setActive] = useState(false);
  const eta = getKampalaETA(location);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`confirmation-overlay ${active ? 'is-active' : ''}`} onClick={onClose}>
      <div className={`confirmation-modal ${active ? 'is-active' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Hero Section */}
        <div className="confirmation-hero">
          <div className="celebration-badge">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 className="confirmation-title">Order Confirmed</h1>
          <p className="confirmation-subtitle">We're preparing your order for {location}.</p>
          
          <div className="eta-card">
            <span className="eta-label">Expected Arrival</span>
            <div className="eta-time">{eta.timeString}</div>
            <p className="eta-countdown">Our rider is dispatched. Arriving in approximately {eta.travelTime} minutes.</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-summary-section">
          <h3 className="section-title">Order Summary</h3>
          <div className="summary-items">
            {orderItems.map((item, index) => {
              const name = item.productName || item.name;
              const price = item.unitPrice || item.price;
              return (
                <div key={index} className="summary-item">
                  <div className="item-img-wrapper">
                    <img src={item.image} alt={name} />
                    <span className={`stage-badge stage--${(item.stage || 'newborn').toLowerCase()}`}>
                      {item.stage || 'Newborn'}
                    </span>
                  </div>
                  <div className="item-details">
                    <span className="item-name">{name}</span>
                    <span className="item-meta">Qty: {item.quantity} • {formatPrice(price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-Time Tracking */}
        <div className="tracking-actions">
          <Button 
            variant="primary"
            fullWidth
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
            iconPosition="left"
          >
            Track Rider on Map
          </Button>
          <Button 
            variant="secondary"
            fullWidth
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
            iconPosition="left"
          >
            Contact Delivery Lead
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="secondary-actions">
          <div className="promo-card profile">
            <h4>Save Profile</h4>
            <p>Track your toddler's growth with a personalized dashboard.</p>
            <Button variant="text-link">Create Account →</Button>
          </div>
          <div className="promo-card refer">
            <h4>Refer a Friend</h4>
            <p>Send a mom 10,000 UGX off her first order.</p>
            <Button variant="text-link">Get Referral Link →</Button>
          </div>
        </div>

        <div className="modal-footer">
          <Button 
            variant="primary"
            fullWidth
            onClick={() => window.location.href = '/'}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

