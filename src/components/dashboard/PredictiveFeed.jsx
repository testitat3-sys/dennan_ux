import React from 'react';
import { products } from '../../data/productData';

const PredictiveFeed = ({ type, stageInfo }) => {
  const filteredProducts = products.filter(p => {
    if (stageInfo.type === 'expecting') {
      const week = type === 'now' ? stageInfo.week : stageInfo.week + 4;
      return p.stage === 'mother' && (!p.minWeek || week >= p.minWeek) && (!p.maxWeek || week <= p.maxWeek);
    } else {
      const month = type === 'now' ? stageInfo.months : stageInfo.months + 3;
      return (p.stage === 'newborn' || p.stage === 'kid') && 
             (!p.minMonth || month >= p.minMonth) && 
             (!p.maxMonth || month <= p.maxMonth);
    }
  });

  // Limit to 4 for now
  const displayProducts = filteredProducts.slice(0, 4);

  if (displayProducts.length === 0) {
    return <p className="predictive-feed__empty">Discovering more for your stage...</p>;
  }

  return (
    <div className="predictive-feed">
      <div className="predictive-feed__grid">
        {displayProducts.map(product => (
          <div key={product.id} className="predictive-card">
            <div className="predictive-card__image-container">
              <img src={product.image} alt={product.name} className="predictive-card__image" />
              {product.tags && product.tags.length > 0 && (
                <div className="predictive-card__badge">
                  {product.tags[0].text}
                </div>
              )}
            </div>
            <div className="predictive-card__info">
              <span className="predictive-card__category">{product.category}</span>
              <h4 className="predictive-card__name">{product.name}</h4>
              <span className="predictive-card__price">{product.price}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .predictive-feed__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 24px;
        }
        
        .predictive-card {
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        
        .predictive-card:hover {
          transform: translateY(-4px);
        }
        
        .predictive-card__image-container {
          position: relative;
          aspect-ratio: 4/5;
          background: var(--surface-container-low);
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 16px;
        }
        
        .predictive-card__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        
        .predictive-card:hover .predictive-card__image {
          transform: scale(1.05);
        }
        
        .predictive-card__badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 8px;
          background: white;
          color: var(--color-anchor);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: 4px;
          box-shadow: var(--shadow-ambient);
        }
        
        .predictive-card__category {
          display: block;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-tertiary);
          margin-bottom: 4px;
        }
        
        .predictive-card__name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-anchor);
          margin-bottom: 8px;
          line-height: 1.4;
        }
        
        .predictive-card__price {
          font-family: 'Newsreader', serif;
          font-size: 1rem;
          color: var(--color-anchor);
        }
        
        .predictive-feed__empty {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-style: italic;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default PredictiveFeed;
