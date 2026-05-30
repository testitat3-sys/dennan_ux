import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ProductCardSkeleton from '../ui/ProductCardSkeleton';
import { Plus } from 'lucide-react';

const SuggestionProductCard = ({ product, onAddToRegistry, isGridItem = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { image, name, price, wasPrice, brand, tags, unitsSold } = product;
  const id = product.id || product._id;

  if (!imageLoaded && !imageError) {
    return (
      <div className={isGridItem ? "suggestion-grid-item" : "touch-scroll-item"} style={isGridItem ? { position: 'relative', width: '100%' } : { flex: '0 0 240px', position: 'relative' }}>
        <ProductCardSkeleton />
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

  return (
    <Card
      className={isGridItem ? "suggestion-grid-item" : "touch-scroll-item"}
      style={isGridItem ? { width: '100%' } : { flex: '0 0 240px' }}
      variant="default"
    >
      <Card.Header>
        <Link to={`/product/${id}`} className="product-card__image-link" style={{ display: 'block', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
          <div className="product-card__image" style={{ height: '100%' }}>
            <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="product-card__tags">
              {unitsSold !== undefined && unitsSold > 0 && (
                <span className="tag tag--sales">
                  {unitsSold} sold
                </span>
              )}
              {tags && tags
                .filter(tag => tag && tag.text && tag.text.toLowerCase() !== 'in stock')
                .map((tag, i) => (
                  <span key={i} className={`tag tag--${tag.type}`}>{tag.text}</span>
                ))
              }
            </div>
          </div>
        </Link>
      </Card.Header>

      <Card.Body>
        <div>
          <span className="product-card__tier" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{brand || product.brand}</span>
          <Link to={`/product/${id}`} className="product-card__name-link">
            <h3 className="product-card__name" style={{ fontSize: '0.95rem', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: '2px', lineHeight: '1.2' }}>{name}</h3>
          </Link>
          <div className="product-card__price-row" style={{ marginTop: 'var(--space-1)', display: 'flex', gap: 'var(--space-2)' }}>
            <span className="product-card__price" style={{ fontSize: '0.95rem', fontWeight: '700' }}>UGX {price.toLocaleString()}</span>
            {wasPrice && <span className="product-card__price-was" style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>UGX {wasPrice.toLocaleString()}</span>}
          </div>
        </div>
      </Card.Body>

      <Card.Actions>
        <Button
          variant="primary"
          fullWidth
          onClick={(e) => {
            e.preventDefault();
            onAddToRegistry(product);
          }}
          icon={<Plus size={16} />}
        >
          <span className="desktop-only">Add to Registry</span>
          <span className="mobile-only">Add</span>
        </Button>
      </Card.Actions>
    </Card>
  );
};

export default SuggestionProductCard;
