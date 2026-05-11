import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { formatPrice } from '../../utils/priceUtils';
import './QuickViewModal.css';


const QuickViewModal = ({ product, isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAddedToWishlist, setIsAddedToWishlist] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsSuccess(false);
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
      }, 400);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const sizes = ['S', 'M', 'L', 'XL'];
  const isSaved = isInWishlist(product.id || product._id);
  const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;

  const handleAddToCart = () => {
    addToCart(product, quantity, size);
    setIsAddedToWishlist(false);
    setIsSuccess(true);
    if (onSuccess) {
      onSuccess(product, false);
    }
  };

  const handleAddToWishlist = () => {
    toggleWishlist(product);
    setIsAddedToWishlist(true);
    setIsSuccess(true);
    if (onSuccess) {
      onSuccess(product, true);
    }
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
                <div className="quick-view-tags">
                  {isOutOfStock && (
                    <span className="tag tag--support-red">
                      Out of Stock
                    </span>
                  )}
                  {product.tags && product.tags
                    .filter(tag => tag && tag.text && tag.text.toLowerCase() !== 'in stock')
                    .map((tag, i) => (
                      <span key={i} className={`tag tag--${tag.type}`}>{tag.text}</span>
                    ))
                  }
                </div>
                <h2 className="quick-view-name">{product.name}</h2>
                <div className="quick-view-price-row">
                  <span className="quick-view-price">{formatPrice(product.price)}</span>
                  {product.wasPrice && <span className="quick-view-price-was">{formatPrice(product.wasPrice)}</span>}
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
                          disabled={isOutOfStock}
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
                        disabled={quantity <= 1 || isOutOfStock}
                      >
                        —
                      </button>
                      <span className="qty-val">{quantity}</span>
                      <button 
                        className="qty-btn" 
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={isOutOfStock}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="quick-view-actions">
                  {isOutOfStock ? (
                    <button className="btn-primary" onClick={handleAddToWishlist}>
                      {isSaved ? 'In Wishlist' : 'Add to Wishlist'}
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={handleAddToCart}>
                      Add to Cart
                    </button>
                  )}
                  <button 
                    className="btn-link quick-view-details-link"
                    onClick={() => {
                      onClose();
                      navigate(`/product/${product.id || product._id}`);
                    }}
                  >
                    View Full Details
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
                <h2 className="success-title">
                  {isAddedToWishlist ? 'Saved to Wishlist' : 'Added to Cart'}
                </h2>
                <p className="success-message">
                  {isAddedToWishlist ? "We've bookmarked this item for you." : 'Your item is ready for checkout.'}
                </p>
              </div>

              <div className="added-product-card">
                <div className="mini-cart-item">
                  <div className="mini-cart-img">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="mini-cart-info">
                    <span className="mini-cart-name">{product.name}</span>
                    <span className="mini-cart-meta">
                      {isAddedToWishlist ? 'Curated Bookmark' : `Size: ${size} • Qty: ${quantity}`}
                    </span>
                    <span className="mini-cart-price">{formatPrice(product.price)}</span>
                  </div>
                </div>
              </div>

              <div className="success-actions">
                {isAddedToWishlist ? (
                  <button className="btn-primary full-width" onClick={() => { onClose(); navigate('/wishlist'); }}>
                    View Wishlist
                  </button>
                ) : (
                  <button className="btn-primary full-width" onClick={() => navigate('/checkout')}>
                    Proceed to Checkout
                  </button>
                )}
                <button className="btn-secondary full-width" onClick={onClose}>
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

