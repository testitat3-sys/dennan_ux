import React from 'react';
import { formatPrice } from '../../utils/priceUtils';
import './RegistryItemCard.css';

const RegistryItemCard = ({ item, viewMode, onBuy, onContribute, onRemove }) => {
  const isPurchased = item.status === 'purchased';

  return (
    <article className={`product-card product-card--loaded ${isPurchased ? 'purchased' : ''} registry-item-card`}>
      <div className="product-card__image" style={{ position: 'relative' }}>
        <img src={item.image} alt={item.name} className="item-image" />
        {isPurchased && (
          <div className="purchased-overlay">
            <span className="label-md">Gifted</span>
          </div>
        )}
        
        {viewMode === 'parent' && (
          <button 
            className="product-card__wishlist" 
            aria-label="Remove from registry"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove && onRemove(item.id);
            }}
            style={{ backgroundColor: 'var(--surface-container-low)', zIndex: 10 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="product-card__info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span className="product-card__tier">{item.category}</span>
        <h3 className="product-card__name" style={{ flex: 1, minHeight: '44px', marginBottom: 'var(--space-2)' }}>{item.name}</h3>
        
        <div className="product-card__price-row" style={{ marginTop: 'auto' }}>
          <span className="product-card__price">{formatPrice(item.price)}</span>
        </div>

        {viewMode !== 'parent' && (
          <div className="card-actions" style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            {!isPurchased ? (
              <>
                <button className="btn-primary product-card__add" onClick={() => onBuy(item.id)} style={{ flex: 1 }}>
                  Buy Now
                </button>
                {item.isGroupGifting && (
                  <button className="btn-secondary" onClick={() => onContribute(item.id)} style={{ flex: 1 }}>
                    Contribute
                  </button>
                )}
              </>
            ) : (
              <button className="btn-secondary disabled" disabled style={{ flex: 1 }}>
                Gifted
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default RegistryItemCard;
