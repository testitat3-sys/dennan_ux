import React from 'react';
import ProductCard from '../products/ProductCard';
import Text from '../ui/Text';
import './RegistrySuggestionRail.css';

const RegistrySuggestionRail = ({ products, onAddToRegistry, onAddToCart, title, eyebrow }) => {
  return (
    <section className="registry-suggestion-rail">
      <div className="registry-suggestion-rail__header">
        {eyebrow && (
          <Text role="label-sm" as="p" color="brand-primary" className="registry-suggestion-rail__eyebrow">
            {eyebrow}
          </Text>
        )}
        {title && (
          <Text role="headline-lg" as="h2">
            {title}
          </Text>
        )}
      </div>

      <div className="registry-rail-wrap">
        <div className="registry-rail">
          {products.map((product) => (
            <ProductCard
              key={product.id || product._id}
              product={product}
              onAddToCart={onAddToCart}
              registryMode
              onAddToRegistry={onAddToRegistry}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RegistrySuggestionRail;
