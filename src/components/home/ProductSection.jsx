import { Link } from 'react-router-dom';
import './ProductSection.css';
import ProductCard from '../ui/ProductCard';
import CardGrid from '../ui/CardGrid';
import Button from '../ui/Button';

const ProductSection = ({ products, onAddToCart }) => {
  return (
    <CardGrid columns={4} mobileColumns={2} gap="default">
      {products.map((product, i) => (
        <ProductCard key={i} product={product} onAddToCart={onAddToCart} />
      ))}
    </CardGrid>
  );
};

export default ProductSection;

