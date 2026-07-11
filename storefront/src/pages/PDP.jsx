import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice } from '../utils/priceUtils';
import { stripBrandFromName } from '../utils/productNameUtils';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import PDPSkeleton from '../components/ui/PDPSkeleton';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import { FileText, ClipboardList, MessageSquare } from 'lucide-react';
import ReviewModal from '../components/checkout/ReviewModal';
import DefaultProductImage from '../components/products/DefaultProductImage';
import './PDP.css';

const formatUnitsSold = (units) => {
  if (units >= 1000) {
    return `${(units / 1000).toFixed(1).replace(/\.0$/, '')}k+ sold`;
  }
  if (units > 20) {
    const rounded = Math.floor(units / 5) * 5;
    return `${rounded}+ sold`;
  }
  return `${units} sold`;
};

const PDP = () => {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('Newborn');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [notifyBackInStock, setNotifyBackInStock] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Live fetch from Convex — single indexed lookup instead of the whole catalog
  const fetchedProduct = useQuery(api.data.getProductBySlugOrId, productId ? { productId } : 'skip');
  const reviews = useQuery(api.products.getProductReviews, product && product._id ? { productId: product._id } : 'skip');

  useEffect(() => {
    if (fetchedProduct !== undefined) {
      if (fetchedProduct) {
        setProduct(fetchedProduct);
        setActiveImageIndex(0); // Reset to first image on product switch
      }
      setLoading(false);
    }
  }, [fetchedProduct, productId]);

  // Scroll animations observer
  useEffect(() => {
    if (loading || !product) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stagger-target').forEach((el, i) => {
            el.style.animationDelay = (i * 0.05) + 's';
            el.classList.add('stagger-in');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    // Stagger parent containers on scroll
    const animSections = document.querySelectorAll(
      '.pdp__gallery, .pdp__info, .pdp__details, .pdp__tab-content'
    );

    animSections.forEach((section) => {
      Array.from(section.children).forEach((child) => {
        child.classList.add('stagger-target');
      });
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, [loading, product, activeTab]);

  if (loading) {
    return <PDPSkeleton />;
  }

  if (!loading && !product) {
    return (
      <Page className="pdp pdp--not-found">
        <Page.Section className="pdp__container" style={{ textAlign: 'center', padding: 'var(--space-20) var(--space-4)' }}>
          <h1 className="display-sm" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-brand-primary)' }}>
            Product Not Found
          </h1>
          <p className="body-lg" style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto var(--space-8)' }}>
            We couldn't find the product details you were looking for. It may have been discontinued or moved to a new category.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Button to="/" variant="primary">
              Back to Home
            </Button>
            <Button to="/category/all" variant="secondary">
              Browse Store
            </Button>
          </div>
        </Page.Section>
      </Page>
    );
  }

  const id = product.id || product._id;
  const displayName = stripBrandFromName(product.name, product.brand);
  const isSaved = isInWishlist(id);
  const isOutOfStock = product.inventory !== undefined && product.inventory <= 0;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize);
    setToastMessage(`${displayName} added to cart!`);
    setShowToast(true);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product, notifyBackInStock);
    if (!isSaved) {
      setToastMessage(`${displayName} saved to wishlist!`);
    } else {
      setToastMessage(`Removed ${displayName} from wishlist.`);
    }
    setShowToast(true);
  };

  const handleNotifyToggle = () => {
    const nextState = !notifyBackInStock;
    setNotifyBackInStock(nextState);
    if (nextState) {
      toggleWishlist(product, true);
      setToastMessage(`Back-in-stock notifications activated!`);
      setShowToast(true);
    }
  };

  const sizes = ['Newborn', '0-3m', '3-6m', '6-9m'];
  const rawImages = product.images || (product.image ? [product.image] : []);
  const imagesList = rawImages.filter(Boolean);
  const hasNoImages = imagesList.length === 0;
  const displayImages = hasNoImages ? ['placeholder'] : imagesList;

  const renderReviewsList = () => (
    <div className="pdp__reviews">
      {reviews && reviews.length > 0 ? (
        reviews.map((review, idx) => (
          <Card key={idx} variant="default" hasShadow={false} className="review-card">
            <Card.Header className="review-header">
              <div className="review-rating">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              {review.childAge && <span className="review-age">Child: {review.childAge}</span>}
            </Card.Header>
            <Card.Body>
              <p className="review-text">"{review.text}"</p>
              <span className="review-author">— {review.author}</span>
            </Card.Body>
          </Card>
        ))
      ) : (
        <p className="no-reviews-text" style={{ textAlign: 'center', padding: 'var(--space-10) 0', color: 'var(--text-secondary)' }}>
          No reviews yet for this product. Be the first to <Button variant="link" onClick={() => setShowReviewModal(true)} style={{ display: 'inline', padding: 0 }}>leave one</Button>!
        </p>
      )}
    </div>
  );

  return (
    <Page className="pdp">
      <Page.Section className="pdp__container">
        {/* Breadcrumbs */}
        <nav className="pdp__breadcrumbs">
          <Link to="/">Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <Link to={`/category/${product.stage || 'all'}`}>
            {product.stage ? (product.stage.charAt(0).toUpperCase() + product.stage.slice(1)) : 'Products'}
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>{displayName}</span>
        </nav>

        <div className="pdp__grid">
          {/* Left: Image Gallery */}
          <div className="pdp__gallery">
            <div className="pdp__main-image">
              {/* Localized Shimmer Overlay */}
              {!loadedImages[activeImageIndex] && displayImages[activeImageIndex] !== 'placeholder' && (
                <div className="skeleton-shimmer" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 2,
                  backgroundColor: 'var(--skeleton-base)',
                  borderRadius: 'var(--radius-lg)'
                }} />
              )}

              {displayImages.length > 1 && activeImageIndex > 0 && (
                <Button
                  variant="ghost"
                  className="pdp__carousel-arrow pdp__carousel-arrow--left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => Math.max(0, prev - 1));
                  }}
                  aria-label="Previous image"
                  style={{ zIndex: 3 }}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>}
                />
              )}

              <div
                className="pdp__carousel-track"
                style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
              >
                {displayImages.map((imgUrl, idx) => (
                  <div className="pdp__carousel-slide" key={idx}>
                    {imgUrl === 'placeholder' ? (
                      <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <DefaultProductImage />
                      </div>
                    ) : (
                      <img
                        src={imgUrl}
                        alt={`${displayName} view ${idx + 1}`}
                        onLoad={() => setLoadedImages(prev => ({ ...prev, [idx]: true }))}
                        onError={() => setLoadedImages(prev => ({ ...prev, [idx]: true }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              {displayImages.length > 1 && activeImageIndex < displayImages.length - 1 && (
                <Button
                  variant="ghost"
                  className="pdp__carousel-arrow pdp__carousel-arrow--right"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => Math.min(displayImages.length - 1, prev + 1));
                  }}
                  aria-label="Next image"
                  style={{ zIndex: 3 }}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
                />
              )}
            </div>

            <div className="pdp__thumbnails">
              {displayImages.length > 1 && displayImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`pdp__thumbnail ${activeImageIndex === idx ? 'is-active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  {imgUrl === 'placeholder' ? (
                    <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <DefaultProductImage />
                    </div>
                  ) : (
                    <img src={imgUrl} alt={`${displayName} view ${idx + 1}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="pdp__info">
            <div className="pdp__header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pdp__brand">{product.brand}</span>
                {product.unitsSold !== undefined && product.unitsSold > 0 && (
                  <span className="tag tag--sales">
                    {formatUnitsSold(product.unitsSold)}
                  </span>
                )}
              </div>
              <h1 className="pdp__title">{displayName}</h1>
              <div className="pdp__price-wrap">
                <span className="pdp__price">{formatPrice(product.price)}</span>
                {product.wasPrice && <span className="pdp__was-price">{formatPrice(product.wasPrice)}</span>}
              </div>
            </div>

            {/* Age Fit Scale */}
            <div className="pdp__age-scale">
              <div className="age-scale__header">
                <span className="age-scale__label">Age Appropriateness</span>
                <span className="age-scale__status">{product.ageScale?.label}</span>
              </div>
              <div className="age-scale__bar">
                <div
                  className="age-scale__progress"
                  style={{ width: `${(product.ageScale?.current || 0.5) * 100}%` }}
                >
                  <div className="age-scale__pointer"></div>
                </div>
                <div className="age-scale__markers">
                  <span>Expectant</span>
                  <span>Newborn</span>
                  <span>Toddler</span>
                </div>
              </div>
            </div>

            {/* Product Badges & Tags (DesignSystem) */}
            <div className="pdp__tags-list">
              {isOutOfStock && (
                <span className="tag tag--support-red">
                  Out of Stock
                </span>
              )}
              {product.tags && product.tags
                .filter(tag => tag && tag.text && tag.text.toLowerCase() !== 'in stock')
                .map((tag, idx) => {
                  const tagClass = `tag tag--${tag.type || 'primary'}`;
                  return (
                    <span key={idx} className={tagClass}>
                      {tag.text}
                    </span>
                  );
                })
              }
            </div>

            {/* Selection Controls Row */}
            <div className="pdp__controls-row">
              {product.category === 'Apparel' && (
                <div className="pdp__sizes">
                  <span className="control-label">Select Size</span>
                  <div className="size-grid">
                    {sizes.map(size => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "primary" : "secondary"}
                        size="sm"
                        className={`size-btn ${selectedSize === size ? 'is-active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                        disabled={isOutOfStock}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pdp__quantity">
                <span className="control-label">Quantity</span>
                <div className="stepping-component pdp__stepping">
                  <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock}>—</Button>
                  <span>{quantity}</span>
                  <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} disabled={isOutOfStock}>+</Button>
                </div>
              </div>
            </div>

            {/* Actions Row */}
            <div className="pdp__actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="pdp__actions-row">
                {/* <Button variant='primary'>test</Button> */}
                <Button
                  variant="primary"
                  // className="pdp__add-btn"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  Add to cart
                </Button>

                <Button
                  variant="secondary"
                  className="pdp__wishlist-btn"
                  onClick={handleToggleWishlist}
                  icon={
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={isSaved ? "var(--color-brand-primary)" : "none"}
                      stroke={isSaved ? "var(--color-brand-primary)" : "currentColor"}
                      strokeWidth="2"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  }
                >
                  {isSaved ? 'In Wishlist' : 'Save to Wishlist'}
                </Button>
              </div>

              {isOutOfStock && (
                <Card variant="compact" hasShadow={false} className="pdp__notify-block" style={{
                  backgroundColor: 'var(--surface-container-low)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                  marginTop: '4px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifyBackInStock}
                      onChange={handleNotifyToggle}
                      style={{ transform: 'scale(1.15)', accentColor: 'var(--color-brand-primary)' }}
                    />
                    <span style={{ fontSize: 'var(--body-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Notify me when back in stock
                    </span>
                  </label>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Page.Section>

      {/* Product Details Tabs */}
      <Page.Section className="pdp__details">
        <div className="pdp__tabs">
          <Button
            variant={activeTab === 'details' ? 'primary' : 'ghost'}
            className={`pdp__tab ${activeTab === 'details' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FileText className={`pdp__tab-icon ${activeTab === 'details' ? 'is-active' : ''}`} />
            <span>Description</span>
          </Button>
          <Button
            variant={activeTab === 'specs' ? 'primary' : 'ghost'}
            className={`pdp__tab ${activeTab === 'specs' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            <ClipboardList className={`pdp__tab-icon ${activeTab === 'specs' ? 'is-active' : ''}`} />
            <span>Specifications</span>
          </Button>
          <Button
            variant={activeTab === 'reviews' ? 'primary' : 'ghost'}
            className={`pdp__tab pdp__tab--reviews ${activeTab === 'reviews' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <MessageSquare className={`pdp__tab-icon ${activeTab === 'reviews' ? 'is-active' : ''}`} />
            <span>Reviews ({reviews?.length || 0})</span>
          </Button>
        </div>

        <div className="pdp__tab-content">
          {activeTab === 'details' && (
            <div className="pdp__description">
              <p>{product.description}</p>
              <ul className="pdp__feature-list">
                <li>Expertly curated for the {product.stage} stage.</li>
                <li>Tested for safety and quality by our team.</li>
                <li>Eligible for same-day delivery in Kampala.</li>
              </ul>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="pdp__specs">
              <table className="specs-table">
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

          {activeTab === 'reviews' && renderReviewsList()}
        </div>
      </Page.Section>

      {/* Mobile Reviews Section (only visible on mobile, positioned below the tabs) */}
      <Page.Section className="pdp__mobile-reviews">
        <h3 className="pdp__mobile-reviews-title">Reviews ({reviews?.length || 0})</h3>
        {renderReviewsList()}
      </Page.Section>

      <Toast
        isOpen={showToast}
        message={toastMessage}
        onClose={() => setShowToast(false)}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderItems={[product]}
      />
    </Page>
  );
};

export default PDP;

