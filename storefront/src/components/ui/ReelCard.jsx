import React, { useState } from 'react';
import Button from './Button';

const ReelCard = ({ reel }) => {
  const [isShopping, setIsShopping] = useState(false);
  const { image, label, caption, badge, multiChip, products } = reel;

  const toggleProductSheet = () => setIsShopping(!isShopping);

  return (
    <article className={`reel-card ${isShopping ? 'is-shopping' : ''}`}>
      <div className="reel-card__video-mock">
        <img src={image} alt={caption} className="reel-card__image" />
        <div className="reel-card__play" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div className="reel-card__overlay-top">
          {badge && <span className="reel-card__badge">{badge}</span>}
          {multiChip && <div className="reel-card__multi-chip">{multiChip}</div>}
        </div>
        <div className="reel-card__overlay-bottom">
          <p className="reel-card__label">{label}</p>
          <h3 className="reel-card__caption">{caption}</h3>
        </div>
        <div className="reel-card__controls">
          <Button 
            variant="ghost"
            className="reel-card__mute" 
            aria-label="Unmute"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
          />
        </div>
      </div>
      <Button 
        variant="primary"
        fullWidth
        className="reel-card__shop-btn" 
        onClick={toggleProductSheet}
      >
        Buy Now
      </Button>
      
      <div className="mini-product-sheet">
        <Button 
          variant="ghost"
          className="mini-product-sheet__close" 
          onClick={toggleProductSheet}
          icon={<span>&times;</span>}
        />
        <div className="mini-product-sheet__content">
          {products && products.length === 1 ? (
            <>
              <img src={products[0].image} alt={products[0].title} className="mini-product-sheet__img" />
              <div className="mini-product-sheet__info">
                <h4 className="mini-product-sheet__title">{products[0].title}</h4>
                <p className="mini-product-sheet__price">{products[0].price}</p>
                {products[0].options && <div className="mini-product-sheet__options"><span className="label-md">{products[0].options}</span></div>}
                <Button variant="primary" size="sm">Add to cart</Button>
              </div>
            </>
          ) : products && products.length > 1 ? (
            <div className="mini-product-sheet__list" style={{ width: '100%' }}>
              {products.map((item, i) => (
                <div key={i} className="mini-product-sheet__list-item">
                  <span>{item.title || item.name}</span>
                  <Button variant="primary" size="sm">Add</Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default ReelCard;

