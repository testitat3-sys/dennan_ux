import React from 'react';
import { formatPrice } from '../../utils/priceUtils';
import './RegistryItemCard.css';

const RegistryItemCard = ({ item, viewMode, onToggleMustHave, onBuy, onContribute, onRemove }) => {
  const isPurchased = item.status === 'purchased';
  const progress = item.isGroupGifting 
    ? (item.contributions.reduce((acc, curr) => acc + curr.amount, 0) / item.price) * 100 
    : 0;

  return (
    <article className={`product-card product-card--loaded ${isPurchased ? 'purchased' : ''} registry-item-card`}>
      <div className="product-card__image" style={{ position: 'relative' }}>
        <img src={item.image} alt={item.name} className="item-image" />
        {item.isMustHave && (
          <span className="product-card__badge" style={{ backgroundColor: 'var(--color-brand-primary)' }}>
            Most Wanted
          </span>
        )}
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

        {item.isGroupGifting && !isPurchased && (
          <div className="group-gifting-progress" style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
            <div className="progress-bar-bg" style={{ height: '5px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div className="progress-bar-fill" style={{ height: '100%', background: 'var(--color-support-blue)', width: `${Math.min(progress, 100)}%` }}></div>
            </div>
            <p className="label-sm text-secondary" style={{ marginTop: 'var(--space-1)', fontSize: '0.75rem', fontWeight: '600' }}>
              {Math.round(progress)}% contributed
            </p>
          </div>
        )}

        <div className="card-actions" style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
          {viewMode === 'parent' ? (
            <>
              <button 
                className={`btn-action ${item.isMustHave ? 'active' : ''}`}
                onClick={() => onToggleMustHave(item.id)}
                style={{ flex: 1 }}
              >
                {item.isMustHave ? 'Unmark' : 'Most Wanted'}
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default RegistryItemCard;
