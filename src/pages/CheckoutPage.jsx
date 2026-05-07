import React, { useState, useEffect, useMemo } from 'react';
import { useConvex, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import CheckoutStepper from '../components/checkout/CheckoutStepper';
import LocationModal from '../components/checkout/LocationModal';
import RiderTracking from '../components/checkout/RiderTracking';
import Toast from '../components/ui/Toast';
import { useCart } from '../context/CartContext';
import { getKampalaETA } from '../utils/deliveryUtils';
import { getCheckoutData } from '../services/api';
import { formatPrice } from '../utils/priceUtils';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const convexPlaceOrder = useMutation(api.orders.placeOrder);

  const { cartItems, subtotal, clearCart } = useCart();
  const [checkoutData, setCheckoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Checkout flow state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [lockedETA, setLockedETA] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Payment states
  const [selectedPayment, setSelectedPayment] = useState('momo');
  const [momoPhone, setMomoPhone] = useState('');
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Coupon / Promo Code states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Completed order snapshot returned from the backend (or simulated for guests)
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  // 1. Fetch auxiliary static checkout data (delivery zones, rider profile)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCheckoutData();
        setCheckoutData(data);
        // Default address suggestion if available
        if (data.delivery && data.delivery.suggestions.length > 0) {
          handleConfirmLocation(data.delivery.suggestions[0]);
        }
      } catch (error) {
        console.error("Error fetching checkout configuration:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Setup delivery countdown once location is confirmed
  useEffect(() => {
    if (!lockedETA) return;
    
    setRemainingTime(lockedETA.travelTime);
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // 1 minute countdown

    return () => clearInterval(interval);
  }, [lockedETA]);

  // 3. Ugandan Mobile Money phone validation
  useEffect(() => {
    if (selectedPayment !== 'momo') {
      setIsValidPhone(true);
      setPhoneError('');
      return;
    }
    
    const cleanNum = momoPhone.replace(/\s+/g, '');
    if (!cleanNum) {
      setIsValidPhone(false);
      setPhoneError('Please enter your mobile money number.');
      return;
    }

    // RegEx checking for valid MTN/Airtel Uganda mobile ranges
    const isValidUG = /^(77|78|76|70|75|74)\d{7}$/.test(cleanNum);
    if (isValidUG) {
      setIsValidPhone(true);
      setPhoneError('');
    } else {
      setIsValidPhone(false);
      setPhoneError('Must start with 77, 78, 76 (MTN) or 70, 75, 74 (Airtel), followed by 7 digits.');
    }
  }, [momoPhone, selectedPayment]);

  const handleConfirmLocation = (address) => {
    setSelectedAddress(address);
    const calculatedETA = getKampalaETA(address.zone);
    setLockedETA(calculatedETA);
    setShowLocationModal(false);
  };

  // Recalculated Shipping Fee
  const deliveryFee = useMemo(() => {
    if (!selectedAddress) return 0;
    // FREE delivery for Kampala Central / Kololo, otherwise UGX 5,000 flat-rate
    return (selectedAddress.zone === 'Kololo' || selectedAddress.zone === 'Kampala Central') ? 0 : 5000;
  }, [selectedAddress]);

  // Recalculated Coupon savings
  const discountAmount = useMemo(() => {
    return appliedCoupon ? appliedCoupon.discountAmount : 0;
  }, [appliedCoupon]);

  // Recalculated Grand Total
  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + deliveryFee);
  }, [subtotal, discountAmount, deliveryFee]);

  // Real-time Coupon Code verification query trigger
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    setCouponError('');
    
    try {
      const result = await convex.query(api.coupons.checkCoupon, {
        code: couponCode.trim().toUpperCase(),
        cartSubtotal: subtotal
      });

      if (result.valid) {
        setAppliedCoupon(result);
        setCouponError('');
      } else {
        setCouponError(result.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error(err);
      setCouponError('Could not process coupon check.');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Order Placement submission
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setShowLocationModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const orderPayload = {
        paymentMethod: selectedPayment,
        momoPhone: selectedPayment === 'momo' ? `+256${momoPhone.replace(/\s+/g, '')}` : undefined,
        deliveryAddress: {
          name: selectedAddress.name,
          zone: selectedAddress.zone,
        },
        couponCode: appliedCoupon ? appliedCoupon.coupon.code : undefined,
      };

      if (isAuthenticated) {
        // Logged-in users: execute secure backend order transaction and save order to DB
        const result = await convexPlaceOrder(orderPayload);
        if (result.success) {
          setPlacedOrderDetails(result);
          setIsOrderConfirmed(true);
          setShowToast(true);
          clearCart(); // sync frontend local states if needed
        }
      } else {
        // Guest checkout flow: simulate order success in order confirmation page while respecting live hydrated prices
        setTimeout(() => {
          const guestResult = {
            success: true,
            orderId: "guest-" + Math.random().toString(36).substr(2, 9),
            grandTotal: grandTotal,
            subtotal: subtotal,
            discountAmount: discountAmount,
            deliveryFee: deliveryFee,
            items: cartItems.map(item => ({
              productName: item.name,
              size: item.size,
              quantity: item.quantity,
              unitPrice: item.price,
              image: item.image,
              stage: item.stage || "Newborn"
            }))
          };
          setPlacedOrderDetails(guestResult);
          clearCart(); // clear guest cart local storage
          setIsOrderConfirmed(true);
          setShowToast(true);
        }, 1500);
      }
    } catch (err) {
      console.error("Payment failed:", err);
      alert(err instanceof Error ? err.message : "An error occurred while placing your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Loading secure checkout...</p>
      </div>
    );
  }

  // Choose which item lists to display
  const itemsToRender = isOrderConfirmed && placedOrderDetails 
    ? placedOrderDetails.items 
    : cartItems;

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <CheckoutStepper currentStep={isOrderConfirmed ? 3 : 2} />
      </header>

      {!isOrderConfirmed ? (
        <div className="checkout-container">
          <div className="checkout-main">
            {/* Delivery Location Section */}
            <section className="checkout-section">
              <div className="section-header">
                <span className="section-number">1</span>
                <h2 className="section-title">Delivery Location</h2>
              </div>
              
              <div className="delivery-card">
                {selectedAddress ? (
                  <div className="delivery-info">
                    <div className="delivery-details">
                      <h3 className="delivery-name">{selectedAddress.name}</h3>
                      <p className="delivery-zone">Zone: {selectedAddress.zone}</p>
                      <p className="delivery-eta-hint">
                        ⏱ Delivery ETA: <strong>{lockedETA?.travelTime} mins</strong> ({lockedETA?.timeString})
                      </p>
                    </div>
                    <button className="btn-change-location" onClick={() => setShowLocationModal(true)}>
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="delivery-empty">
                    <p>Where should we deliver your order?</p>
                    <button className="btn-add-location" onClick={() => setShowLocationModal(true)}>
                      Select Delivery Address
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Method Section */}
            <section className="checkout-section">
              <div className="section-header">
                <span className="section-number">2</span>
                <h2 className="section-title">Payment Method</h2>
              </div>

              <div className="payment-options">
                {/* Mobile Money Payment Panel */}
                <div 
                  className={`payment-option ${selectedPayment === 'momo' ? 'is-active' : ''} ${selectedPayment === 'momo' ? 'has-momo-container' : ''}`}
                  onClick={() => setSelectedPayment('momo')}
                >
                  <div className="option-radio">
                    <div className="radio-inner"></div>
                  </div>
                  <div className="option-info">
                    <span className="option-name">Ugandan Mobile Money</span>
                    <span className="option-desc">Pay instantly using MTN MoMo or Airtel Money.</span>
                  </div>
                  <div className="option-brand-icons">
                    <span className="brand-badge brand-badge--mtn">MTN</span>
                    <span className="brand-badge brand-badge--airtel">Airtel</span>
                  </div>
                </div>

                {selectedPayment === 'momo' && (
                  <div className="momo-input-container">
                    <span className="momo-label">Phone Number</span>
                    <div className="momo-input-wrapper">
                      <div className="momo-prefix">
                        <span className="ug-flag">🇺🇬</span>
                        <span>+256</span>
                      </div>
                      <input 
                        type="tel" 
                        className={`momo-input ${momoPhone ? (isValidPhone ? 'is-valid' : 'is-invalid') : ''}`}
                        placeholder="772 123456" 
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value.replace(/[^0-9\s]/g, ''))}
                      />
                    </div>
                    {phoneError && <p className="momo-error-text">{phoneError}</p>}
                    <p className="momo-helper-text">
                      We will push a secure PIN prompt to this number to approve the transaction.
                    </p>
                  </div>
                )}

                {/* Credit / Debit Card Panel */}
                <div 
                  className={`payment-option ${selectedPayment === 'card' ? 'is-active' : ''}`}
                  onClick={() => setSelectedPayment('card')}
                >
                  <div className="option-radio">
                    <div className="radio-inner"></div>
                  </div>
                  <div className="option-info">
                    <span className="option-name">Credit / Debit Card</span>
                    <span className="option-desc">Visa, Mastercard.</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar and Order Summary Card */}
          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3 className="summary-title">Order Summary</h3>
              
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                {/* Real-time Coupon verification display row */}
                {appliedCoupon && (
                  <div className="summary-row discount-row">
                    <span>Discount ({appliedCoupon.coupon.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Delivery</span>
                  <span>{selectedAddress ? (deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)) : "--"}</span>
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
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Promo Coupon Card */}
              <div className="coupon-card">
                <h4 className="coupon-title">Promo / Referral Code</h4>
                <div className="coupon-input-group">
                  <input 
                    type="text" 
                    placeholder="e.g. MOMMYUG" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null || isValidatingCoupon}
                  />
                  {!appliedCoupon ? (
                    <button 
                      onClick={handleApplyCoupon} 
                      disabled={!couponCode || isValidatingCoupon}
                    >
                      {isValidatingCoupon ? "..." : "Apply"}
                    </button>
                  ) : (
                    <button 
                      className="btn-remove-coupon" 
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {couponError && <p className="coupon-error-text">{couponError}</p>}
                {appliedCoupon && (
                  <p className="coupon-success-text">
                    ✓ Code applied! Saved {formatPrice(discountAmount)}
                  </p>
                )}
              </div>

              <button 
                className={`btn-place-order ${isProcessing ? 'is-loading' : ''}`}
                onClick={handlePlaceOrder}
                disabled={isProcessing || !selectedAddress || (selectedPayment === 'momo' && !isValidPhone)}
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
        /* Order Confirmed View */
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
                <p style={{ marginTop: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  Order ID: <strong>{placedOrderDetails?.orderId}</strong>
                </p>
                
                <div className="eta-card">
                  <span className="eta-label">Expected Arrival</span>
                  <div className="eta-time">{lockedETA?.timeString}</div>
                  <p className="eta-countdown">Our rider is dispatched. Arriving in approximately {remainingTime} minutes.</p>
                </div>
              </div>

              <div className="confirmation-content">
                <div className="order-summary-section">
                  <h3 className="section-title">Order Summary</h3>
                  <div className="summary-items">
                    {itemsToRender.map((item, index) => {
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

                <div className="confirmation-actions">
                  <div className="tracking-actions">
                    <button className="btn-tracking btn-primary" onClick={() => setShowTracking(true)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Track Rider on Map
                    </button>
                    <button className="btn-contact btn-secondary" onClick={() => window.location.href = `tel:${checkoutData?.tracking?.rider?.phone || '+256772000000'}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Contact Delivery Lead
                    </button>
                  </div>

                  <div className="secondary-promos">
                    {checkoutData?.confirmation?.promos?.map(promo => (
                      <div key={promo.id} className={`promo-card ${promo.id}`}>
                        <h4>{promo.title}</h4>
                        <p>{promo.desc}</p>
                        <button className="text-link">{promo.action}</button>
                      </div>
                    ))}
                  </div>

                  <button className="btn-continue btn-primary full-width" onClick={() => window.location.href = '/'}>
                    Continue Shopping
                  </button>
                </div>
              </div>
            </>
          ) : (
            <RiderTracking 
              initialETA={remainingTime || lockedETA?.travelTime || 18} 
              location={selectedAddress?.zone || 'Kampala'} 
              trackingData={checkoutData?.tracking}
            />
          )}
        </div>
      )}

      <LocationModal 
        isOpen={showLocationModal} 
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleConfirmLocation}
        deliveryData={checkoutData?.delivery}
      />

      <Toast 
        isOpen={showToast} 
        message={`Your order was successfully confirmed. Arriving in ${remainingTime || lockedETA?.travelTime} mins!`} 
        onClose={() => setShowToast(false)}
        duration={5000}
      />
    </div>
  );
};

export default CheckoutPage;
