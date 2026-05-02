import React from 'react';
import { useCart } from '../../context/CartContext';

const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart, saveForLater } = useCart();

  return (
    <div className="cart-item">
      <div className="cart-item__thumbnail">
        <img src={item.image} alt={item.name} />
      </div>
      
      <div className="cart-item__content">
        <div className="cart-item__info">
          <div className="cart-item__header">
            <h4 className="cart-item__name">{item.name}</h4>
            <span className="cart-item__stage-hint">{item.stage || 'Newborn'}</span>
          </div>
          <p className="cart-item__meta">Size: {item.size}</p>
          <span className="cart-item__price">{item.price}</span>
        </div>

        <div className="cart-item__controls">
          <div className="cart-item__actions">
            <button 
              className="cart-item__action-btn" 
              onClick={() => saveForLater(item.id, item.size)}
              aria-label="Save for later"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
            <button 
              className="cart-item__action-btn cart-item__action-btn--delete" 
              onClick={() => removeFromCart(item.id, item.size)}
              aria-label="Remove item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>

          <div className="stepping-component">
            <button 
              className="stepping-btn" 
              onClick={() => updateQuantity(item.id, item.size, -1)}
              aria-label="Decrease quantity"
            >
              —
            </button>
            <span className="stepping-value">{item.quantity}</span>
            <button 
              className="stepping-btn" 
              onClick={() => updateQuantity(item.id, item.size, 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
