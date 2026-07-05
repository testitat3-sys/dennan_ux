import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Text from '../ui/Text';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, item, totalContributed }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const t = setTimeout(() => setIsActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(t);
    } else {
      setIsActive(false);
      const t = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isMounted || !item) return null;

  return (
    <div
      className={`delete-confirm-overlay${isActive ? ' is-open' : ''}`}
      onClick={onClose}
    >
      <div
        className="delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <Card removePadding className="delete-confirm-card">
          <Card.Header className="delete-confirm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--space-6) var(--space-6) 0' }}>
            <div>
              <span className="delete-confirm-eyebrow" style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--label-md)',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#ef4444',
                display: 'block',
                marginBottom: 'var(--space-1)'
              }}>
                Registry Balance Policy
              </span>
              <h2 className="delete-confirm-headline" style={{
                fontFamily: 'var(--font-editorial)',
                fontSize: 'var(--headline-sm)',
                color: 'var(--color-anchor)',
                margin: 0,
                lineHeight: 1.25
              }}>
                Confirm Deletion & Cash Out
              </h2>
            </div>
            <button
              className="delete-confirm-close"
              onClick={onClose}
              aria-label="Close"
              style={{
                flexShrink: 0,
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--surface-container)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={16} />
            </button>
          </Card.Header>

          <Card.Body className="delete-confirm-body" style={{ padding: 'var(--space-6)' }}>
            <div className="alert-content-box" style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1.5px dashed rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'flex-start'
            }}>
              <ShieldAlert className="alert-icon" size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <Text role="title-sm" as="p" color="primary" style={{ fontWeight: 700, margin: 0, color: '#ef4444' }}>
                  Funded Item Balance
                </Text>
                <Text role="body-sm" as="p" color="secondary" style={{ marginTop: 'var(--space-1)', marginBottom: 0 }}>
                  This item has **UGX {totalContributed.toLocaleString()}** in active guest contributions. 
                  Deleting it will trigger our **Credits Cash Out System**.
                </Text>
              </div>
            </div>

            <Text role="body-md" as="p" color="primary" style={{ lineHeight: '1.6', margin: 0 }}>
              The existing contributions will be safely decoupled and converted into **Dennan Store Credit** in your profile. 
              You can spend this store credit balance on any other item in the shop when checking out!
            </Text>
          </Card.Body>

          <Card.Actions className="delete-confirm-actions" style={{
            display: 'flex',
            gap: 'var(--space-3)',
            padding: '0 var(--space-6) var(--space-6)'
          }}>
            <Button 
              variant="ghost" 
              style={{ flex: 1 }} 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} 
              onClick={onConfirm}
            >
              Delete & Convert
            </Button>
          </Card.Actions>
        </Card>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
