import React from 'react';
import './RegistryItemCard.css';

const RegistryItemCard = ({ item, viewMode, onToggleMustHave, onBuy, onContribute }) => {
  const isPurchased = item.status === 'purchased';
  const progress = item.isGroupGifting 
    ? (item.contributions.reduce((acc, curr) => acc + curr.amount, 0) / item.price) * 100 
    : 0;

  return (
    <div className={`registry-item-card ${isPurchased ? 'purchased' : ''}`}>
      <div className="card-image-container">
        <img src={item.image} alt={item.name} className="item-image" />
        {item.isMustHave && (
          <div className="must-have-badge">
            <span className="label-sm">Most Wanted</span>
          </div>
        )}
        {isPurchased && (
          <div className="purchased-overlay">
            <span className="label-sm">Purchased</span>
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="item-meta">
          <span className="label-sm text-tertiary">{item.category}</span>
          <h3 className="title-md">{item.name}</h3>
          <p className="price-tag">£{item.price.toFixed(2)}</p>
        </div>

        {item.isGroupGifting && !isPurchased && (
          <div className="group-gifting-progress">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            </div>
            <p className="label-sm text-secondary">{Math.round(progress)}% contributed</p>
          </div>
        )}

        <div className="card-actions">
          {viewMode === 'parent' ? (
            <>
              <button 
                className={`btn-action ${item.isMustHave ? 'active' : ''}`}
                onClick={() => onToggleMustHave(item.id)}
              >
                {item.isMustHave ? 'Unmark' : 'Mark as Must-Have'}
              </button>
              <button className="btn-action">Edit</button>
            </>
          ) : (
            <>
              {!isPurchased ? (
                <>
                  <button className="btn-primary" onClick={() => onBuy(item.id)}>
                    Buy Now
                  </button>
                  {item.isGroupGifting && (
                    <button className="btn-secondary" onClick={() => onContribute(item.id)}>
                      Contribute
                    </button>
                  )}
                </>
              ) : (
                <button className="btn-secondary disabled" disabled>
                  Gifted
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistryItemCard;
