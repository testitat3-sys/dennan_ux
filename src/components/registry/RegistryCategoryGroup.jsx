import React from 'react';
import RegistryItemCard from './RegistryItemCard';
import './RegistryCategoryGroup.css';

const RegistryCategoryGroup = ({ category, items, viewMode, onToggleMustHave, onBuy, onContribute }) => {
  if (items.length === 0) return null;

  return (
    <section className="category-group">
      <div className="category-header">
        <h2 className="headline-md">{category}</h2>
        <span className="count-badge">{items.length} items</span>
      </div>
      
      <div className="items-grid">
        {items.map(item => (
          <RegistryItemCard 
            key={item.id} 
            item={item} 
            viewMode={viewMode}
            onToggleMustHave={onToggleMustHave}
            onBuy={onBuy}
            onContribute={onContribute}
          />
        ))}
      </div>
    </section>
  );
};

export default RegistryCategoryGroup;

