import React from 'react';
import { formatPrice } from '../../utils/priceUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Trash2, ShoppingBag, Gift } from 'lucide-react';
import './RegistryItemCard.css';

const RegistryItemCard = ({ item, viewMode, onBuy, onContribute, onRemove }) => {
  const isPurchased = item.status === 'purchased';

  return (
    <Card 
      className={`registry-item-card ${isPurchased ? 'purchased' : ''}`}
      variant="default"
    >
      <Card.Header>
        <div className="product-card__image" style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <img src={item.image} alt={item.name} className="item-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          
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
        <h3 className="product-card__name" style={{ flex: 1, minHeight: '44px' }}>{item.name}</h3>
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
