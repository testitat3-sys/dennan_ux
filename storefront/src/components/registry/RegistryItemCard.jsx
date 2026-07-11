import React from 'react';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Trash2, ShoppingBag, Gift } from 'lucide-react';
import DefaultProductImage from '../products/DefaultProductImage';
import './RegistryItemCard.css';

const RegistryItemCard = ({ item, viewMode, onBuy, onContribute, onRemove }) => {
  const isPurchased = item.status === 'purchased';
  const isVirtualPackaging = item.productId === 'virtual-packaging';
  const displayName = stripBrandFromName(item.name, item.brand);

  const renderPackagingPreview = () => {
    const patternType = item.patternType || 'stripe';
    const color = item.colorCode || 'pink';
    const colorHex = {
      pink: '#d35097',
      blue: '#4dbee3',
      green: '#7fa93e',
      gold: '#e1d328',
      anchor: '#111111'
    }[color] || '#d35097';
    
    const patternId = `card-pattern-${patternType}-${color}`;
    
    let patternSVG = null;
    switch (patternType) {
      case 'stripe':
        patternSVG = (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="20" height="20" fill="#fdfdfd" />
            <line x1="0" y1="0" x2="0" y2="20" stroke={colorHex} strokeWidth="8" />
            <line x1="0" y1="0" x2="0" y2="20" stroke="#ffffff" strokeWidth="2" />
          </pattern>
        );
        break;
      case 'dots':
        patternSVG = (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fdfdfd" />
            <circle cx="12" cy="12" r="5" fill={colorHex} />
          </pattern>
        );
        break;
      case 'grid':
        patternSVG = (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#fdfdfd" />
            <rect width="20" height="20" fill="none" stroke={colorHex} strokeWidth="3" />
          </pattern>
        );
        break;
      case 'chevron':
        patternSVG = (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fdfdfd" />
            <path d="M0 12 L12 0 L24 12 L12 24 Z" fill="none" stroke={colorHex} strokeWidth="3" />
          </pattern>
        );
        break;
      default:
        patternSVG = (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={colorHex} />
          </pattern>
        );
    }

    return (
      <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>{patternSVG}</defs>
        <rect x="40" y="40" width="120" height="120" rx="12" ry="12" fill={`url(#${patternId})`} stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
        <rect x="93" y="40" width="14" height="120" fill="#ffffff" opacity="0.95" />
        <rect x="99" y="40" width="2" height="120" fill="var(--color-brand-accent, #e1d328)" />
        <rect x="40" y="93" width="120" height="14" fill="#ffffff" opacity="0.95" />
        <rect x="40" y="99" width="120" height="2" fill="var(--color-brand-accent, #e1d328)" />
        <path d="M95 100 L75 135 L85 133 Z" fill="#ffffff" opacity="0.95" />
        <path d="M105 100 L125 135 L115 133 Z" fill="#ffffff" opacity="0.95" />
        <path d="M100 100 C70 70 50 110 100 100" fill="#ffffff" opacity="0.95" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        <path d="M100 100 C130 70 150 110 100 100" fill="#ffffff" opacity="0.95" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        <circle cx="100" cy="100" r="7" fill="#ffffff" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        <circle cx="100" cy="100" r="3" fill="var(--color-brand-accent, #e1d328)" />
      </svg>
    );
  };

  return (
    <Card 
      className={`registry-item-card ${isPurchased ? 'purchased' : ''}`}
      variant="default"
    >
      <Card.Header>
        <div className="product-card__image" style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {isVirtualPackaging ? (
            <div style={{ width: '100%', height: '100%', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderPackagingPreview()}
            </div>
          ) : item.image ? (
            <img src={item.image} alt={displayName} className="item-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%' }}>
              <DefaultProductImage />
            </div>
          )}
          
          {isPurchased && (
            <div className="purchased-overlay">
              <span className="label-md">Gifted</span>
            </div>
          )}
          
          {viewMode === 'parent' && (
            <Button 
              variant="ghost"
              className="product-card__wishlist" 
              aria-label="Remove from registry"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove && onRemove(item.id);
              }}
              style={{ backgroundColor: 'var(--surface-container-low)', zIndex: 10, position: 'absolute', top: '8px', right: '8px' }}
              icon={<Trash2 size={16} />}
            />
          )}
        </div>
        <span className="product-card__tier" style={{ marginTop: 'var(--space-2)' }}>{item.category}</span>
      </Card.Header>

      <Card.Body>
        <h3 className="product-card__name" style={{ flex: 1, minHeight: '44px' }}>{displayName}</h3>
        <div className="product-card__price-row">
          <span className="product-card__price">{formatPrice(item.price)}</span>
        </div>
      </Card.Body>

      {viewMode !== 'parent' && (
        <Card.Actions>
          {!isPurchased ? (
            <>
              <Button 
                variant="primary" 
                onClick={() => onBuy(item.id)} 
                style={{ flex: 1 }}
                icon={<ShoppingBag size={16} />}
              >
                Buy Now
              </Button>
              {item.isGroupGifting && (
                <Button 
                  variant="secondary" 
                  onClick={() => onContribute(item.id)} 
                  style={{ flex: 1 }}
                  icon={<Gift size={16} />}
                >
                  Contribute
                </Button>
              )}
            </>
          ) : (
            <Button variant="secondary" disabled style={{ flex: 1 }}>
              Gifted
            </Button>
          )}
        </Card.Actions>
      )}
    </Card>
  );
};

export default RegistryItemCard;
