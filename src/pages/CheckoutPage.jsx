import React, { useState, useEffect } from 'react';
import CheckoutStepper from '../components/checkout/CheckoutStepper';
import LocationModal from '../components/checkout/LocationModal';
import RiderTracking from '../components/checkout/RiderTracking';
import Toast from '../components/ui/Toast';
import { useCart } from '../context/CartContext';
import { getKampalaETA } from '../utils/deliveryUtils';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { cartItems, subtotal } = useCart();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [lockedETA, setLockedETA] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Mock data for order summary if cart is empty
  const displayItems = cartItems.length > 0 ? cartItems.map(item => ({
    ...item,
    stage: item.id % 2 === 0 ? 'Newborn' : 'Toddler'
  })) : [
    { name: "Organic Cotton Onesie", price: "UGX 45,000", quantity: 1, image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200&h=200&fit=crop", stage: "Newborn" },
    { name: "Silicone Teething Ring", price: "UGX 25,000", quantity: 2, image: "https://images.unsplash.com/photo-1604467731651-bb066495818c?w=200&h=200&fit=crop", stage: "Toddler" }
  ];

  // Countdown logic for the locked timer
  useEffect(() => {
    let timer;
    if (remainingTime !== null && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => Math.max(0, prev - 1));
      }, 60000); // Update every minute for simplicity in this demo
    }
    return () => clearInterval(timer);
  }, [remainingTime]);

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsOrderConfirmed(true);
      setShowToast(true);
    }, 1500);
  };

  const handleConfirmLocation = (address, eta) => {
    setSelectedAddress(address);
    setLockedETA(eta);
    setRemainingTime(eta.travelTime);
  };

  const eta = selectedAddress ? getKampalaETA(selectedAddress.zone) : null;

  return (
    <div className="checkout-page">
      <CheckoutStepper currentStepId={isOrderConfirmed ? "confirmation" : "payment"} />
      
      {!isOrderConfirmed ? (
        <div className="checkout-container">
          <div className="checkout-main">
            <section className="checkout-section">
              <div className="section-header">
                <h2 className="section-title">Delivery Location</h2>
                {selectedAddress && (
                  <button className="text-link-btn" onClick={() => setShowLocationModal(true)}>
                    Change
                  </button>
                )}
              </div>
              
              {!selectedAddress ? (
                <div className="location-trigger-card" onClick={() => setShowLocationModal(true)}>
                  <div className="trigger-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="trigger-text">
                    <span className="trigger-title">Enter your delivery address</span>
                    <span className="trigger-desc">Enter your suburb for an instant delivery estimate.</span>
                  </div>
                  <div className="trigger-arrow">→</div>
                </div>
              ) : (
                <div className="selected-address-badge">
                  <span className="badge-dot"></span>
                  <div className="address-info">
                    <span className="address-name">{selectedAddress.name}</span>
                    <span className="address-zone">Kampala • {selectedAddress.zone}</span>
                  </div>
                  <div className="address-eta">
                    <span className="eta-label">Arriving in</span>
                    <span className="eta-value">{remainingTime} mins</span>
                  </div>
                </div>
              )}
            </section>

            <section className="checkout-section">
              <h2 className="section-title">Payment Method</h2>
              <div className="payment-options">
                <div className="payment-option is-active">
                  <div className="option-radio checked"></div>
                  <div className="option-info">
                    <span className="option-name">Mobile Money (MTN/Airtel)</span>
                    <span className="option-desc">Pay instantly using your phone.</span>
                  </div>
                </div>
                <div className="payment-option disabled">
                  <div className="option-radio"></div>
                  <div className="option-info">
                    <span className="option-name">Credit / Debit Card</span>
                    <span className="option-desc">Visa, Mastercard.</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3 className="summary-title">Order Summary</h3>
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>UGX {subtotal > 0 ? (subtotal * 4800).toLocaleString() : "95,000"}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span className="free-text">FREE</span>
                </div>
                <div className="summary-row timer-row">
                  <span>Estimated Arrival</span>
                  {remainingTime !== null ? (
                    <span className="live-timer">{remainingTime} mins</span>
                  ) : (
                    <span className="ghost-timer">-- mins</span>
                  )}
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>UGX {subtotal > 0 ? (subtotal * 4800).toLocaleString() : "95,000"}</span>
                </div>
              </div>

              <button 
                className={`btn-place-order ${isProcessing ? 'is-loading' : ''}`}
                onClick={handlePlaceOrder}
                disabled={isProcessing || !selectedAddress}
              >
                {isProcessing ? 'Processing...' : 'Complete Payment'}
              </button>
              <p className="secure-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Secure encrypted payment
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="confirmation-view">
          {!showTracking ? (
            <>
              <div className="confirmation-hero">
                <div className="celebration-badge">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h1 className="confirmation-title">Order Confirmed</h1>
                <p className="confirmation-subtitle">We're preparing your order for {selectedAddress?.zone || 'Kampala'}.</p>
                
                <div className="eta-card">
                  <span className="eta-label">Expected Arrival</span>
                  <div className="eta-time">{eta?.timeString}</div>
                  <p className="eta-countdown">Our rider is dispatched. Arriving in approximately {eta?.travelTime} minutes.</p>
                </div>
              </div>

              <div className="confirmation-content">
                <div className="order-summary-section">
                  <h3 className="section-title">Order Summary</h3>
                  <div className="summary-items">
                    {displayItems.map((item, index) => (
                      <div key={index} className="summary-item">
                        <div className="item-img-wrapper">
                          <img src={item.image} alt={item.name} />
                          <span className={`stage-badge stage--${item.stage?.toLowerCase()}`}>
                            {item.stage}
                          </span>
                        </div>
                        <div className="item-details">
                          <span className="item-name">{item.name}</span>
                          <span className="item-meta">Qty: {item.quantity} • {item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="confirmation-actions">
                  <div className="tracking-actions">
                    <button className="btn-tracking btn-primary" onClick={() => setShowTracking(true)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Track Rider on Map
                    </button>
                    <button className="btn-contact btn-secondary" onClick={() => window.location.href = 'tel:+256700000000'}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Contact Delivery Lead
                    </button>
                  </div>

                  <div className="secondary-promos">
                    <div className="promo-card profile">
                      <h4>Save Profile</h4>
                      <p>Track your toddler's growth with a personalized dashboard.</p>
                      <button className="text-link">Create Account →</button>
                    </div>
                    <div className="promo-card refer">
                      <h4>Refer a Friend</h4>
                      <p>Send a mom 10,000 UGX off her first order.</p>
                      <button className="text-link">Get Referral Link →</button>
                    </div>
                  </div>

                  <button className="btn-continue btn-primary full-width" onClick={() => window.location.href = '/'}>
                    Continue Shopping
                  </button>
                </div>
              </div>
            </>
          ) : (
            <RiderTracking initialETA={eta?.travelTime || 18} location={selectedAddress?.zone || 'Kampala'} />
          )}
        </div>
      )}

      <LocationModal 
        isOpen={showLocationModal} 
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleConfirmLocation}
      />

      <Toast 
        isOpen={showToast} 
        message={`Your order was successfully confirmed. Arriving in ${eta?.travelTime} mins!`} 
        onClose={() => setShowToast(false)}
        duration={5000}
      />
    </div>
  );
};

export default CheckoutPage;

