import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useConvex, useQuery, useMutation, useConvexAuth, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import CheckoutStepper from '../components/checkout/CheckoutStepper';
import CheckoutSkeleton from '../components/checkout/CheckoutSkeleton';
import LocationModal from '../components/checkout/LocationModal';
import RiderTracking from '../components/checkout/RiderTracking';
import ReviewModal from '../components/checkout/ReviewModal';
import PesapalPaymentModal from '../components/checkout/PesapalPaymentModal';
import Toast from '../components/ui/Toast';
import { useCart } from '../context/CartContext';
import { getKampalaETA } from '../utils/deliveryUtils';
import { getCheckoutData } from '../services/api';
import { formatPrice } from '../utils/priceUtils';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import DefaultProductImage from '../components/products/DefaultProductImage';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const convexPlaceOrder = useMutation(api.orders.placeOrder);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const initiatePayment = useAction(api.pesapal.initiatePayment);

  const { cartItems, subtotal, clearCart } = useCart();
  const allProducts = useQuery(api.data.getProducts);
  const [checkoutData, setCheckoutData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Checkout flow state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [lockedETA, setLockedETA] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pesapalRedirectUrl, setPesapalRedirectUrl] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingOrderItems, setPendingOrderItems] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);
  const [showPrefPrompt, setShowPrefPrompt] = useState(false);
  const [tempContactPref, setTempContactPref] = useState('email');
  const [toastConfig, setToastConfig] = useState({
    isOpen: false,
    message: '',
    variant: 'success'
  });

  // Tracks whether CheckoutPage is still mounted, so async/delayed callbacks
  // (e.g. the simulated guest checkout timer) can't act on a page the user has left.
  const isMountedRef = useRef(true);
  const guestConfirmTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (guestConfirmTimerRef.current) {
        clearTimeout(guestConfirmTimerRef.current);
      }
    };
  }, []);

  const queueToast = (message, variant = 'success') => {
    setToastQueue(prev => [...prev, { message, variant }]);
  };

  // Process the toast queue in succession with a smooth transition delay
  useEffect(() => {
    if (!toastConfig.isOpen && toastQueue.length > 0) {
      const timer = setTimeout(() => {
        const nextToast = toastQueue[0];
        setToastConfig({
          isOpen: true,
          message: nextToast.message,
          variant: nextToast.variant || 'success'
        });
        setToastQueue(prev => prev.slice(1));
      }, 150); // Small delay to let the previous toast completely close
      return () => clearTimeout(timer);
    }
  }, [toastConfig.isOpen, toastQueue]);

  // Developer Mode States
  // To enable developer mode for testing mock checkouts locally, uncomment the line below and comment "const isDev = false;":
  // const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isDev = false;
  const [showDevPanel, setShowDevPanel] = useState(false);

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
        // If not logged in, default to standard suggestion
        if (!isAuthenticated && data.delivery && data.delivery.suggestions.length > 0) {
          handleConfirmLocation(data.delivery.suggestions[0]);
        }
      } catch (error) {
        console.error("Error fetching checkout configuration:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  // Auto-fill from user profile details
  useEffect(() => {
    if (user) {
      if (user.momoPhone && !momoPhone) {
        setMomoPhone(user.momoPhone);
      }
      if (user.deliveryLocations && user.deliveryLocations.length > 0) {
        if (!selectedAddress) {
          handleConfirmLocation(user.deliveryLocations[0]);
        }
      } else if (isAuthenticated && checkoutData?.delivery?.suggestions?.length > 0 && !selectedAddress) {
        // Fallback for logged-in users with no saved locations
        handleConfirmLocation(checkoutData.delivery.suggestions[0]);
      }
    }
  }, [user, checkoutData, isAuthenticated, selectedAddress]);

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

  // Developer Mode Helpers
  const handleDevMockConfirm = () => {
    // 1. Mock location/address if not selected
    if (!selectedAddress) {
      const defaultAddr = checkoutData?.delivery?.suggestions?.[0] || {
        name: "Developer Home Office",
        zone: "Kololo"
      };
      setSelectedAddress(defaultAddr);
      const calculatedETA = getKampalaETA(defaultAddr.zone);
      setLockedETA(calculatedETA);
      setRemainingTime(calculatedETA.travelTime);
    }

    // 2. Set mock order details
    const mockOrder = {
      success: true,
      orderId: "dev-mock-" + Math.random().toString(36).substr(2, 9),
      grandTotal: 125000,
      subtotal: 120000,
      discountAmount: 0,
      deliveryFee: 5000,
      items: cartItems.length > 0 ? cartItems.map(item => ({
        productName: item.name,
        size: item.size || "Standard",
        quantity: item.quantity,
        unitPrice: item.price,
        image: item.image,
        stage: item.stage || "Newborn",
        productId: item._id || item.id
      })) : [
        {
          productName: "Premium Organic Cotton Baby Onesie",
          size: "3-6 Months",
          quantity: 2,
          unitPrice: 45000,
          image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=150&q=80",
          stage: "Infant",
          productId: allProducts?.[0]?._id
        },
        {
          productName: "Eco-Friendly Bamboo Baby Wipes",
          size: "Pack of 3",
          quantity: 1,
          unitPrice: 35000,
          image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80",
          stage: "Newborn",
          productId: allProducts?.[1]?._id
        }
      ]
    };

    setPlacedOrderDetails(mockOrder);
    setIsOrderConfirmed(true);
    queueToast("[Developer Mode] Order confirmed using mock transaction successfully!", 'success');
    
    const points = Math.floor(mockOrder.grandTotal / 1000);
    if (points > 0) {
      queueToast(
        `✨ You've earned +${points} Dennan Loyalty Points! ${isAuthenticated ? 'They have been credited to your profile.' : 'Create an account next time to save them.'}`,
        'success'
      );
    }
  };

  const handleDevCartConfirm = () => {
    if (!cartItems || cartItems.length === 0) {
      queueToast("[Developer Mode] Cannot confirm cart: Cart is empty! Add items first or use 'Confirm with Mock Items'.", 'warning');
      return;
    }

    // 1. Mock location if not selected
    if (!selectedAddress) {
      const defaultAddr = checkoutData?.delivery?.suggestions?.[0] || {
        name: "Developer Home Office",
        zone: "Kololo"
      };
      setSelectedAddress(defaultAddr);
      const calculatedETA = getKampalaETA(defaultAddr.zone);
      setLockedETA(calculatedETA);
      setRemainingTime(calculatedETA.travelTime);
    }

    // 2. Build guest-like order details using the actual cart items
    const actualCartOrder = {
      success: true,
      orderId: "dev-cart-" + Math.random().toString(36).substr(2, 9),
      grandTotal: grandTotal,
      subtotal: subtotal,
      discountAmount: discountAmount,
      deliveryFee: deliveryFee,
      items: cartItems.map(item => ({
        productName: item.name,
        size: item.size || "Standard",
        quantity: item.quantity,
        unitPrice: item.price,
        image: item.image,
        stage: item.stage || "Newborn",
        productId: item._id || item.id
      }))
    };

    setPlacedOrderDetails(actualCartOrder);
    setIsOrderConfirmed(true);
    queueToast("[Developer Mode] Actual cart confirmed successfully using mock transaction!", 'success');
    
    const points = Math.floor(grandTotal / 1000);
    if (points > 0) {
      queueToast(
        `✨ You've earned +${points} Dennan Loyalty Points! ${isAuthenticated ? 'They have been credited to your profile.' : 'Create an account next time to save them.'}`,
        'success'
      );
    }
  };

  const handleDevReset = () => {
    setIsOrderConfirmed(false);
    setPlacedOrderDetails(null);
    queueToast("[Developer Mode] Checkout reset to editing state.", 'success');
  };

  // 5. Developer Mode Auto-Confirmation from URL Query Parameter
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mockConfirm') === 'true' || params.get('developerSuccess') === 'true') {
      console.log("[Dev Mode] Auto-confirming checkout via query parameter");
      const timer = setTimeout(() => {
        handleDevMockConfirm();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleConfirmLocation = (address) => {
    setSelectedAddress(address);
    const calculatedETA = getKampalaETA(address.zone);
    setLockedETA(calculatedETA);
    setShowLocationModal(false);
  };

  // Recalculated Shipping Fee
  const deliveryFee = useMemo(() => {
    if (!selectedAddress) return 0;
    const hasTestProduct = cartItems.some(item => item.slug === 'pesapal-test-product');
    if (hasTestProduct) return 0;
    // FREE delivery for Kampala Central / Kololo, otherwise UGX 5,000 flat-rate
    return (selectedAddress.zone === 'Kololo' || selectedAddress.zone === 'Kampala Central') ? 0 : 5000;
  }, [selectedAddress, cartItems]);

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
    if (!cartItems || cartItems.length === 0) {
      queueToast("Your cart is empty! Add items to place an order.", 'danger');
      return;
    }

    if (!selectedAddress) {
      setShowLocationModal(true);
      return;
    }

    setIsProcessing(true);
    console.log('[CheckoutPage] handlePlaceOrder started', { selectedPayment, isAuthenticated });
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
        console.log('[CheckoutPage] convexPlaceOrder result', result);
        if (result.success) {
          // Cart is cleared only once payment is confirmed (see handlePaymentSuccess / fallback below)

          // Open secure Pesapal payment gateway in-page for MOMO and card payments
          if (selectedPayment === 'momo' || selectedPayment === 'card') {
            console.log('[CheckoutPage] initiating payment for order', result.orderId);
            const paymentResult = await initiatePayment({
              orderId: result.orderId,
              frontendUrl: window.location.origin
            });
            console.log('[CheckoutPage] initiatePayment result', paymentResult);
            if (paymentResult && paymentResult.redirectUrl) {
              console.log('[CheckoutPage] opening payment modal with redirectUrl', paymentResult.redirectUrl);
              setPendingOrderId(result.orderId);
              setPendingOrderItems(cartItems.map(item => ({
                productName: item.name,
                size: item.size || "Standard",
                quantity: item.quantity,
                unitPrice: item.price,
                image: item.image,
                stage: item.stage || "Newborn",
                productId: item._id || item.id
              })));
              setPesapalRedirectUrl(paymentResult.redirectUrl);
              setShowPaymentModal(true);
              return;
            } else {
              console.error('[CheckoutPage] initiatePayment returned no redirectUrl, cannot proceed to payment', paymentResult);
              queueToast("We couldn't start the payment process. Please try again.", 'danger');
              return;
            }
          }

          // No online payment step required for this method (e.g. cash on delivery)
          clearCart();
          setPlacedOrderDetails(result);
          setIsOrderConfirmed(true);
          if (isAuthenticated && user && !user.preferredContact) {
            setShowPrefPrompt(true);
          }
          queueToast(`Your order was successfully confirmed. Arriving in ${remainingTime || lockedETA?.travelTime} mins!`, 'success');

          const points = Math.floor(result.grandTotal / 1000);
          if (points > 0) {
            queueToast(`✨ You've earned +${points} Dennan Loyalty Points! They have been credited to your profile.`, 'success');
          }
        }
      } else {
        // Guest checkout flow: simulate order success in order confirmation page while respecting live hydrated prices
        guestConfirmTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return; // user navigated away before the simulated confirmation fired
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
              stage: item.stage || "Newborn",
              productId: item._id || item.id
            }))
          };
          setPlacedOrderDetails(guestResult);
          clearCart(); // clear guest cart local storage
          setIsOrderConfirmed(true);
          queueToast(`Your order was successfully confirmed. Arriving in ${remainingTime || lockedETA?.travelTime} mins!`, 'success');
          
          const points = Math.floor(guestResult.grandTotal / 1000);
          if (points > 0) {
            queueToast(`✨ You've earned +${points} Dennan Loyalty Points! Create an account next time to save them.`, 'success');
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Payment failed:", err);
      alert(err instanceof Error ? err.message : "An error occurred while placing your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (order) => {
    setShowPaymentModal(false);
    clearCart();
    setPlacedOrderDetails({ ...order, items: pendingOrderItems || [] });
    setIsOrderConfirmed(true);
    if (isAuthenticated && user && !user.preferredContact) {
      setShowPrefPrompt(true);
    }
    queueToast(`Your order was successfully confirmed. Arriving in ${remainingTime || lockedETA?.travelTime} mins!`, 'success');

    const points = Math.floor(order.grandTotal / 1000);
    if (points > 0) {
      queueToast(`✨ You've earned +${points} Dennan Loyalty Points! They have been credited to your profile.`, 'success');
    }
  };

  const handlePaymentFailure = () => {
    setShowPaymentModal(false);
    queueToast("Payment was not completed. Please try again.", 'danger');
  };

  const handleSavePref = async () => {
    try {
      setIsProcessing(true);
      await updateProfileMutation({
        preferredContact: tempContactPref
      });
      setShowPrefPrompt(false);
      queueToast("Your communication preference has been successfully updated!", 'success');
    } catch (err) {
      console.error("Failed to save communication preference:", err);
      alert("An error occurred while saving your preference. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <CheckoutSkeleton />;
  }

  // Choose which item lists to display
  const itemsToRender = isOrderConfirmed && placedOrderDetails
    ? placedOrderDetails.items
    : cartItems;

  return (
    <Page noPaddingTop={true} padding="inset" bottomSpacing="loose" maxWidth="container" className="checkout-page-root">
      <Page.Section spacing="tight" className="checkout-header-section">
        <CheckoutStepper currentStep={isOrderConfirmed ? 3 : 2} />
      </Page.Section>

      {!isOrderConfirmed ? (
        <div className="checkout-container">
          <div className="checkout-main">
            {/* Delivery Location Section */}
            <Page.Section className="checkout-section">
              <div className="section-header">
                <Text role="label-md" as="span" color="brand-primary-dark" className="section-number">1</Text>
                <Text role="headline-md" as="h2" className="section-title">Delivery Location</Text>
              </div>

              <Card isHoverable={true} className="delivery-card">
                {selectedAddress ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 'var(--space-4)' }}>
                    <Card.Body>
                      <Text role="title-lg" as="h3" className="delivery-name">{selectedAddress.name}</Text>
                      <Text role="body-sm" as="p" className="delivery-zone">Zone: {selectedAddress.zone}</Text>
                      <Text role="body-sm" as="p" color="tertiary" className="delivery-eta-hint">
                        ⏱ Delivery ETA: <Text role="body-sm" as="strong" color="tertiary">{lockedETA?.travelTime} mins</Text> ({lockedETA?.timeString})
                      </Text>
                    </Card.Body>
                    <Card.Actions>
                      <Button variant="outline-brand" size="sm" onClick={() => setShowLocationModal(true)}>
                        Change
                      </Button>
                    </Card.Actions>
                  </div>
                ) : (
                  <Card.Body align="center">
                    <Text role="body-lg" as="p">Where should we deliver your order?</Text>
                    <Card.Actions align="center">
                      <Button variant="soft" onClick={() => setShowLocationModal(true)}>
                        Select Delivery Address
                      </Button>
                    </Card.Actions>
                  </Card.Body>
                )}
              </Card>
            </Page.Section>

            {/* Payment Method Section */}
            <Page.Section className="checkout-section">
              <div className="section-header">
                <Text role="label-md" as="span" color="brand-primary-dark" className="section-number">2</Text>
                <Text role="headline-md" as="h2" className="section-title">Payment Method</Text>
              </div>

              <div className="payment-options">
                {/* Mobile Money Payment Panel */}
                <Card
                  isHoverable={true}
                  className={`payment-option ${selectedPayment === 'momo' ? 'is-active' : ''}`}
                  style={selectedPayment === 'momo' ? { borderColor: 'var(--color-brand-primary)' } : {}}
                  onClick={() => setSelectedPayment('momo')}
                >
                  <Card.Body style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 'var(--space-5)', padding: 0 }}>
                    <div className={`option-radio ${selectedPayment === 'momo' ? 'checked' : ''}`}>
                      <div className="radio-inner"></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap-xs)', flex: 1 }}>
                      <Text role="title-sm" as="span" className="option-name">Ugandan Mobile Money</Text>
                      <Text role="body-sm" as="span" className="option-desc">Pay instantly using MTN MoMo or Airtel Money.</Text>
                    </div>
                    <div className="option-brand-icons">
                      <Text role="label-sm" as="span" style={{ color: '#000000' }} className="brand-badge brand-badge--mtn">MTN</Text>
                      <Text role="label-sm" as="span" color="white" className="brand-badge brand-badge--airtel">Airtel</Text>
                    </div>
                  </Card.Body>

                  {selectedPayment === 'momo' && (
                    <Card
                      hasBorder={false}
                      hasShadow={false}
                      hasBackground={false}
                      removePaddingHorizontal={true}
                      className="momo-input-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Card.Body>
                        <Text role="label-md" as="span" className="momo-label">Phone Number</Text>
                        <div className="momo-input-wrapper">
                          <div className="momo-prefix">
                            <Text role="body-lg" as="span" className="ug-flag">🇺🇬</Text>
                            <Text role="body-lg" as="span">+256</Text>
                          </div>
                          <input
                            type="tel"
                            className={`momo-input ${momoPhone ? (isValidPhone ? 'is-valid' : 'is-invalid') : ''}`}
                            placeholder="772 123456"
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value.replace(/[^0-9\s]/g, ''))}
                          />
                        </div>
                        {phoneError && <Text role="label-md" as="p" color="support-red" className="momo-error-text">{phoneError}</Text>}
                        <Text role="label-sm" as="p" color="tertiary" className="momo-helper-text">
                          We will push a secure PIN prompt to this number to approve the transaction.
                        </Text>
                      </Card.Body>
                    </Card>
                  )}
                </Card>

                {/* Credit / Debit Card Panel */}
                <Card
                  isHoverable={true}
                  className={`payment-option ${selectedPayment === 'card' ? 'is-active' : ''}`}
                  style={selectedPayment === 'card' ? { borderColor: 'var(--color-brand-primary)' } : {}}
                  onClick={() => setSelectedPayment('card')}
                >
                  <Card.Body style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 'var(--space-5)', padding: 0 }}>
                    <div className={`option-radio ${selectedPayment === 'card' ? 'checked' : ''}`}>
                      <div className="radio-inner"></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap-xs)', flex: 1 }}>
                      <Text role="title-sm" as="span" className="option-name">Credit / Debit Card</Text>
                      <Text role="body-sm" as="span" className="option-desc">Visa, Mastercard.</Text>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Page.Section>
          </div>

          {/* Sidebar and Order Summary Card */}
          <div className="checkout-sidebar">
            <Page.Section className="checkout-sidebar-section">
              <Card className="order-summary-card">
                <Card.Header>
                  <Text role="headline-sm" as="h3" className="summary-title">Order Summary</Text>
                </Card.Header>

                <Card.Body>
                  <div className="summary-rows">
                    <div className="summary-row">
                      <Text role="body-lg" as="span" color="secondary">Subtotal</Text>
                      <Text role="body-lg" as="span" color="secondary">{formatPrice(subtotal)}</Text>
                    </div>

                    {/* Real-time Coupon verification display row */}
                    {appliedCoupon && (
                      <div className="summary-row discount-row">
                        <Text role="body-lg" as="span" color="support-green">Discount ({appliedCoupon.coupon.code})</Text>
                        <Text role="body-lg" as="span" color="support-green">-{formatPrice(discountAmount)}</Text>
                      </div>
                    )}

                    <div className="summary-row">
                      <Text role="body-lg" as="span" color="secondary">Delivery</Text>
                      <Text role="body-lg" as="span" color="secondary">{selectedAddress ? (deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)) : "--"}</Text>
                    </div>

                    <div className="summary-row timer-row">
                      <Text role="body-lg" as="span" color="secondary">Estimated Arrival</Text>
                      {remainingTime !== null ? (
                        <Text role="title-sm" as="span" color="support-green" className="live-timer">{remainingTime} mins</Text>
                      ) : (
                        <Text role="body-lg" as="span" color="tertiary" className="ghost-timer">-- mins</Text>
                      )}
                    </div>

                    <div className="summary-row total">
                      <Text role="title-sm" as="span" color="primary">Total</Text>
                      <Text role="title-sm" as="span" color="primary">{formatPrice(grandTotal)}</Text>
                    </div>
                  </div>

                  {/* Promo Coupon Card (nested, automatically borderless) */}
                  <Card
                    hasShadow={false}
                    hasBackground={true}
                    className="coupon-card"
                  >
                    <Card.Header>
                      <Text role="label-md" as="h4" color="primary" className="coupon-title">Promo / Referral Code</Text>
                    </Card.Header>
                    <Card.Body style={{ padding: 0 }}>
                      <div className="coupon-input-group">
                        <input
                          type="text"
                          placeholder="e.g. MOMMYUG"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          disabled={appliedCoupon !== null || isValidatingCoupon}
                        />
                        {!appliedCoupon ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleApplyCoupon}
                            loading={isValidatingCoupon}
                            disabled={!couponCode}
                          >
                            Apply
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAppliedCoupon(null);
                              setCouponCode('');
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {couponError && <Text role="label-md" as="p" color="support-red" className="coupon-error-text">{couponError}</Text>}
                      {appliedCoupon && (
                        <Text role="label-md" as="p" color="support-green" className="coupon-success-text">
                          ✓ Code applied! Saved {formatPrice(discountAmount)}
                        </Text>
                      )}
                    </Card.Body>
                  </Card>
                </Card.Body>

                <Button
                  variant="action"
                  fullWidth
                  loading={isProcessing}
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddress || (selectedPayment === 'momo' && !isValidPhone)}
                >
                  Complete Payment
                </Button>

                <Text role="label-sm" as="p" color="tertiary" className="secure-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Secure encrypted payment
                </Text>
              </Card>
            </Page.Section>
          </div>
        </div>
      ) : (
        /* Order Confirmed View */
        <div className="confirmation-view">
          {!showTracking ? (
            <>
              <Page.Section className="confirmation-hero-section">
                <Card className="confirmation-hero" hasBorder={false} hasShadow={false} hasBackground={false}>
                  <Card.Body align="center">
                    <div className="celebration-badge">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <Text role="headline-lg" as="h1" >Order Confirmed</Text>
                    <Text role="title-sm" as="p" color="secondary" className="confirmation-subtitle">
                      We're preparing your order for {selectedAddress?.zone || 'Kampala'}.
                    </Text>
                    <Text role="body-sm" as="p" color="tertiary" style={{ marginTop: '0.5rem' }}>
                      Order ID: <Text role="body-sm" as="strong" color="tertiary">{placedOrderDetails?.orderId}</Text>
                    </Text>

                    {/* Nested expected arrival card (automatically borderless) */}
                    <Card className="eta-card" hasShadow={true} hasBackground={true} style={{ margin: 'var(--space-12) auto 0' }}>
                      <Card.Body align="center">
                        <Text role="label-sm" as="span" color="brand-primary" className="eta-label">Expected Arrival</Text>
                        <Text role="headline-lg" as="div" color="anchor" className="eta-time">{lockedETA?.timeString}</Text>
                        <Text role="body-lg" as="p" color="secondary" className="eta-countdown">
                          Our rider is dispatched. Arriving in approximately {remainingTime} minutes.
                        </Text>
                      </Card.Body>
                    </Card>
                  </Card.Body>
                </Card>
              </Page.Section>

              <div className="confirmation-content">
                <Card className="order-summary-section">
                  <Card.Header>
                    <Text role="headline-sm" as="h3" className="section-title">Order Summary</Text>
                  </Card.Header>
                  <Card.Body style={{ padding: 0 }}>
                    <div className="summary-items">
                      {itemsToRender.map((item, index) => {
                        const name = item.productName || item.name;
                        const price = item.unitPrice || item.price;
                        return (
                          <Card
                            key={index}
                            hasBorder={false}
                            hasShadow={false}
                            hasBackground={false}
                            removePadding={true}
                            className="summary-item"
                          >
                            <Card.Body style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-5)' }}>
                              <div className="item-img-wrapper">
                                {item.image ? (
                                  <img src={item.image} alt={name} />
                                ) : (
                                  <DefaultProductImage />
                                )}
                                <Text role="label-sm" as="span" color="white" className={`stage-badge stage--${(item.stage || 'newborn').toLowerCase()}`}>
                                  {item.stage || 'Newborn'}
                                </Text>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap-xs)', flex: 1 }}>
                                <Text role="body-lg" as="span" className="item-name">{name}</Text>
                                <Text role="body-sm" as="span" color="secondary" className="item-meta">
                                  Qty: {item.quantity} • {formatPrice(price)}
                                </Text>
                              </div>
                            </Card.Body>
                          </Card>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>

                <div className="confirmation-actions">
                  <div className="tracking-actions">
                    <Button
                      variant="pill"
                      onClick={() => setShowTracking(true)}
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>}
                    >
                      Track Rider on Map
                    </Button>
                    <Button
                      variant="pill"
                      onClick={() => window.location.href = `tel:${checkoutData?.tracking?.rider?.phone || '+256772000000'}`}
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                    >
                      Contact Delivery Lead
                    </Button>
                  </div>

                  {showPrefPrompt && (
                    <Card className="pref-prompt-card animate-fadeIn" style={{ backgroundColor: 'var(--surface-container-low)', border: '1px solid rgba(211, 80, 151, 0.15)', borderRadius: 'var(--radius-xl)' }}>
                      <Card.Header>
                        <Text role="title-sm" as="h4" color="primary" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>
                          Preferred Contact Channel
                        </Text>
                      </Card.Header>
                      <Card.Body style={{ gap: 'var(--space-4)', padding: '0 var(--space-6) var(--space-6)', display: 'flex', flexDirection: 'column' }}>
                        <Text role="body-md" as="p" color="secondary" style={{ margin: 0 }}>
                          How would you like us to send your order updates and delivery notifications?
                        </Text>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <select
                            value={tempContactPref}
                            onChange={(e) => setTempContactPref(e.target.value)}
                            className="profile-field-input"
                          >
                            <option value="email">Email Address</option>
                            <option value="sms">SMS text</option>
                            <option value="whatsapp">WhatsApp chat</option>
                            <option value="push">Push Notification</option>
                          </select>
                        </div>
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={handleSavePref}
                          style={{ marginTop: 'var(--space-2)', alignSelf: 'flex-start' }}
                        >
                          Save Preference
                        </Button>
                      </Card.Body>
                    </Card>
                  )}

                  <div className="secondary-promos">
                    {checkoutData?.confirmation?.promos?.map(promo => {
                      const isRefer = promo.id === 'refer' || promo.id === 'review';
                      const title = isRefer ? "Leave a Review" : promo.title;
                      const desc = isRefer ? "Share your experience with other parents and earn 50 loyalty points." : promo.desc;
                      const action = isRefer ? "Write a Review →" : promo.action;
                      return (
                        <Card
                          key={promo.id}
                          isHoverable={true}
                          className={`promo-card ${promo.id}`}
                        >
                          <Card.Header>
                            <Text role="title-lg" as="h4">{title}</Text>
                          </Card.Header>
                          <Card.Body>
                            <Text role="body-sm" as="p" color="secondary">{desc}</Text>
                            <Card.Actions>
                              {isRefer ? (
                                <Button variant="link" onClick={() => setShowReviewModal(true)}>
                                  {action}
                                </Button>
                              ) : (
                                <Button variant="link">{action}</Button>
                              )}
                            </Card.Actions>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>

                  <Button variant="pill" fullWidth onClick={() => window.location.href = '/'}>
                    Continue Shopping
                  </Button>
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

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderItems={placedOrderDetails?.items || []}
        user={user}
      />

      <PesapalPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        redirectUrl={pesapalRedirectUrl}
        orderId={pendingOrderId}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />



      <Toast
        isOpen={toastConfig.isOpen}
        message={toastConfig.message}
        variant={toastConfig.variant}
        onClose={() => setToastConfig(prev => ({ ...prev, isOpen: false }))}
        duration={5000}
      />

      {isDev && (
        <div className="dev-tool-floating animate-fadeIn">
          <button
            className="dev-tool-trigger"
            onClick={() => setShowDevPanel(!showDevPanel)}
            title="Developer Helpers"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span>Dev Tools</span>
          </button>

          {showDevPanel && (
            <div className="dev-tool-panel">
              <div className="dev-tool-header">
                <span className="dev-tool-title">
                  🔧 Developer Options
                </span>
                <button
                  onClick={() => setShowDevPanel(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <p className="dev-tool-desc">
                Quickly reach the <strong>Order Confirmed</strong> page without going through the checkout/payment process.
              </p>

              <button
                className="dev-tool-btn primary"
                onClick={() => {
                  handleDevMockConfirm();
                  setShowDevPanel(false);
                }}
              >
                ✨ Confirm with Mock Items
              </button>

              <button
                className="dev-tool-btn"
                onClick={() => {
                  handleDevCartConfirm();
                  setShowDevPanel(false);
                }}
                disabled={cartItems.length === 0}
                style={cartItems.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                🛒 Confirm Actual Cart ({cartItems.length})
              </button>

              {isOrderConfirmed && (
                <button
                  className="dev-tool-btn reset"
                  onClick={() => {
                    handleDevReset();
                    setShowDevPanel(false);
                  }}
                >
                  🔄 Reset Checkout
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Page>
  );
};

export default CheckoutPage;
