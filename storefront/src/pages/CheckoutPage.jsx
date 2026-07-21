import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useConvex, useQuery, useMutation, useConvexAuth, useAction } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../hooks/useTrackedQuery';
import CheckoutStepper from '../components/checkout/CheckoutStepper';
import CheckoutSkeleton from '../components/checkout/CheckoutSkeleton';
import LocationModal from '../components/checkout/LocationModal';
import RiderTracking from '../components/checkout/RiderTracking';
import ReviewModal from '../components/checkout/ReviewModal';
import PesapalPaymentModal from '../components/checkout/PesapalPaymentModal';
import OnboardingModal from '../components/ui/OnboardingModal';
import Toast from '../components/ui/Toast';
import { useCart } from '../context/CartContext';
import { getCheckoutData } from '../services/api';
import { formatPrice, formatPriceString } from '../utils/priceUtils';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import DefaultProductImage from '../components/products/DefaultProductImage';
import { Check, Settings, Sparkles as SparklesIcon, RotateCcw, ShoppingCart, Clock, Users, MoreHorizontal, Banknote } from 'lucide-react';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const convexPlaceOrder = useMutation(api.orders.placeOrder);
  const placeGuestOrder = useMutation(api.orders.placeGuestOrder);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const submitReferralSource = useMutation(api.referralSources.submitReferralSource);
  const initiatePayment = useAction(api.pesapal.initiatePayment);

  const { cartItems, subtotal, clearCart } = useCart();
  const [checkoutData, setCheckoutData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Checkout flow state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [lockedETA, setLockedETA] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
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
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const [selectedReferralSource, setSelectedReferralSource] = useState(null);
  const [otherReferralText, setOtherReferralText] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    isOpen: false,
    message: '',
    variant: 'success'
  });

  // Validation States
  const [addressError, setAddressError] = useState('');
  const [guestNameError, setGuestNameError] = useState('');
  const [guestEmailError, setGuestEmailError] = useState('');
  const [guestPhoneError, setGuestPhoneError] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // Form refs for scrolling & focusing
  const addressSectionRef = useRef(null);
  const guestNameRef = useRef(null);
  const guestEmailRef = useRef(null);
  const guestPhoneRef = useRef(null);
  const momoPhoneRef = useRef(null);
  const referralPromptRef = useRef(null);

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
  // Only used by the dev-mode mock order confirmation below — gated behind
  // isDev so real checkouts don't pay for a full-catalog scan they never use.
  const allProducts = useTrackedQuery(api.data.getProducts, isDev ? {} : 'skip', 20);

  // Payment states
  const [selectedPayment, setSelectedPayment] = useState('momo');
  const [momoPhone, setMomoPhone] = useState('');
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Guest contact details (only collected/required when !isAuthenticated)
  const [guestName, setGuestName] = useState(() => localStorage.getItem('dennan_guest_name') || '');
  const [guestEmail, setGuestEmail] = useState(() => localStorage.getItem('dennan_guest_email') || '');
  const [guestPhone, setGuestPhone] = useState(() => localStorage.getItem('dennan_guest_phone') || '');

  // Coupon / Promo Code states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Completed order snapshot returned from the backend
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  // Live fulfillment status for the just-placed order (works for guests too — the
  // orderId itself is the capability token, no auth required).
  const activeOrderId = placedOrderDetails?.orderId || pendingOrderId;
  const orderTracking = useQuery(
    api.orders.getOrderTrackingStatus,
    activeOrderId ? { orderId: activeOrderId } : "skip"
  );

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

  // Prompt for "how did you know about us?" once per confirmed order (guest or authenticated) and scroll to it.
  useEffect(() => {
    if (isOrderConfirmed) {
      setShowReferralPrompt(true);
      const timer = setTimeout(() => {
        referralPromptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOrderConfirmed]);

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

  useEffect(() => {
    localStorage.setItem('dennan_guest_name', guestName);
  }, [guestName]);

  useEffect(() => {
    localStorage.setItem('dennan_guest_email', guestEmail);
  }, [guestEmail]);

  useEffect(() => {
    localStorage.setItem('dennan_guest_phone', guestPhone);
  }, [guestPhone]);

  // Guest phone number lives under "Your Details" regardless of payment method, and
  // doubles as the mobile money number. Prefill whichever field is empty from the
  // other when the shopper switches payment methods, without clobbering an edit.
  useEffect(() => {
    if (isAuthenticated) return;
    if (selectedPayment === 'momo') {
      if (!momoPhone && guestPhone) setMomoPhone(guestPhone);
    } else if (!guestPhone && momoPhone) {
      setGuestPhone(momoPhone);
    }
  }, [selectedPayment, isAuthenticated]);

  const isValidUgPhone = (num) => /^(77|78|76|70|75|74)\d{7}$/.test((num || '').replace(/\s+/g, ''));

  // Guest contact form validity: name, email, and phone are always required,
  // regardless of payment method.
  const isGuestFormValid = () => {
    if (isAuthenticated) return true;
    const nameOk = guestName.trim().length > 0;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
    const phoneOk = isValidUgPhone(guestPhone) && (selectedPayment !== 'momo' || isValidPhone);
    return nameOk && emailOk && phoneOk;
  };

  // Developer Mode Helpers
  const handleDevMockConfirm = () => {
    // 1. Mock location/address if not selected
    if (!selectedAddress) {
      const defaultAddr = checkoutData?.delivery?.suggestions?.[0] || {
        name: "Developer Home Office",
        zone: "Kololo",
        deliveryFee: 5000,
      };
      setSelectedAddress(defaultAddr);
      const mockEta = formatEta(25);
      setLockedETA(mockEta);
      setRemainingTime(mockEta.travelTime);
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
        `You've earned +${points} Dennan Loyalty Points! ${isAuthenticated ? 'They have been credited to your profile.' : 'Create an account next time to save them.'}`,
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
        zone: "Kololo",
        deliveryFee: 5000,
      };
      setSelectedAddress(defaultAddr);
      const mockEta = formatEta(25);
      setLockedETA(mockEta);
      setRemainingTime(mockEta.travelTime);
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
        `You've earned +${points} Dennan Loyalty Points! ${isAuthenticated ? 'They have been credited to your profile.' : 'Create an account next time to save them.'}`,
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

  // Fetches the authoritative fee/distance/ETA quote from the backend. Never trust a
  // client-computed fee — this is the same calculation `placeOrder` re-verifies server-side.
  const fetchDeliveryQuote = async (address) => {
    if (address.lat != null && address.lng != null) {
      return await convex.query(api.delivery.getDeliveryQuote, {
        lat: address.lat,
        lng: address.lng,
        addressText: address.name,
        itemCount: cartItems.length,
      });
    }
    // Legacy saved address with no coordinates on file
    return await convex.query(api.delivery.getDeliveryQuoteByName, {
      zoneOrLandmarkName: address.zone || address.name,
      itemCount: cartItems.length,
    });
  };

  const formatEta = (etaMinutes) => ({
    travelTime: etaMinutes,
    timeString: new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const handleConfirmLocation = async (address, quoteArg) => {
    const quote = quoteArg || await fetchDeliveryQuote(address);
    if (!quote || quote.outOfBounds) {
      queueToast("Sorry, this location is out of our delivery range.", 'danger');
      return;
    }
    setSelectedAddress({
      ...address,
      zone: quote.zone,
      distanceKm: quote.distanceKm,
      deliveryFee: quote.deliveryFee,
      etaMinutes: quote.etaMinutes,
    });
    setLockedETA(formatEta(quote.etaMinutes));
    setShowLocationModal(false);
  };

  // Recalculated Shipping Fee: the authoritative value already lives on selectedAddress
  // (from the backend quote), except test/developer products always ship free.
  const deliveryFee = useMemo(() => {
    if (!selectedAddress) return 0;
    const hasTestProduct = cartItems.some(item => item.slug === 'pesapal-test-product' || item.slug === 'developer-product');
    if (hasTestProduct) return 0;
    return selectedAddress.deliveryFee ?? 0;
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

  // Submits an already-created order to Pesapal and opens the in-page payment
  // modal. Shared by both the authenticated and guest checkout paths, since
  // both always pay via momo/card once they have a real orderId.
  const initiatePaymentAndOpenModal = async (orderId, items) => {
    console.log('[CheckoutPage] initiating payment for order', orderId);
    const paymentResult = await initiatePayment({
      orderId,
      frontendUrl: window.location.origin
    });
    console.log('[CheckoutPage] initiatePayment result', paymentResult);
    if (paymentResult && paymentResult.redirectUrl) {
      console.log('[CheckoutPage] opening payment modal with redirectUrl', paymentResult.redirectUrl);
      setPendingOrderId(orderId);
      setPendingOrderItems(items);
      setPesapalRedirectUrl(paymentResult.redirectUrl);
      setShowPaymentModal(true);
      return true;
    }
    console.error('[CheckoutPage] initiatePayment returned no redirectUrl, cannot proceed to payment', paymentResult);
    queueToast("We couldn't start the payment process. Please try again.", 'danger');
    return false;
  };

  const validateForm = () => {
    let isValid = true;
    let firstErrorRef = null;
    let firstErrorMessage = '';

    // 1. Delivery Address
    if (!selectedAddress) {
      setAddressError('Please select a delivery location.');
      if (isValid) {
        firstErrorRef = addressSectionRef;
        firstErrorMessage = 'Please select a delivery location.';
      }
      isValid = false;
    } else {
      setAddressError('');
    }

    // Guest details validation
    if (!isAuthenticated) {
      // 2. Guest Name
      if (!guestName.trim()) {
        setGuestNameError('Please enter your name.');
        if (isValid) {
          firstErrorRef = guestNameRef;
          firstErrorMessage = 'Please enter your name.';
        }
        isValid = false;
      } else {
        setGuestNameError('');
      }

      // 3. Guest Email
      if (!guestEmail.trim()) {
        setGuestEmailError('Please enter your email address.');
        if (isValid) {
          firstErrorRef = guestEmailRef;
          firstErrorMessage = 'Please enter your email address.';
        }
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        setGuestEmailError('Please enter a valid email address.');
        if (isValid) {
          firstErrorRef = guestEmailRef;
          firstErrorMessage = 'Please enter a valid email address.';
        }
        isValid = false;
      } else {
        setGuestEmailError('');
      }

      // 4. Guest Phone (always required)
      const cleanPhone = guestPhone.replace(/\s+/g, '');
      if (!cleanPhone) {
        setGuestPhoneError('Please enter your phone number.');
        if (isValid) {
          firstErrorRef = guestPhoneRef;
          firstErrorMessage = 'Please enter your phone number.';
        }
        isValid = false;
      } else if (!isValidUgPhone(guestPhone)) {
        setGuestPhoneError('Must start with 77, 78, 76 (MTN) or 70, 75, 74 (Airtel), followed by 7 digits.');
        if (isValid) {
          firstErrorRef = guestPhoneRef;
          firstErrorMessage = 'Please enter a valid Ugandan phone number.';
        }
        isValid = false;
      } else {
        setGuestPhoneError('');
      }
    }

    // 5. Mobile Money Phone
    if (selectedPayment === 'momo') {
      const cleanNum = momoPhone.replace(/\s+/g, '');
      if (!cleanNum) {
        setPhoneError('Please enter your mobile money number.');
        if (isValid) {
          firstErrorRef = momoPhoneRef;
          firstErrorMessage = 'Please enter your mobile money number.';
        }
        isValid = false;
      } else {
        const isValidUG = /^(77|78|76|70|75|74)\d{7}$/.test(cleanNum);
        if (!isValidUG) {
          setPhoneError('Must start with 77, 78, 76 (MTN) or 70, 75, 74 (Airtel), followed by 7 digits.');
          if (isValid) {
            firstErrorRef = momoPhoneRef;
            firstErrorMessage = 'Must start with 77, 78, 76 (MTN) or 70, 75, 74 (Airtel), followed by 7 digits.';
          }
          isValid = false;
        } else {
          setPhoneError('');
        }
      }
    }

    if (!isValid) {
      setShowErrors(true);
      if (firstErrorMessage) {
        queueToast(firstErrorMessage, 'danger');
      }
      
      if (firstErrorRef && firstErrorRef.current) {
        firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          firstErrorRef.current?.focus?.();
        }, 100);
      }
    }

    return isValid;
  };

  // Order Placement submission
  const handlePlaceOrder = async () => {
    if (!cartItems || cartItems.length === 0) {
      queueToast("Your cart is empty! Add items to place an order.", 'danger');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    const isCodOrder = selectedPayment === 'cod';
    console.log('[CheckoutPage] handlePlaceOrder started', { selectedPayment, isAuthenticated, isCodOrder });
    try {
      const deliveryAddress = {
        name: selectedAddress.name,
        zone: selectedAddress.zone,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        distance: selectedAddress.distanceKm,
      };
      const appliedCouponCode = appliedCoupon ? appliedCoupon.coupon.code : undefined;
      const momoPhoneFormatted = selectedPayment === 'momo' ? `+256${momoPhone.replace(/\s+/g, '')}` : undefined;

      const orderItemsForModal = cartItems.map(item => ({
        productName: item.name,
        size: item.size || "Standard",
        quantity: item.quantity,
        unitPrice: item.price,
        image: item.image,
        stage: item.stage || "Newborn",
        productId: item._id || item.id
      }));

      if (isAuthenticated) {
        // Logged-in users: execute secure backend order transaction and save order to DB
        const result = await convexPlaceOrder({
          paymentMethod: selectedPayment,
          momoPhone: momoPhoneFormatted,
          deliveryAddress,
          couponCode: appliedCouponCode,
        });
        console.log('[CheckoutPage] convexPlaceOrder result', result);
        if (result.success) {
          if (isCodOrder) {
            // COD: skip Pesapal, confirm order immediately
            clearCart();
            setPlacedOrderDetails({ ...result, items: orderItemsForModal, paymentMethod: 'cod' });
            setIsOrderConfirmed(true);
            queueToast(`Order placed! Please have ${formatPrice(result.grandTotal)} ready for cash payment on delivery.`, 'success');
            return;
          }
          // Cart is cleared only once payment is confirmed (see handlePaymentSuccess)
          const opened = await initiatePaymentAndOpenModal(result.orderId, orderItemsForModal);
          if (opened) return;
        }
      } else {
        // Guest checkout: real order + real Pesapal payment, no account required.
        const guestContactPhone = selectedPayment === 'momo' ? momoPhone : guestPhone;
        const result = await placeGuestOrder({
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: `+256${guestContactPhone.replace(/\s+/g, '')}`,
          items: cartItems.map(item => ({
            productId: item._id || item.id,
            quantity: item.quantity,
            size: item.size,
          })),
          paymentMethod: selectedPayment,
          momoPhone: momoPhoneFormatted,
          deliveryAddress,
          couponCode: appliedCouponCode,
        });
        console.log('[CheckoutPage] placeGuestOrder result', result);
        if (result.success) {
          if (isCodOrder) {
            // COD: skip Pesapal, confirm order immediately
            clearCart();
            setPlacedOrderDetails({ ...result, items: orderItemsForModal, paymentMethod: 'cod' });
            setIsOrderConfirmed(true);
            queueToast(`Order placed! Please have ${formatPrice(result.grandTotal)} ready for cash payment on delivery.`, 'success');
            return;
          }
          const opened = await initiatePaymentAndOpenModal(result.orderId, orderItemsForModal);
          if (opened) return;
        }
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
      queueToast(`You've earned +${points} Dennan Loyalty Points! They have been credited to your profile.`, 'success');
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

  const handleSubmitReferralSource = async (source) => {
    if (source === 'other' && !otherReferralText.trim()) {
      setSelectedReferralSource(source);
      return;
    }
    setSelectedReferralSource(source);
    setIsSubmittingReferral(true);
    try {
      await submitReferralSource({
        source,
        otherDetail: source === 'other' ? otherReferralText.trim() : undefined,
        orderId: activeOrderId || undefined,
      });
      setShowReferralPrompt(false);
      queueToast("Thanks for letting us know!", 'success');
    } catch (err) {
      console.error("Failed to save referral source:", err);
      queueToast("Couldn't save your answer. Please try again.", 'danger');
    } finally {
      setIsSubmittingReferral(false);
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
                          <Check size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          Code applied! Saved {formatPrice(discountAmount)}
                        </Text>
                      )}
                    </Card.Body>
                  </Card>
                </Card.Body>
              </Card>
            </Page.Section>
          </div>

          <div className="checkout-main">
            {/* Delivery Location Section */}
            <div ref={addressSectionRef}>
              <Page.Section className="checkout-section">
                <div className="section-header">
                  <Text role="label-md" as="span" color="brand-primary-dark" className="section-number">1</Text>
                  <Text role="headline-md" as="h2" className="section-title">Delivery Location</Text>
                </div>

                <Card isHoverable={true} className={`delivery-card ${showErrors && addressError ? 'address-card-error' : ''}`}>
                  {selectedAddress ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 'var(--space-4)' }}>
                      <Card.Body>
                        <Text role="title-lg" as="h3" className="delivery-name">{selectedAddress.name}</Text>
                        <Text role="body-sm" as="p" className="delivery-zone">Zone: {selectedAddress.zone}</Text>
                        <Text role="body-sm" as="p" color="tertiary" className="delivery-eta-hint">
                          <Clock size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          Delivery ETA: <Text role="body-sm" as="strong" color="tertiary">{lockedETA?.travelTime} mins</Text> ({lockedETA?.timeString})
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
                {showErrors && addressError && (
                  <Text role="label-md" as="p" color="support-red" style={{ marginTop: 'var(--space-2)', display: 'block' }}>
                    {addressError}
                  </Text>
                )}
              </Page.Section>
            </div>

            {/* Guest Contact Details Section (unauthenticated shoppers only) */}
            {!isAuthenticated && (
              <Page.Section className="checkout-section">
                <div className="section-header">
                  <Text role="label-md" as="span" color="brand-primary-dark" className="section-number">2</Text>
                  <Text role="headline-md" as="h2" className="section-title">Your Details</Text>
                </div>

                <Card isHoverable={false} className="guest-contact-card">
                  <Card.Body style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <Text role="label-md" as="span" className="momo-label">Name</Text>
                      <div className={`momo-input-wrapper ${showErrors && guestNameError ? 'is-invalid' : ''}`}>
                        <input
                          ref={guestNameRef}
                          type="text"
                          className="momo-input"
                          placeholder="Jane Doe"
                          value={guestName}
                          onChange={(e) => {
                            setGuestName(e.target.value);
                            if (guestNameError) setGuestNameError('');
                          }}
                        />
                      </div>
                      {showErrors && guestNameError && (
                        <Text role="label-md" as="p" color="support-red" style={{ marginTop: 'var(--space-1)' }}>
                          {guestNameError}
                        </Text>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <Text role="label-md" as="span" className="momo-label">Email Address</Text>
                      <div className={`momo-input-wrapper ${showErrors && guestEmailError ? 'is-invalid' : ''}`}>
                        <input
                          ref={guestEmailRef}
                          type="email"
                          className="momo-input"
                          placeholder="jane@example.com"
                          value={guestEmail}
                          onChange={(e) => {
                            setGuestEmail(e.target.value);
                            if (guestEmailError) setGuestEmailError('');
                          }}
                        />
                      </div>
                      {showErrors && guestEmailError && (
                        <Text role="label-md" as="p" color="support-red" style={{ marginTop: 'var(--space-1)' }}>
                          {guestEmailError}
                        </Text>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div className={`momo-input-wrapper ${showErrors && guestPhoneError ? 'is-invalid' : ''}`}>
                        <div className="momo-prefix">
                          <Text role="label-sm" as="span" className="ug-flag">UG</Text>
                          <Text role="body-lg" as="span">+256</Text>
                        </div>
                        <input
                          ref={guestPhoneRef}
                          type="tel"
                          className={`momo-input ${guestPhone ? (isValidUgPhone(guestPhone) ? 'is-valid' : 'is-invalid') : ''}`}
                          placeholder="772 123456"
                          value={guestPhone}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^0-9\s]/g, '');
                            setGuestPhone(cleaned);
                            if (selectedPayment === 'momo') setMomoPhone(cleaned);
                            if (guestPhoneError) setGuestPhoneError('');
                          }}
                        />
                      </div>
                      {showErrors && guestPhoneError && (
                        <Text role="label-md" as="p" color="support-red" style={{ marginTop: 'var(--space-1)' }}>
                          {guestPhoneError}
                        </Text>
                      )}
                    </div>
                    <Text role="label-sm" as="p" color="tertiary" style={{ marginTop: 'var(--space-1)' }}>
                      We'll use these details to confirm your order and send delivery updates.
                    </Text>
                  </Card.Body>
                </Card>
              </Page.Section>
            )}

            {/* Payment Method Section */}
            <Page.Section className="checkout-section">
              <div className="section-header">
                <Text role="label-md" as="span" color="brand-primary-dark" className="section-number">{isAuthenticated ? 2 : 3}</Text>
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
                      <Text role="title-sm" as="span" className="option-name">Mobile Money</Text>
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
                        <div className={`momo-input-wrapper ${showErrors && phoneError ? 'is-invalid' : ''}`}>
                          <div className="momo-prefix">
                            <Text role="label-sm" as="span" className="ug-flag">UG</Text>
                            <Text role="body-lg" as="span">+256</Text>
                          </div>
                          <input
                            ref={momoPhoneRef}
                            type="tel"
                            className={`momo-input ${momoPhone ? (isValidPhone ? 'is-valid' : 'is-invalid') : ''}`}
                            placeholder="772 123456"
                            value={momoPhone}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/[^0-9\s]/g, '');
                              setMomoPhone(cleaned);
                              if (!isAuthenticated) setGuestPhone(cleaned);
                            }}
                          />
                        </div>
                        {(showErrors || momoPhone) && phoneError && <Text role="label-md" as="p" color="support-red" className="momo-error-text">{phoneError}</Text>}
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
                    </div>
                  </Card.Body>
                </Card>

                {/* Cash on Delivery Panel */}
                <Card
                  isHoverable={true}
                  className={`payment-option ${selectedPayment === 'cod' ? 'is-active' : ''}`}
                  style={selectedPayment === 'cod' ? { borderColor: 'var(--color-brand-primary)' } : {}}
                  onClick={() => setSelectedPayment('cod')}
                >
                  <Card.Body style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 'var(--space-5)', padding: 0 }}>
                    <div className={`option-radio ${selectedPayment === 'cod' ? 'checked' : ''}`}>
                      <div className="radio-inner"></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap-xs)', flex: 1 }}>
                      <Text role="title-sm" as="span" className="option-name">Pay Cash on Delivery</Text>
                    </div>
                    <div className="option-brand-icons">
                      <Text role="label-sm" as="span" style={{ color: 'var(--color-brand-primary-dark)', background: 'var(--color-brand-primary-light, #fdf2f8)', border: '1px solid var(--color-brand-primary)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>CASH</Text>
                    </div>
                  </Card.Body>
                </Card>
              </div>

              <Button
                variant="action"
                fullWidth
                loading={isProcessing}
                onClick={handlePlaceOrder}
                style={{ marginTop: 'var(--space-6)' }}
              >
                {selectedPayment === 'cod' ? 'Place Order' : 'Complete Payment'}
              </Button>

              <Text role="label-sm" as="p" color="tertiary" className="secure-text" style={{ marginTop: 'var(--space-3)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure encrypted payment
              </Text>
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
                        {placedOrderDetails?.paymentMethod === 'cod' && (
                          <Text role="label-sm" as="p" style={{ color: '#000000', marginTop: 'var(--space-3)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <Banknote size={18} style={{ flexShrink: 0 }} />
                            <span>Amount Payable: {formatPriceString(placedOrderDetails?.grandTotal || grandTotal)}</span>
                          </Text>
                        )}
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
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>}
                    >
                      Track Order
                    </Button>
                    {orderTracking?.riderPhone && (
                      <Button
                        variant="pill"
                        onClick={() => window.location.href = `tel:${orderTracking.riderPhone}`}
                        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                      >
                        Contact Delivery Lead
                      </Button>
                    )}
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

                  {showReferralPrompt && (
                    <div ref={referralPromptRef}>
                      <Card className="referral-prompt-card animate-fadeIn" style={{ backgroundColor: 'var(--surface-container-low)', border: '1px solid rgba(211, 80, 151, 0.15)', borderRadius: 'var(--radius-xl)' }}>
                      <Card.Header>
                        <Text role="title-sm" as="h4" color="primary" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>
                          How Did You Know About Us?
                        </Text>
                      </Card.Header>
                      <Card.Body style={{ gap: 'var(--space-4)', padding: '0 var(--space-6) var(--space-6)', display: 'flex', flexDirection: 'column' }}>
                        <Text role="body-md" as="p" color="secondary" style={{ margin: 0 }}>
                          While you wait for your order, help us out — where did you first hear about Dennan?
                        </Text>
                        <div className="referral-source-options">
                          {[
                            {
                              value: 'tiktok', label: 'TikTok', icon: (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 3v10.5a3.5 3.5 0 1 1-2.5-3.36V6.5a5.5 5.5 0 0 0 5.5 5.5" /><path d="M16 3a4.5 4.5 0 0 0 4.5 4.5" /></svg>
                              )
                            },
                            {
                              value: 'instagram', label: 'Instagram', icon: (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></svg>
                              )
                            },
                            { value: 'friend', label: 'A friend', icon: <Users size={20} /> },
                            {
                              value: 'google', label: 'Google', icon: (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                              )
                            },
                            { value: 'chatgpt', label: 'ChatGPT / AI', icon: <SparklesIcon size={20} /> },
                            { value: 'other', label: 'Other', icon: <MoreHorizontal size={20} /> },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`referral-source-chip ${selectedReferralSource === opt.value ? 'is-selected' : ''}`}
                              onClick={() => handleSubmitReferralSource(opt.value)}
                              disabled={isSubmittingReferral}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                        {selectedReferralSource === 'other' && (
                          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="referral-other-input"
                              placeholder="Please tell us where..."
                              value={otherReferralText}
                              onChange={(e) => setOtherReferralText(e.target.value)}
                            />
                            <Button
                              variant="soft"
                              size="sm"
                              loading={isSubmittingReferral}
                              disabled={!otherReferralText.trim() || isSubmittingReferral}
                              onClick={() => handleSubmitReferralSource('other')}
                            >
                              Submit
                            </Button>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                )}

                  <div className="secondary-promos">
                    {checkoutData?.confirmation?.promos?.map(promo => {
                      const isRefer = promo.id === 'refer' || promo.id === 'review';
                      const isProfile = promo.id === 'profile';
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
                              ) : isProfile ? (
                                <Button variant="link" onClick={() => setShowOnboardingModal(true)}>
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
              orderId={placedOrderDetails?.orderId || pendingOrderId}
              location={selectedAddress?.zone || 'Kampala'}
            />
          )}
        </div>
      )}

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleConfirmLocation}
        onEstimate={fetchDeliveryQuote}
        deliveryData={checkoutData?.delivery}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderItems={placedOrderDetails?.items || []}
        user={user}
      />

      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
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
                  <Settings size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Developer Options
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
                <SparklesIcon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Confirm with Mock Items
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
                <ShoppingCart size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Confirm Actual Cart ({cartItems.length})
              </button>

              {isOrderConfirmed && (
                <button
                  className="dev-tool-btn reset"
                  onClick={() => {
                    handleDevReset();
                    setShowDevPanel(false);
                  }}
                >
                  <RotateCcw size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Reset Checkout
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
