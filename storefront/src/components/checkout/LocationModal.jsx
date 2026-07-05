import React, { useState, useEffect } from 'react';
import SmartAddressSearch from './SmartAddressSearch';
import { getKampalaETA } from '../../utils/deliveryUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Text from '../ui/Text';
import './LocationModal.css';

const LocationModal = ({ isOpen, onClose, onConfirm, deliveryData = null, skipConfirmation = false }) => {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [revealedETA, setRevealedETA] = useState(null);

  const zones = deliveryData?.zones || {};
  const landmarks = deliveryData?.landmarks || [];
  const history = deliveryData?.history || [];

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      // Reset state when opening
      setSelection(null);
      setIsEstimating(false);
      setRevealedETA(null);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
    }
  }, [isOpen]);

  const handleSelectAddress = (item) => {
    setSelection(item);

    if (skipConfirmation) {
      onConfirm(item, null);
      onClose();
      return;
    }

    setIsEstimating(true);
    setRevealedETA(null);

    // Mock the "Instant Reveal" loading state (0.5s)
    setTimeout(() => {
      const eta = getKampalaETA(item.zone, zones);
      setRevealedETA(eta);
      setIsEstimating(false);
    }, 600);
  };

  const handleConfirm = () => {
    if (selection && revealedETA) {
      onConfirm(selection, revealedETA);
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
          {!revealedETA && !isEstimating && (
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

          {(isEstimating || revealedETA) && (
            <div className={`reveal-section ${revealedETA ? 'is-revealed' : ''}`}>
              {isEstimating ? (
                <div className="reveal-loader">
                  <div className="spinner"></div>
                  <Text role="body-sm" color="secondary">Calculating route...</Text>
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
                    {revealedETA.travelTime} <Text role="headline-sm" as="span" color="secondary" className="timer-unit">mins</Text>
                  </Text>
                  <Text role="body-sm" color="secondary" className="reveal-subtext">Estimated arrival by {revealedETA.timeString}</Text>
                  
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
                    onClick={() => { setRevealedETA(null); setSelection(null); }}
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

