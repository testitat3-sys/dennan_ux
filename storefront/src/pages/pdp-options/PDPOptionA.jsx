import React, { useState } from 'react';
import { Flame, Heart, FileText, ClipboardList, MessageSquare } from 'lucide-react';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import { getProductImages } from '../../utils/productImageUtils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Toast from '../../components/ui/Toast';
import './PDPOptionA.css';

// Option A — "Refined current layout": same two-column structure as the live PDP,
// but with a gradient age-fit bar, colorful pill tags, and a bolder brand-pink CTA.
const PDPOptionA = ({ product, reviews }) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState('');

  const displayName = stripBrandFromName(product.name, product.brand);
  const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;
  const images = getProductImages(product);
  const discountPct = product.wasPrice
    ? Math.round(((product.wasPrice - product.price) / product.wasPrice) * 100)
    : null;

  return (
    <div className="pdpA">
      <nav className="pdpA__breadcrumbs">
        <span>Home</span> <span>/</span> <span>{product.stage}</span> <span>/</span>
        <span className="is-current">{displayName}</span>
      </nav>

      <div className="pdpA__grid">
        <div className="pdpA__gallery">
          <div className="pdpA__main-image">
            <img src={images[activeImageIndex]} alt={displayName} />
            {isOutOfStock && <span className="pdpA__oos-ribbon">Out of Stock</span>}
          </div>
          <div className="pdpA__thumbnails">
            {images.map((img, idx) => (
              <button
                key={idx}
                className={`pdpA__thumbnail ${activeImageIndex === idx ? 'is-active' : ''}`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="pdpA__info">
          <div className="pdpA__header">
            <span className="pdpA__brand">{product.brand}</span>
            {product.unitsSold > 0 && (
              <span className="pdpA__sales-pill">
                <Flame size={13} strokeWidth={2.5} fill="currentColor" />
                {product.unitsSold.toLocaleString()}+ bought this
              </span>
            )}
          </div>

          <h1 className="pdpA__title">{displayName}</h1>

          <div className="pdpA__price-row">
            <span className="pdpA__price">{formatPrice(product.price)}</span>
            {product.wasPrice && <span className="pdpA__was-price">{formatPrice(product.wasPrice)}</span>}
            {discountPct && <span className="pdpA__discount-badge">-{discountPct}%</span>}
          </div>

          <div className="pdpA__age-scale">
            <div className="pdpA__age-scale-header">
              <span>Age Appropriateness</span>
              <span className="pdpA__age-scale-status">{product.ageScale?.label}</span>
            </div>
            <div className="pdpA__age-scale-track">
              <div
                className="pdpA__age-scale-fill"
                style={{ width: `${(product.ageScale?.current || 0.5) * 100}%` }}
              >
                <div className="pdpA__age-scale-dot" />
              </div>
            </div>
            <div className="pdpA__age-scale-markers">
              <span>Expectant</span>
              <span>Newborn</span>
              <span>Toddler</span>
            </div>
          </div>

          <div className="pdpA__tags">
            {isOutOfStock && <span className="pdpA__tag pdpA__tag--red">Out of Stock</span>}
            {product.tags?.map((tag, idx) => (
              <span key={idx} className={`pdpA__tag pdpA__tag--${tag.type}`}>
                {tag.text}
              </span>
            ))}
          </div>

          <div className="pdpA__quantity">
            <span className="pdpA__control-label">Quantity</span>
            <div className="pdpA__stepper">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} disabled={isOutOfStock}>+</button>
            </div>
          </div>

          <div className="pdpA__actions">
            <Button
              variant="primary"
              className="pdpA__add-btn"
              disabled={isOutOfStock}
              onClick={() => setToast(`${displayName} added to cart!`)}
            >
              Add to cart
            </Button>
            <Button
              variant="secondary"
              className="pdpA__wishlist-btn"
              icon={<Heart size={18} fill={isSaved ? 'var(--color-brand-primary)' : 'none'} stroke={isSaved ? 'var(--color-brand-primary)' : 'currentColor'} />}
              onClick={() => setIsSaved((s) => !s)}
            >
              {isSaved ? 'In Wishlist' : 'Save'}
            </Button>
          </div>

          {isOutOfStock && (
            <Card variant="compact" hasShadow={false} className="pdpA__notify">
              <label>
                <input type="checkbox" /> Remind me when back in stock
              </label>
            </Card>
          )}
        </div>
      </div>

      <div className="pdpA__details">
        <div className="pdpA__tabs">
          <button className={activeTab === 'details' ? 'is-active' : ''} onClick={() => setActiveTab('details')}>
            <FileText size={16} /> Description
          </button>
          <button className={activeTab === 'specs' ? 'is-active' : ''} onClick={() => setActiveTab('specs')}>
            <ClipboardList size={16} /> Specifications
          </button>
          <button className={activeTab === 'reviews' ? 'is-active' : ''} onClick={() => setActiveTab('reviews')}>
            <MessageSquare size={16} /> Reviews ({reviews?.length || 0})
          </button>
        </div>

        <div className="pdpA__tab-content">
          {activeTab === 'details' && (
            <div>
              <p>{product.description}</p>
              <ul className="pdpA__facts">
                <li>Material: {product.material}</li>
                <li>Weight: {product.weightGrams}g</li>
                <li>Allergens: {product.allergens?.join(', ')}</li>
              </ul>
            </div>
          )}
          {activeTab === 'specs' && (
            <table className="pdpA__specs-table">
              <tbody>
                {product.specifications?.map((spec, idx) => (
                  <tr key={idx}>
                    <th>{spec.label}</th>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'reviews' && (
            <div className="pdpA__reviews">
              {reviews?.map((review, idx) => (
                <Card key={idx} hasShadow={false} className="pdpA__review-card">
                  <div className="pdpA__review-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                  <p className="pdpA__review-text">"{review.text}"</p>
                  <span className="pdpA__review-author">— {review.author}, child {review.childAge}</span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast isOpen={!!toast} message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default PDPOptionA;
