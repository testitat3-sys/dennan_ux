import React, { useEffect, useState } from 'react';
import './Toast.css';

const Toast = ({ message, isOpen, onClose, duration = 3000, variant = 'success' }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => setActive(true), 10);
      
      const autoDismiss = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(timer);
        clearTimeout(autoDismiss);
      };
    } else {
      setActive(false);
      const timer = setTimeout(() => setIsMounted(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setActive(false);
    setTimeout(onClose, 400);
  };

  if (!isMounted) return null;

  return (
    <div className={`toast-container ${active ? 'is-active' : ''}`}>
      <div className="toast">
        <div className={`toast-icon ${variant === 'danger' ? 'is-danger' : ''}`}>
          {variant === 'danger' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
};

export default Toast;

