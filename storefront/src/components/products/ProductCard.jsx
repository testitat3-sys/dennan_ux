import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCardSkeleton from './ProductCardSkeleton';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import { useWishlist } from '../../context/WishlistContext';
import Button from '../ui/Button';
import DefaultProductImage from './DefaultProductImage';
import './ProductCard.css';

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
  onMoveToRegistry,
  registryMode = false,
  onAddToRegistry
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const { image, name, price, wasPrice, tier, badge, tags, variant, inventory, unitsSold, brand } = product;
  const id = product.id || product._id;

  const displayName = stripBrandFromName(name, brand);
  const isSaved = isInWishlist(id);
  const isOutOfStock = inventory !== undefined && inventory <= 0;
  const isLowStock = inventory !== undefined && inventory > 0 && inventory <= 3;
  const variantIndex = Math.abs(
    String(id ?? '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % 4;

  // 1. Render the skeleton fallback until the image has preloaded or errored (only if an image exists)
  if (!imageLoaded && !imageError && image) {
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

  const renderPlaceholder = () => <DefaultProductImage />;

  const savedAmount = wasPrice && wasPrice > price ? wasPrice - price : 0;
  const savedAmountStr = String(savedAmount);
  const savedAmountPrefix = savedAmountStr.slice(0, -3);
  const savedAmountSuffix = savedAmountStr.slice(-3);

  // 2. Render the actual, animated product card
  return (
    <article className={`product-card product-card--loaded variant-${variantIndex} ${isOutOfStock ? 'is-out-of-stock' : ''} ${variant ? `product-card--${variant}` : ''} ${wishlistMode ? 'product-card--wishlist' : ''} ${className}`}>
      <Link to={`/product/${id}`} className="product-card__image-link">
        <div className="card-image">
          {image && !imageError ? (
            <img src={image} alt={displayName} className="card-image-el" />
          ) : (
            renderPlaceholder()
          )}
          <div className="card-tags">
            {badge && <span className="tag tag--badge">{badge}</span>}
            {isLowStock ? (
              <div className="card-tags-row">
                <span className="tag tag--low-stock tag--support-red">
                  trending: {inventory} left
                </span>
                {brand && (
                  <span className="tag tag-brand tag--support-green">
                    {brand}
                  </span>
                )}
              </div>
            ) : (
              brand && (
                <span className="tag tag-brand tag--support-green">
                  {brand}
                </span>
              )
            )}
            {unitsSold !== undefined && unitsSold >= 10 && (
              <span className="tag tag--sales">
                {formatUnitsSold(unitsSold)}
              </span>
            )}
          </div>
          <div className="card-badges-right">
            {showWishlistIcon && (
              <Button
                variant="ghost"
                className="card-wishlist-icon"
                aria-label={wishlistMode ? "Remove from wishlist" : (isSaved ? "Remove from wishlist" : "Save to wishlist")}
                onClick={wishlistMode ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove && onRemove(product);
                } : handleWishlistClick}
                style={(!wishlistMode && isSaved) ? { backgroundColor: 'var(--surface-container-low)' } : {}}
                icon={wishlistMode ? (
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
              />
            )}
            {savedAmount > 0 && !isOutOfStock && (
              <span className="card-discount-badge">
                SAVE {savedAmountPrefix}<small className="discount-small">{savedAmountSuffix}</small>
              </span>
            )}
            {isOutOfStock && (
              <span className="card-stock-pill card-stock-pill--oos">
                Out of Stock
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="card-info">
        <span className="card-tier">{tier}</span>
        <Link to={`/product/${id}`} className="product-card__name-link">
          <h3 className="card-name">{displayName}</h3>
        </Link>
        <div className="card-price-row">
          <span className="card-price">{formatPrice(price)}</span>
          {wasPrice && <span className="card-price-was">{formatPrice(wasPrice)}</span>}
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
              <Button 
                variant="card-add"
                disabled
                fullWidth
              >
                Currently Out of Stock
              </Button>
              {onMoveToRegistry && (
                <Button 
                  variant="secondary" 
                  fullWidth
                  onClick={(e) => {
                    e.preventDefault();
                    onMoveToRegistry(product);
                  }}
                >
                  Move to Registry
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="card-add"
              fullWidth
              onClick={handleWishlistClick}
            >
              {isSaved ? "You'll be notified" : 'Remind me when available'}
            </Button>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Button
              variant="card-add"
              fullWidth
              onClick={(e) => {
                e.preventDefault();
                onAddToCart && onAddToCart(product);
              }}
            >
              {wishlistMode ? 'Move to cart' : 'Add to cart'}
            </Button>
            {wishlistMode && onMoveToRegistry && (
              <Button
                variant="secondary"
                fullWidth
                onClick={(e) => {
                  e.preventDefault();
                  onMoveToRegistry(product);
                }}
              >
                Move to Registry
              </Button>
            )}
            {!wishlistMode && registryMode && onAddToRegistry && (
              <Button
                variant="secondary"
                fullWidth
                onClick={(e) => {
                  e.preventDefault();
                  onAddToRegistry(product);
                }}
              >
                Add to Registry
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;

