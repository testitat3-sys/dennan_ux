import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import Button from '../ui/Button';
import DefaultProductImage from './DefaultProductImage';
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
    if (product) {
      setSize(product.stage === 'newborn' ? 'Newborn' : 'S');
      setQuantity(1);
    }
  }, [product]);

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

  const isApparelProduct = product && (
    product.category === 'Apparel' || 
    product.category === 'Newborn Essentials & Kids Apparel/Footwear' ||
    product.subCategory?.toLowerCase() === 'apparel' ||
    product.subCategory?.toLowerCase() === 'clothing'
  );

  const sizes = product?.stage === 'newborn'
    ? ['Newborn', '0-3m', '3-6m', '6-9m']
    : ['S', 'M', 'L', 'XL'];
  const displayName = stripBrandFromName(product.name, product.brand);
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
        <Button 
          variant="ghost" 
          className="quick-view-close" 
          onClick={onClose} 
          aria-label="Close"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
        />

        <div className="quick-view-content">
          {!isSuccess ? (
            <>
              <div className="quick-view-left">
                <div className="quick-view-image">
                  {product.image ? (
                    <img src={product.image} alt={displayName} />
                  ) : (
                    <DefaultProductImage />
                  )}
                </div>
              </div>

              <div className="quick-view-right">
                <span className="quick-view-tier">{product.tier}</span>
                <div className="quick-view-tags">
                  {product.brand && (
                    <span className="tag tag--support-green">
                      {product.brand}
                    </span>
                  )}
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
                <h2 className="quick-view-name">{displayName}</h2>
                <div className="quick-view-price-row">
                  <span className="quick-view-price">{formatPrice(product.price)}</span>
                  {product.wasPrice && <span className="quick-view-price-was">{formatPrice(product.wasPrice)}</span>}
                </div>

                <div className="quick-view-options">
                  {isApparelProduct && (
                    <div className="option-group">
                      <span className="option-label">Size</span>
                      <div className="size-selector">
                        {sizes.map((s) => (
                          <Button
                            key={s}
                            variant={size === s ? 'primary' : 'ghost'}
                            size="sm"
                            className={`size-btn ${size === s ? 'is-active' : ''}`}
                            onClick={() => setSize(s)}
                            disabled={isOutOfStock}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="option-group">
                    <span className="option-label">Quantity</span>
                    <div className="quantity-selector">
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="qty-btn" 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1 || isOutOfStock}
                      >
                        —
                      </Button>
                      <span className="qty-val">{quantity}</span>
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="qty-btn" 
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={isOutOfStock}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="quick-view-actions">
                  {isOutOfStock ? (
                    <Button variant="primary" onClick={handleAddToWishlist}>
                      {isSaved ? "You'll be notified" : 'Remind me when available'}
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={handleAddToCart}>
                      Add to Cart
                    </Button>
                  )}
                  <Button 
                    variant="link" 
                    className="quick-view-details-link"
                    onClick={() => {
                      onClose();
                      navigate(`/product/${product.id || product._id}`);
                    }}
                  >
                    View Full Details
                  </Button>
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
                    {product.image ? (
                      <img src={product.image} alt={displayName} />
                    ) : (
                      <DefaultProductImage />
                    )}
                  </div>
                  <div className="mini-cart-info">
                    <span className="mini-cart-name">{displayName}</span>
                    <span className="mini-cart-meta">
                      {isAddedToWishlist ? 'Curated Bookmark' : `Size: ${size} • Qty: ${quantity}`}
                    </span>
                    <span className="mini-cart-price">{formatPrice(product.price)}</span>
                  </div>
                </div>
              </div>

              <div className="success-actions">
                {isAddedToWishlist ? (
                  <Button variant="primary" fullWidth onClick={() => { onClose(); navigate('/wishlist'); }}>
                    View Wishlist
                  </Button>
                ) : (
                  <Button variant="primary" fullWidth onClick={() => navigate('/checkout')}>
                    Proceed to Checkout
                  </Button>
                )}
                <Button variant="secondary" fullWidth onClick={onClose}>
                  Continue Shopping
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;

