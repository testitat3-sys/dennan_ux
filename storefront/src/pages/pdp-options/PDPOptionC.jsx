import React, { useState } from 'react';
import { Heart, Flame, ShieldCheck, Truck } from 'lucide-react';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Toast from '../../components/ui/Toast';
import './PDPOptionC.css';

// Option C — "Compact/conversion-focused layout": vertical thumbnail rail,
// urgency strip promoted next to price, a shadowed buy-box card, and a
// sticky bottom add-to-cart bar on narrow viewports.
const PDPOptionC = ({ product, reviews }) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState('');

  const displayName = stripBrandFromName(product.name, product.brand);
  const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;
  const images = getProductImages(product);

  const handleAddToCart = () => setToast(`${displayName} added to cart!`);

  return (
    <div className="pdpC">
      <div className="pdpC__grid">
        <div className="pdpC__rail">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={`pdpC__rail-item ${activeImageIndex === idx ? 'is-active' : ''}`}
              onClick={() => setActiveImageIndex(idx)}
            >
              <img src={img} alt="" />
            </button>
          ))}
        </div>

        <div className="pdpC__main-image">
          <img src={images[activeImageIndex]} alt={displayName} />
        </div>

        <div className="pdpC__buybox-col">
          <Card className="pdpC__buybox" hasShadow>
            <span className="pdpC__brand">{product.brand}</span>
            <h1 className="pdpC__title">{displayName}</h1>

            <div className="pdpC__urgency">
              {product.unitsSold > 0 && (
                <span className="pdpC__urgency-pill">
                  <Flame size={13} strokeWidth={2.5} fill="currentColor" /> Hot: {product.unitsSold === 1 ? '1 person has' : `${product.unitsSold.toLocaleString()} people have`} just bought this
                </span>
              )}
              {isOutOfStock && <span className="pdpC__urgency-pill pdpC__urgency-pill--red">Out of Stock</span>}
            </div>

            <div className="pdpC__price-row">
              <span className="pdpC__price">{formatPrice(product.price)}</span>
              {product.wasPrice && <span className="pdpC__was-price">{formatPrice(product.wasPrice)}</span>}
            </div>

            <div className="pdpC__tags">
              {product.tags?.map((tag, idx) => (
                <span key={idx} className="pdpC__tag">{tag.text}</span>
              ))}
            </div>

            <div className="pdpC__age-scale">
              <div className="pdpC__age-scale-header">
                <span>Age Appropriateness</span>
                <span>{product.ageScale?.label}</span>
              </div>
              <div className="pdpC__age-scale-track">
                <div className="pdpC__age-scale-fill" style={{ width: `${(product.ageScale?.current || 0.5) * 100}%` }} />
              </div>
            </div>

            <div className="pdpC__row">
              <div>
                <span className="pdpC__control-label">Quantity</span>
                <div className="pdpC__stepper">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)} disabled={isOutOfStock}>+</button>
                </div>
              </div>
              <Button
                variant="secondary"
                className="pdpC__wishlist-btn"
                icon={<Heart size={18} fill={isSaved ? 'var(--color-brand-primary)' : 'none'} stroke={isSaved ? 'var(--color-brand-primary)' : 'currentColor'} />}
                onClick={() => setIsSaved((s) => !s)}
              >
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            </div>

            {isOutOfStock ? (
              <Button
                variant="secondary"
                fullWidth
                className="pdpC__notify-btn"
              >
                Remind me when back in stock
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                className="pdpC__add-btn"
                onClick={handleAddToCart}
              >
                Add to cart · {formatPrice(product.price * quantity)}
              </Button>
            )}

            <div className="pdpC__trust">
              <span><ShieldCheck size={16} /> Paediatrician approved</span>
              <span><Truck size={16} /> Kampala delivery in 24h</span>
            </div>
          </Card>
        </div>
      </div>

      <div className="pdpC__details">
        <div className="pdpC__section">
          <h2>Description</h2>
          <p>{product.description}</p>
        </div>
        <div className="pdpC__section">
          <h2>Specifications</h2>
          <table className="pdpC__specs-table">
            <tbody>
              {product.specifications?.map((spec, idx) => (
                <tr key={idx}>
                  <th>{spec.label}</th>
                  <td>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pdpC__section">
          <h2>Reviews ({reviews?.length || 0})</h2>
          <div className="pdpC__reviews">
            {reviews?.map((review, idx) => (
              <Card key={idx} hasShadow={false} className="pdpC__review-card">
                <div className="pdpC__review-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                <p>"{review.text}"</p>
                <span>— {review.author}, child {review.childAge}</span>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="pdpC__sticky-bar">
        <div className="pdpC__sticky-price">{formatPrice(product.price)}</div>
        <Button variant="primary" disabled={isOutOfStock} onClick={handleAddToCart} className="pdpC__sticky-btn">
          Add to cart
        </Button>
      </div>

      <Toast isOpen={!!toast} message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default PDPOptionC;
