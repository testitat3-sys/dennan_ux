import React from 'react';
import RegistryItemCard from './RegistryItemCard';
import './RegistryCategoryGroup.css';

const RegistryCategoryGroup = ({ category, title, items, viewMode, onBuy, onContribute, onRemove }) => {
  if (items.length === 0) return null;

  // Use the explicit title override if provided, otherwise fall back to the category string
  const displayTitle = title || category;

  return (
    <section className="category-group">
      <div className="category-header">
        <h2 className="headline-md">{displayTitle}</h2>
        <span className="count-badge">{items.length} items</span>
      </div>
      
      <div className="items-grid">
        {items.map(item => (
          <RegistryItemCard 
            key={item.id} 
            item={item} 
            viewMode={viewMode}
            onBuy={onBuy}
            onContribute={onContribute}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
};

export default RegistryCategoryGroup;
