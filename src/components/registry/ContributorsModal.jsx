import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Text from '../ui/Text';
import './ContributorsModal.css';

const ContributorsModal = ({ isOpen, onClose, contributions = [], seenContributorsModal = [] }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => {
        setActive(true);
      }, 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 600);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const seenSet = new Set(seenContributorsModal);

  return (
    <div className={`contributors-modal-overlay ${active ? 'is-open' : ''}`} onClick={onClose}>
      <div 
        className={`contributors-modal ${active ? 'is-open' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="contributors-modal__header">
          <div className="contributors-modal__header-text">
            <Text variant="headline-sm" color="primary" style={{ fontFamily: 'var(--font-editorial)', margin: 0 }}>
              Registry Contributors
            </Text>
            <Text variant="body-sm" color="secondary" style={{ fontWeight: 300 }}>
              Gifts & contributions received from loved ones
            </Text>
          </div>
          <Button 
            variant="ghost" 
            className="contributors-modal__close" 
            onClick={onClose} 
            aria-label="Close contributors list"
            icon={<X size={20} />}
          />
        </div>

        {/* Scrollable Content */}
        <div className="contributors-modal__content">
          {contributions.length > 0 ? (
            <div className="contributors-list">
              {contributions.map((contrib) => {
                const isNew = !seenSet.has(contrib.id);
                return (
                  <div key={contrib.id} className="contributor-row">
                    <div className="contributor-gift-info">
                      {contrib.image ? (
                        <img src={contrib.image} alt="" className="contributor-mini-thumb" />
                      ) : (
                        <div className="contributor-mini-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Gift</span>
                        </div>
                      )}
                      <div className="contributor-gift-details">
                        <Text variant="title-sm" color="primary" style={{ fontWeight: '600' }}>
                          {contrib.itemName}
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <Text variant="body-sm" color="secondary">
                            From: <strong style={{ color: 'var(--text-primary)' }}>{contrib.from}</strong>
                          </Text>
                          {isNew && (
                            <span className="contributor-new-badge">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="contributor-gift-meta">
                      <Text variant="body-sm" style={{ fontWeight: '700', color: 'var(--color-brand-primary)' }}>
                        UGX {contrib.priceContributed.toLocaleString()}
                      </Text>
                      <Text variant="label-sm" color="tertiary">
                        {formatDate(contrib.date)}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="contributors-empty">
              <Text variant="body-lg" color="secondary">
                No contributions yet.
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContributorsModal;
