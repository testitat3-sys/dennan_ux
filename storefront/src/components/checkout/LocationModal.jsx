import React, { useState, useEffect } from 'react';
import SmartAddressSearch from './SmartAddressSearch';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Text from '../ui/Text';
import { formatPrice } from '../../utils/priceUtils';
import './LocationModal.css';

const LocationModal = ({ isOpen, onClose, onConfirm, onEstimate, deliveryData = null, skipConfirmation = false }) => {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [quote, setQuote] = useState(null);

  const landmarks = deliveryData?.landmarks || [];
  const history = deliveryData?.history || [];

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      // Reset state when opening
      setSelection(null);
      setIsEstimating(false);
      setQuote(null);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
    }
  }, [isOpen]);

  const handleSelectAddress = async (item) => {
    setSelection(item);

    if (skipConfirmation) {
      onConfirm(item, null);
      onClose();
      return;
    }

    setIsEstimating(true);
    setQuote(null);

    try {
      const result = await onEstimate(item);
      setQuote(result);
    } catch (error) {
      console.error('Error fetching delivery quote:', error);
      setQuote({ outOfBounds: true });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleConfirm = () => {
    if (selection && quote && !quote.outOfBounds) {
      onConfirm(selection, quote);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`location-overlay ${active ? 'is-active' : ''}`} onClick={onClose}>
      <Card className={`location-modal ${active ? 'is-active' : ''}`} variant="section" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 'var(--space-4)' }}>
          <Text role="headline-sm" as="h2" className="modal-title">Delivery Location</Text>
          <Button 
            variant="icon-action"
            onClick={onClose}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
          />
        </div>

        <div className="location-modal-content">
          {!quote && !isEstimating && (
            <div className="search-section">
              <SmartAddressSearch
                onSelectAddress={handleSelectAddress}
                landmarks={landmarks}
                history={history}
              />
              <Text role="body-sm" color="secondary" className="location-hint" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Enter your landmark or suburb (e.g., Kiwatule)
              </Text>
            </div>
          )}

          {(isEstimating || quote) && (
            <div className={`reveal-section ${quote ? 'is-revealed' : ''}`}>
              {isEstimating ? (
                <div className="reveal-loader">
                  <div className="spinner"></div>
                  <Text role="body-sm" color="secondary">Calculating route...</Text>
                </div>
              ) : quote.outOfBounds ? (
                <div className="reveal-oob">
                  <div className="delivery-oob-banner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <Text role="body-md" as="p">
                      Sorry, this location is too far away for delivery. We only deliver up to Entebbe/Gayaza outskirts (approx 42km road distance).
                    </Text>
                  </div>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => { setQuote(null); setSelection(null); }}
                  >
                    Change Location
                  </Button>
                </div>
              ) : (
                <div className="reveal-success">
                  <div className="success-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <Text role="title-lg" as="h3" className="reveal-message">Great! We can reach you in</Text>
                  <Text role="display-lg" as="div" color="anchor" className="reveal-timer">
                    {quote.etaMinutes} <Text role="headline-sm" as="span" color="secondary" className="timer-unit">mins</Text>
                  </Text>
                  <Text role="body-sm" color="secondary" className="reveal-subtext">
                    Estimated arrival by {new Date(Date.now() + quote.etaMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>

                  <div className="delivery-quote-breakdown">
                    <span className="delivery-zone-badge">{quote.zone}</span>
                    <Text role="body-md" as="span" color="primary">Delivery fee: {formatPrice(quote.deliveryFee)}</Text>
                  </div>

                  <div className="selection-preview">
                    <Text role="label-sm" color="tertiary" className="preview-label">Delivering to</Text>
                    <Text role="body-lg" color="primary" className="preview-value">{selection.name}</Text>
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleConfirm}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => { setQuote(null); setSelection(null); }}
                  >
                    Change Location
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LocationModal;

