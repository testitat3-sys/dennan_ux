import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './ProductSection.css';
import ProductCard from '../products/ProductCard';
import CardGrid from '../ui/CardGrid';
import Text from '../ui/Text';

const ProductSection = ({ title, eyebrow, products, viewAllLink, viewAllText = 'See more', isScroll = false, desktopScrollMobileGrid = false, onAddToCart }) => {
  return (
    <section className="most-loved-section">
      {/* ── Section header: title left, see-more right ── */}
      <div className="rec-rail__header">
        <div className="rec-rail__header-text">
          {eyebrow && (
            <Text role="label-sm" as="p" color="brand-primary" className="section__eyebrow">
              {eyebrow}
            </Text>
          )}
          <Text role="headline-lg" as="h2">
            {title}
          </Text>
        </div>

        {viewAllLink && (
          <Link to={viewAllLink} className="section__link-action" aria-label={`View all ${title} products`} title={`View all ${title} products`}>
            {viewAllText}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* ── Product content ── */}
      {desktopScrollMobileGrid ? (
        <div className="desktop-scroll-mobile-grid-wrap">
          <div className="desktop-scroll-mobile-grid">
            {products.map((product, i) => (
              <ProductCard key={i} product={product} onAddToCart={onAddToCart} />
            ))}
            {viewAllLink && (
              <Link to={viewAllLink} className="desktop-scroll-see-more-card" aria-label={`View all ${title} products`} title={`View all ${title} products`}>
                <div className="see-more-card__circle">
                  <ArrowRight size={24} />
                </div>
                <span className="see-more-card__text">See More</span>
              </Link>
            )}
          </div>
        </div>
      ) : isScroll ? (
        <div className="product-scroll-wrap">
          <div className="product-scroll">
            {products.map((product, i) => (
              <ProductCard key={i} product={product} onAddToCart={onAddToCart} />
            ))}
          </div>
        </div>
      ) : (
        <div className="product-grid-wrap">
          <CardGrid columns={4} mobileColumns={2} gap="default">
            {products.map((product, i) => (
              <ProductCard key={i} product={product} onAddToCart={onAddToCart} />
            ))}
          </CardGrid>
        </div>
      )}
    </section>
  );
};

export default ProductSection;
