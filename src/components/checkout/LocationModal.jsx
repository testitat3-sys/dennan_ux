import React, { useState, useEffect } from 'react';
import SmartAddressSearch from './SmartAddressSearch';
import { getKampalaETA } from '../../utils/deliveryUtils';
import './LocationModal.css';

const LocationModal = ({ isOpen, onClose, onConfirm }) => {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [revealedETA, setRevealedETA] = useState(null);

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
    setIsEstimating(true);
    setRevealedETA(null);

    // Mock the "Instant Reveal" loading state (0.5s)
    setTimeout(() => {
      const eta = getKampalaETA(item.zone);
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
      <div className={`location-modal ${active ? 'is-active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="location-modal-header">
          <h2 className="modal-title">Delivery Location</h2>
          <p className="modal-subtitle">Enter your suburb for an instant delivery estimate.</p>
        </div>

        <div className="location-modal-content">
          {!revealedETA && !isEstimating && (
            <div className="search-section">
              <SmartAddressSearch onSelectAddress={handleSelectAddress} />
              <div className="location-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Enter your landmark or suburb (e.g., Kiwatule)
              </div>
            </div>
          )}

          {(isEstimating || revealedETA) && (
            <div className={`reveal-section ${revealedETA ? 'is-revealed' : ''}`}>
              {isEstimating ? (
                <div className="reveal-loader">
                  <div className="spinner"></div>
                  <p>Calculating route...</p>
                </div>
              ) : (
                <div className="reveal-success">
                  <div className="success-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 className="reveal-message">Great! We can reach you in</h3>
                  <div className="reveal-timer">
                    <span className="timer-value">{revealedETA.travelTime}</span>
                    <span className="timer-unit">mins</span>
                  </div>
                  <p className="reveal-subtext">Estimated arrival by {revealedETA.timeString}</p>
                  
                  <div className="selection-preview">
                    <span className="preview-label">Delivering to</span>
                    <span className="preview-value">{selection.name}</span>
                  </div>

                  <button className="btn-confirm-location" onClick={handleConfirm}>
                    Confirm & Update Summary
                  </button>
                  <button className="btn-change-selection" onClick={() => { setRevealedETA(null); setSelection(null); }}>
                    Change Location
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationModal;

