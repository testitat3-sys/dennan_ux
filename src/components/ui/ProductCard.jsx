import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCardSkeleton from './ProductCardSkeleton';
import { formatPrice } from '../../utils/priceUtils';
import { useWishlist } from '../../context/WishlistContext';

const formatUnitsSold = (units) => {
  if (units >= 1000) {
    return `${(units / 1000).toFixed(1).replace(/\.0$/, '')}k+ sold`;
  }
  if (units > 20) {
    const rounded = Math.floor(units / 5) * 5;
    return `${rounded}+ sold`;
  }
  return `${units} sold`;
};

const ProductCard = ({ 
  product, 
  className = '', 
  onAddToCart,
  wishlistMode = false,
  showWishlistIcon = true,
  onRemove,
  isNotified = false,
  onToggleNotify,
  onMoveToRegistry
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const { image, name, price, wasPrice, tier, badge, tags, variant, inventory, unitsSold } = product;
  const id = product.id || product._id;

  const isSaved = isInWishlist(id);
  const isOutOfStock = inventory !== undefined && inventory <= 0;
  
  // 1. Render the skeleton fallback until the image has preloaded or errored
  if (!imageLoaded && !imageError) {
    return (
      <div className="product-card-preload-container" style={{ position: 'relative' }}>
        <ProductCardSkeleton className={className} />
        {/* Hidden image element to trigger the browser's native preload & cache */}
        <img 
          src={image} 
          alt="" 
          onLoad={() => setImageLoaded(true)} 
          onError={() => setImageError(true)} 
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} 
        />
      </div>
    );
  }
  
  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };
  
  // 2. Render the actual, animated product card
  return (
    <article className={`product-card product-card--loaded ${variant ? `product-card--${variant}` : ''} ${wishlistMode ? 'product-card--wishlist' : ''} ${className}`}>
      <Link to={`/product/${id}`} className="product-card__image-link">
        <div className="product-card__image">
          <img src={image} alt={name} />
          {badge && <span className="product-card__badge">{badge}</span>}
          <div className="product-card__tags">
            {isOutOfStock && (
              <span className="tag tag--support-red">
                Out of Stock
              </span>
            )}
            {unitsSold !== undefined && unitsSold > 0 && (
              <span className="tag tag--sales">
                {formatUnitsSold(unitsSold)}
              </span>
            )}
            {tags && tags
              .filter(tag => tag && tag.text && tag.text.toLowerCase() !== 'in stock')
              .map((tag, i) => (
                <span key={i} className={`tag tag--${tag.type}`}>{tag.text}</span>
              ))
            }
          </div>
          {showWishlistIcon && (
            <button 
              className="product-card__wishlist" 
              aria-label={wishlistMode ? "Remove from wishlist" : (isSaved ? "Remove from wishlist" : "Save to wishlist")}
              onClick={wishlistMode ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove && onRemove(product);
              } : handleWishlistClick}
              style={(!wishlistMode && isSaved) ? { backgroundColor: 'var(--surface-container-low)' } : {}}
            >
              {wishlistMode ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill={isSaved ? "var(--color-brand-primary)" : "none"} 
                  stroke={isSaved ? "var(--color-brand-primary)" : "currentColor"} 
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </Link>
      <div className="product-card__info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span className="product-card__tier">{tier}</span>
        </div>
        <Link to={`/product/${id}`} className="product-card__name-link">
          <h3 className="product-card__name">{name}</h3>
        </Link>
        <div className="product-card__price-row">
          <span className="product-card__price">{formatPrice(price)}</span>
          {wasPrice && <span className="product-card__price-was">{formatPrice(wasPrice)}</span>}
        </div>
        
        {wishlistMode && (
          isOutOfStock ? (
            <div className="wishlist-notify-alert">
              <label className="wishlist-checkbox-label">
                <input
                  type="checkbox"
                  checked={isNotified}
                  onChange={onToggleNotify}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">Notify me when replenished</span>
              </label>
            </div>
          ) : (
            <p className="wishlist-delivery-estimate">
              Ready to dispatch in Kampala
            </p>
          )
        )}

        {isOutOfStock ? (
          wishlistMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button 
                className="product-card__add product-card__add--disabled"
                disabled
                style={{
                  backgroundColor: 'var(--surface-container-high)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'not-allowed'
                }}
              >
                Currently Out of Stock
              </button>
              {onMoveToRegistry && (
                <button 
                  className="product-card__add" 
                  onClick={(e) => {
                    e.preventDefault();
                    onMoveToRegistry(product);
                  }}
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--color-brand-primary-dark)',
                    border: '1px solid var(--color-brand-primary-light)',
                    marginTop: 0
                  }}
                >
                  Move to Registry
                </button>
              )}
            </div>
          ) : (
            <button 
              className={`product-card__add ${isSaved ? 'product-card__add--saved' : ''}`}
              onClick={handleWishlistClick}
              style={isSaved ? {
                backgroundColor: 'color-mix(in srgb, var(--color-brand-primary-light), transparent 85%)',
                color: 'var(--color-brand-primary-dark)',
                border: 'none'
              } : {
                backgroundColor: 'var(--surface-container-high)',
                color: 'var(--color-anchor)',
                border: 'none'
              }}
            >
              {isSaved ? 'In Wishlist' : 'Add to Wishlist'}
            </button>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button 
              className="product-card__add" 
              onClick={(e) => {
                e.preventDefault();
                onAddToCart && onAddToCart(product);
              }}
            >
              {wishlistMode ? 'Move to cart' : 'Add to cart'}
            </button>
            {wishlistMode && onMoveToRegistry && (
              <button 
                className="product-card__add" 
                onClick={(e) => {
                  e.preventDefault();
                  onMoveToRegistry(product);
                }}
                style={{
                  backgroundColor: 'var(--surface-container-low)',
                  color: 'var(--color-brand-primary-dark)',
                  border: '1px solid var(--color-brand-primary-light)',
                  marginTop: 0
                }}
              >
                Move to Registry
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;

