import React from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ product, className = '', onAddToCart }) => {
  const { id, image, name, price, wasPrice, tier, badge, tags, variant } = product;
  
  return (
    <article className={`product-card ${variant ? `product-card--${variant}` : ''} ${className}`}>
      <Link to={`/product/${id}`} className="product-card__image-link">
        <div className="product-card__image">
          <img src={image} alt={name} />
          {badge && <span className="product-card__badge">{badge}</span>}
          {tags && (
            <div className="product-card__tags">
              {tags.map((tag, i) => (
                <span key={i} className={`tag tag--${tag.type}`}>{tag.text}</span>
              ))}
            </div>
          )}
          <button 
            className="product-card__wishlist" 
            aria-label="Save to wishlist"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </Link>
      <div className="product-card__info">
        <span className="product-card__tier">{tier}</span>
        <Link to={`/product/${id}`} className="product-card__name-link">
          <h3 className="product-card__name">{name}</h3>
        </Link>
        <div className="product-card__price-row">
          <span className="product-card__price">{price}</span>
          {wasPrice && <span className="product-card__price-was">{wasPrice}</span>}
        </div>
        <button 
          className="product-card__add" 
          onClick={(e) => {
            e.preventDefault();
            onAddToCart && onAddToCart(product);
          }}
        >
          Add to cart
        </button>
      </div>
    </article>
  );
};

export default ProductCard;

