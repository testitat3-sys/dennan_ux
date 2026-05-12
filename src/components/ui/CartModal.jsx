import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/priceUtils';
import CartItem from './CartItem';
import './CartModal.css';


const CartModal = () => {
  const navigate = useNavigate();
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    subtotal, 
    totalItems, 
    undoRemove,
    lastRemovedItem,
    lastActionType
  } = useCart();
  
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const prevItemsLength = useRef(cartItems.length);

  useEffect(() => {
    if (isCartOpen) {
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
  }, [isCartOpen]);



  const handleClose = () => {
    setIsCartOpen(false);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  // Logic to show/hide undo toast based on cartItems changing
  useEffect(() => {
    if (cartItems.length < prevItemsLength.current) {
      setShowUndo(true);
      const timer = setTimeout(() => setShowUndo(false), 5000);
      return () => clearTimeout(timer);
    }
    prevItemsLength.current = cartItems.length;
  }, [cartItems]);

  if (!isMounted) return null;

  return (
    <div className={`cart-modal-overlay ${active ? 'is-open' : ''}`} onClick={handleClose}>
      <div 
        className={`cart-modal ${active ? 'is-open' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >


        {/* Header */}
        <div className="cart-modal__header">
          <h2 className="cart-modal__title">Your Cart ({totalItems} items)</h2>
          <button className="cart-modal__close" onClick={handleClose} aria-label="Close cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="cart-modal__content">
          {cartItems.length > 0 ? (
            <div className="cart-items-list">
              {cartItems.map((item, index) => (
                <CartItem key={`${item.id}-${item.size}-${index}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <button className="btn-secondary" onClick={handleClose}>Continue Shopping</button>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="cart-modal__footer">

          
          <div className="cart-modal__subtotal">
            <span className="subtotal-label">Subtotal</span>
            <span className="subtotal-value">{formatPrice(subtotal)}</span>
          </div>

          <button 
            className="btn-primary cart-modal__checkout-btn" 
            onClick={handleCheckout}
            disabled={cartItems.length === 0}
          >
            Proceed to Checkout
          </button>
        </div>

        {/* Undo Toast - Floating above the footer */}
        {showUndo && (
          <div className="cart-modal__undo-toast">
            {lastActionType === 'delete' && (
              <>
                <span className="undo-message">Item removed from cart</span>
                <button 
                  className="undo-action" 
                  onClick={() => {
                    undoRemove();
                    setShowUndo(false);
                  }}
                >
                  Undo
                </button>
              </>
            )}
            {lastActionType === 'wishlist' && (
              <span className="undo-message">"{lastRemovedItem?.name || 'Item'}" saved to wishlist!</span>
            )}
            {lastActionType === 'registry' && (
              <span className="undo-message">"{lastRemovedItem?.name || 'Item'}" moved to baby registry!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;

