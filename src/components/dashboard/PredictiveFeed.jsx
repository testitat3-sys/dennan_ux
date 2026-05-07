import React from 'react';
import './PredictiveFeed.css';
import { getProducts } from '../../services/api';
import ProductCard from '../ui/ProductCard';
import ProductCardSkeleton from '../ui/ProductCardSkeleton';

const PredictiveFeed = ({ type, stageInfo, onAddToCart }) => {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts();
      setProducts(data || []);
      setLoading(false);
    };
    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="predictive-feed" aria-hidden="true">
        <div className="predictive-feed__grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

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
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

    </div>
  );
};

export default PredictiveFeed;

