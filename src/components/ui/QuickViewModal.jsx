import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import './QuickViewModal.css';

const QuickViewModal = ({ product, isOpen, onClose }) => {
  const { addToCart, cartItems, subtotal } = useCart();
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsSuccess(false); // Reset success state when opening
      // Small delay to ensure browser picks up initial state before applying active class
      const timer = setTimeout(() => {
        setActive(true);
      }, 10);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(timer);
    } else {
      setActive(false);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 400); // Match CSS transition duration
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const sizes = ['S', 'M', 'L', 'XL'];

  const handleAddToCart = () => {
    addToCart(product, quantity, size);
    setIsSuccess(true);
  };

  return (
    <div className={`quick-view-overlay ${active ? 'is-open' : ''}`} onClick={onClose}>
      <div 
        className={`quick-view-modal ${active ? 'is-open' : ''} ${isSuccess ? 'is-success-view' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="quick-view-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="quick-view-content">
          {!isSuccess ? (
            <>
              <div className="quick-view-left">
                <div className="quick-view-image">
                  <img src={product.image} alt={product.name} />
                </div>
              </div>

              <div className="quick-view-right">
                <span className="quick-view-tier">{product.tier}</span>
                {product.tags && (
                  <div className="quick-view-tags">
                    {product.tags.map((tag, i) => (
                      <span key={i} className={`tag tag--${tag.type}`}>{tag.text}</span>
                    ))}
                  </div>
                )}
                <h2 className="quick-view-name">{product.name}</h2>
                <div className="quick-view-price-row">
                  <span className="quick-view-price">{product.price}</span>
                  {product.wasPrice && <span className="quick-view-price-was">{product.wasPrice}</span>}
                </div>

                <div className="quick-view-options">
                  <div className="option-group">
                    <span className="option-label">Size</span>
                    <div className="size-selector">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          className={`size-btn ${size === s ? 'is-active' : ''}`}
                          onClick={() => setSize(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="option-group">
                    <span className="option-label">Quantity</span>
                    <div className="quantity-selector">
                      <button 
                        className="qty-btn" 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        —
                      </button>
                      <span className="qty-val">{quantity}</span>
                      <button 
                        className="qty-btn" 
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="quick-view-actions">
                  <button className="btn-primary" onClick={handleAddToCart}>
                    Add to Cart
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="success-view">
              <div className="success-header">
                <div className="success-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className="success-title">Success!</h2>
                <p className="success-message">{product.name} was added to your cart.</p>
              </div>

              <div className="cart-summary">
                <h3 className="summary-title">Your Cart ({cartItems.length} items)</h3>
                <div className="cart-items-list">
                  {cartItems.map((item, index) => (
                    <div key={`${item.id}-${item.size}-${index}`} className="mini-cart-item">
                      <div className="mini-cart-img">
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className="mini-cart-info">
                        <span className="mini-cart-name">{item.name}</span>
                        <span className="mini-cart-meta">Size: {item.size} • Qty: {item.quantity}</span>
                        <span className="mini-cart-price">{item.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="summary-footer">
                  <div className="subtotal-row">
                    <span>Subtotal</span>
                    <span className="subtotal-amount">£{subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="success-actions">
                <button className="btn-primary full-width" onClick={() => window.location.href = '/checkout'}>
                  Checkout
                </button>
                <button className="btn-secondary full-width" onClick={() => onClose()}>
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
