import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';
import Text from '../ui/Text';
import './PesapalPaymentModal.css';

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site');

const PesapalPaymentModal = ({
  isOpen,
  onClose,
  redirectUrl,
  orderId,
  onSuccess,
  onFailure,
  statusEndpoint = 'status?orderId=',
  successStatuses = ['preparing', 'dispatched', 'delivered'],
  failureStatuses = ['failed', 'cancelled'],
}) => {
  const [active, setActive] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const resolvedRef = useRef(false);

  // Slide-in animation transition states
  useEffect(() => {
    if (isOpen) {
      console.log('[PesapalPaymentModal] mounted/opened', { orderId, redirectUrl });
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
    }
  }, [isOpen, orderId, redirectUrl]);

  // Reset iframe loading state whenever a new payment session opens
  useEffect(() => {
    if (isOpen) {
      setIframeLoaded(false);
    }
  }, [isOpen, redirectUrl]);

  // Fallback safety net: Pesapal normally busts the whole tab to our
  // callback route once payment finishes, but if that automatic redirect
  // never fires (e.g. the user is stuck on Pesapal's manual "click here to
  // continue" link), poll our own status endpoint so we can still resolve
  // the modal instead of waiting indefinitely.
  useEffect(() => {
    if (!isOpen || !orderId) return;
    resolvedRef.current = false;

    const interval = setInterval(async () => {
      if (resolvedRef.current) return;
      try {
        const res = await fetch(`${CONVEX_SITE_URL}/api/pesapal/${statusEndpoint}${orderId}`);
        const data = await res.json();
        console.log('[PesapalPaymentModal] status poll', data.status);

        if (successStatuses.includes(data.status)) {
          resolvedRef.current = true;
          onSuccess({ _id: orderId });
        } else if (failureStatuses.includes(data.status)) {
          resolvedRef.current = true;
          onFailure();
        }
      } catch (err) {
        console.error('[PesapalPaymentModal] status poll failed', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, orderId, onSuccess, onFailure]);

  if (!isOpen) return null;

  return (
    <div className={`pesapal-modal-overlay ${active ? 'is-active' : ''}`} onClick={onClose}>
      <div
        className={`pesapal-modal ${active ? 'is-active' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pesapal-modal__header">
          <Text role="headline-md" as="h3" className="pesapal-modal__title">
            Complete Payment
          </Text>
          <Button
            variant="ghost"
            className="pesapal-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
          />
        </div>

        <div className="pesapal-modal__content">
          {!iframeLoaded && (
            <div className="pesapal-modal__loading">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" className="pesapal-modal__spinner">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <Text role="body-md" as="p" color="secondary">Loading secure payment page...</Text>
            </div>
          )}
          {redirectUrl && (
            <iframe
              src={redirectUrl}
              title="Pesapal Secure Payment"
              className="pesapal-modal__iframe"
              allow="payment"
              onLoad={() => {
                console.log('[PesapalPaymentModal] iframe onLoad fired for', redirectUrl);
                setIframeLoaded(true);
              }}
              onError={(e) => console.error('[PesapalPaymentModal] iframe onError', e)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PesapalPaymentModal;
