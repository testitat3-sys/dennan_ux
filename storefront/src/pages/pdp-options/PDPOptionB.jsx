import React, { useState } from 'react';
import { Heart, Flame, ChevronDown } from 'lucide-react';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import { getProductImages } from '../../utils/productImageUtils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Toast from '../../components/ui/Toast';
import './PDPOptionB.css';

// Option B — "Editorial/magazine layout": full-width hero image with the title
// overlaid, a sticky buy-box beside a long-form story column, and accordion detail sections.
const PDPOptionB = ({ product, reviews }) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [openSection, setOpenSection] = useState('details');
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState('');

  const displayName = stripBrandFromName(product.name, product.brand);
  const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;
  const images = getProductImages(product);

  const toggleSection = (key) => setOpenSection((prev) => (prev === key ? null : key));

  return (
    <div className="pdpB">
      <div className="pdpB__hero">
        <img src={images[activeImageIndex]} alt={displayName} className="pdpB__hero-img" />
        <div className="pdpB__hero-scrim" />
        {isOutOfStock && <span className="pdpB__oos-badge">Out of Stock</span>}
        {product.unitsSold > 0 && (
          <span className="pdpB__sales-badge">
            <Flame size={13} strokeWidth={2.5} fill="currentColor" /> {product.unitsSold.toLocaleString()}+ bought
          </span>
        )}
        <div className="pdpB__hero-text">
          <span className="pdpB__brand">{product.brand}</span>
          <h1 className="pdpB__title">{displayName}</h1>
        </div>
        {images.length > 1 && (
          <div className="pdpB__filmstrip">
            {images.map((img, idx) => (
              <button
                key={idx}
                className={`pdpB__filmstrip-item ${activeImageIndex === idx ? 'is-active' : ''}`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdpB__body">
        <div className="pdpB__story">
          <div className="pdpB__chip-rail">
            {isOutOfStock && <span className="pdpB__chip pdpB__chip--red">Out of Stock</span>}
            {product.tags?.map((tag, idx) => (
              <span key={idx} className="pdpB__chip">{tag.text}</span>
            ))}
          </div>

          <p className="pdpB__lede">{product.description}</p>

          <div className="pdpB__accordion">
            <div className="pdpB__accordion-item">
              <button className="pdpB__accordion-head" onClick={() => toggleSection('details')}>
                <span>Details</span>
                <ChevronDown size={18} className={openSection === 'details' ? 'is-open' : ''} />
              </button>
              {openSection === 'details' && (
                <div className="pdpB__accordion-body">
                  <ul>
                    <li>Material: {product.material}</li>
                    <li>Weight: {product.weightGrams}g</li>
                    <li>Allergens: {product.allergens?.join(', ')}</li>
                    <li>Usage: {product.usageInstructions}</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="pdpB__accordion-item">
              <button className="pdpB__accordion-head" onClick={() => toggleSection('specs')}>
                <span>Specifications</span>
                <ChevronDown size={18} className={openSection === 'specs' ? 'is-open' : ''} />
              </button>
              {openSection === 'specs' && (
                <div className="pdpB__accordion-body">
                  <table className="pdpB__specs-table">
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
              )}
            </div>

            <div className="pdpB__accordion-item">
              <button className="pdpB__accordion-head" onClick={() => toggleSection('reviews')}>
                <span>Reviews ({reviews?.length || 0})</span>
                <ChevronDown size={18} className={openSection === 'reviews' ? 'is-open' : ''} />
              </button>
              {openSection === 'reviews' && (
                <div className="pdpB__accordion-body pdpB__reviews">
                  {reviews?.map((review, idx) => (
                    <div key={idx} className="pdpB__review">
                      <div className="pdpB__review-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      <p>"{review.text}"</p>
                      <span>— {review.author}, child {review.childAge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pdpB__buybox-col">
          <Card className="pdpB__buybox" hasShadow={true}>
            <div className="pdpB__price-row">
              <span className="pdpB__price">{formatPrice(product.price)}</span>
              {product.wasPrice && <span className="pdpB__was-price">{formatPrice(product.wasPrice)}</span>}
            </div>

            <div className="pdpB__age-scale">
              <div className="pdpB__age-scale-header">
                <span>Age Appropriateness</span>
                <span>{product.ageScale?.label}</span>
              </div>
              <div className="pdpB__age-scale-track">
                <div className="pdpB__age-scale-fill" style={{ width: `${(product.ageScale?.current || 0.5) * 100}%` }} />
              </div>
            </div>

            <div className="pdpB__quantity">
              <span className="pdpB__control-label">Quantity</span>
              <div className="pdpB__stepper">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} disabled={isOutOfStock}>+</button>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              disabled={isOutOfStock}
              onClick={() => setToast(`${displayName} added to cart!`)}
              className="pdpB__add-btn"
            >
              Add to cart
            </Button>
            <Button
              variant="secondary"
              fullWidth
              className="pdpB__wishlist-btn"
              icon={<Heart size={18} fill={isSaved ? 'var(--color-brand-primary)' : 'none'} stroke={isSaved ? 'var(--color-brand-primary)' : 'currentColor'} />}
              onClick={() => setIsSaved((s) => !s)}
            >
              {isSaved ? 'In Wishlist' : 'Save to Wishlist'}
            </Button>

            {isOutOfStock && (
              <label className="pdpB__notify">
                <input type="checkbox" /> Remind me when back in stock
              </label>
            )}
          </Card>
        </div>
      </div>

      <Toast isOpen={!!toast} message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default PDPOptionB;
