import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLeadCapture } from '../context/LeadCaptureContext';
import { formatPrice } from '../utils/priceUtils';
import { stripBrandFromName } from '../utils/productNameUtils';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import PDPSkeleton from '../components/ui/PDPSkeleton';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import { Flame, Heart } from 'lucide-react';
import ReviewModal from '../components/checkout/ReviewModal';
import DefaultProductImage from '../components/products/DefaultProductImage';
import './PDP.css';

const formatAgeRange = (product) => {
  if (product.minMonth !== undefined && product.maxMonth !== undefined) {
    return `${product.minMonth}–${product.maxMonth} months`;
  }
  if (product.minWeek !== undefined && product.maxWeek !== undefined) {
    return `${product.minWeek}–${product.maxWeek} weeks`;
  }
  return null;
};

const formatDimensions = (dimensions) => {
  if (!dimensions) return null;
  const { length, width, height, unit } = dimensions;
  if (!length || !width || !height) return null;
  return `${length}×${width}×${height}${unit ? ` ${unit}` : ''}`;
};

// Builds a direct, fact-dense 40-60 word answer-first summary from real product
// fields instead of generic marketing copy, so AI agents/answer engines can lift
// a concrete answer without parsing the full page.
const buildAnswerFirstSummary = (product, displayName) => {
  const facts = [];
  const ageRange = formatAgeRange(product);
  if (ageRange) facts.push(`suited for ${ageRange}`);
  if (product.material) facts.push(`made from ${product.material}`);
  const dims = formatDimensions(product.dimensions);
  if (dims) facts.push(`sized ${dims}`);
  if (product.weightGrams) facts.push(`weighing ${product.weightGrams}g`);

  if (facts.length === 0) {
    return product.description ? product.description.slice(0, 220) : `${displayName} from Dennan.`;
  }

  const category = product.category ? product.category.toLowerCase() : 'baby and kids';
  return `${displayName} is a ${category} product from ${product.brand || 'Dennan'}, ${facts.join(', ')}. Priced at UGX ${typeof product.price === 'number' ? product.price.toLocaleString() : product.price}, available for delivery in Kampala.`;
};

const buildFactBullets = (product) => {
  const bullets = [];
  const ageRange = formatAgeRange(product);
  if (ageRange) bullets.push(`Recommended age: ${ageRange}`);
  if (product.material) bullets.push(`Material: ${product.material}`);
  const dims = formatDimensions(product.dimensions);
  if (dims) bullets.push(`Dimensions: ${dims}`);
  if (product.weightGrams) bullets.push(`Weight: ${product.weightGrams}g`);
  if (product.allergens && product.allergens.length > 0) bullets.push(`Allergens: ${product.allergens.join(', ')}`);
  if (product.usageInstructions) bullets.push(`Usage: ${product.usageInstructions}`);
  return bullets;
};

const PDP = () => {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useConvexAuth();
  const { hasLeadInfo, openLeadModal } = useLeadCapture();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('Newborn');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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
      '.pdp__grid, .pdp__details'
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
  }, [loading, product]);

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

  const canonicalUrl = `https://dennan.ug/product/${product.slug || id}`;
  const answerFirstSummary = buildAnswerFirstSummary(product, displayName);
  const factBullets = buildFactBullets(product);
  const productImages = (product.images || (product.image ? [product.image] : [])).filter(Boolean);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayName,
    description: answerFirstSummary,
    sku: product.sku || String(id),
    ...(productImages.length > 0 ? { image: productImages } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'UGX',
      ...(typeof product.price === 'number' ? { price: product.price } : {}),
      availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
    ...(reviews && reviews.length > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1),
        reviewCount: reviews.length,
      },
    } : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://dennan.ug/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.stage ? (product.stage.charAt(0).toUpperCase() + product.stage.slice(1)) : 'Products',
        item: `https://dennan.ug/category/${product.stage || 'all'}`,
      },
      { '@type': 'ListItem', position: 3, name: displayName, item: canonicalUrl },
    ],
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize);
    setToastMessage(`${displayName} added to cart!`);
    setShowToast(true);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product);
    if (!isSaved) {
      setToastMessage(`${displayName} saved to wishlist!`);
    } else {
      setToastMessage(`Removed ${displayName} from wishlist.`);
    }
    setShowToast(true);
  };

  const handleRemindClick = () => {
    if (!isAuthenticated && !hasLeadInfo) {
      openLeadModal({
        source: 'launch_oos',
        title: 'Get notified when back in stock',
        subtext: `Leave your details and we'll let you know the moment ${displayName} is back.`,
        specifications: [displayName],
        onSuccess: () => toggleWishlist(product, true),
      });
      return;
    }
    toggleWishlist(product, true);
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
      <Helmet>
        <title>{`${displayName} | Dennan`}</title>
        <meta name="description" content={answerFirstSummary} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${displayName} | Dennan`} />
        <meta property="og:description" content={answerFirstSummary} />
        <meta property="og:url" content={canonicalUrl} />
        {productImages[0] && <meta property="og:image" content={productImages[0]} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${displayName} | Dennan`} />
        <meta name="twitter:description" content={answerFirstSummary} />
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>
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
          {/* Vertical thumbnail rail */}
          <div className="pdp__rail">
            {displayImages.length > 1 && displayImages.map((imgUrl, idx) => (
              <button
                key={idx}
                className={`pdp__rail-item ${activeImageIndex === idx ? 'is-active' : ''}`}
                onClick={() => setActiveImageIndex(idx)}
              >
                {imgUrl === 'placeholder' ? (
                  <DefaultProductImage />
                ) : (
                  <img src={imgUrl} alt={`${displayName} view ${idx + 1}`} />
                )}
              </button>
            ))}
          </div>

          {/* Main image */}
          <div className="pdp__main-image">
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
            {displayImages[activeImageIndex] === 'placeholder' ? (
              <DefaultProductImage />
            ) : (
              <img
                src={displayImages[activeImageIndex]}
                alt={displayName}
                onLoad={() => setLoadedImages(prev => ({ ...prev, [activeImageIndex]: true }))}
                onError={() => setLoadedImages(prev => ({ ...prev, [activeImageIndex]: true }))}
              />
            )}
          </div>

          {/* Buy box */}
          <div className="pdp__buybox-col">
            <Card className="pdp__buybox" hasShadow>
              <span className="pdp__brand">{product.brand}</span>
              <h1 className="pdp__title">{displayName}</h1>

              <div className="pdp__urgency">
                {product.unitsSold > 0 && (
                  <span className="pdp__urgency-pill">
                    <Flame size={13} strokeWidth={2.5} fill="currentColor" /> Hot: {product.unitsSold.toLocaleString()} people have just bought this
                  </span>
                )}
                {isOutOfStock && <span className="pdp__urgency-pill pdp__urgency-pill--red">Out of Stock</span>}
              </div>

              <div className="pdp__price-wrap">
                <span className="pdp__price">{formatPrice(product.price)}</span>
                {product.wasPrice && <span className="pdp__was-price">{formatPrice(product.wasPrice)}</span>}
              </div>

              {/* Product Tags */}
              <div className="pdp__tags-list">
                {product.tags && product.tags
                  .filter(tag => tag && tag.text && tag.text.toLowerCase() !== 'in stock')
                  .map((tag, idx) => (
                    <span key={idx} className="pdp__tag">
                      {tag.text}
                    </span>
                  ))
                }
              </div>

              {/* Age Fit Scale */}
              <div className="pdp__age-scale">
                <div className="age-scale__header">
                  <span>Age Appropriateness</span>
                  <span>{product.ageScale?.label}</span>
                </div>
                <div className="age-scale__track">
                  <div className="age-scale__fill" style={{ width: `${(product.ageScale?.current || 0.5) * 100}%` }} />
                </div>
              </div>

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

              <div className="pdp__row">
                <div className="pdp__quantity">
                  <span className="control-label">Quantity</span>
                  <div className="pdp__stepper">
                    <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>−</button>
                    <span>{quantity}</span>
                    <button onClick={() => setQuantity((q) => q + 1)} disabled={isOutOfStock}>+</button>
                  </div>
                </div>
                <div className="pdp__wishlist-btn">
                  <Button
                    variant="secondary"
                    onClick={handleToggleWishlist}
                    icon={<Heart size={18} fill={isSaved ? 'var(--color-brand-primary)' : 'none'} stroke={isSaved ? 'var(--color-brand-primary)' : 'currentColor'} />}
                  >
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="pdp__cta">
                {isOutOfStock ? (
                  <Button variant="primary" fullWidth onClick={handleRemindClick}>
                    {isSaved ? "You'll be notified" : 'Remind me when back in stock'}
                  </Button>
                ) : (
                  <Button variant="primary" fullWidth onClick={handleAddToCart}>
                    Add to cart · {formatPrice(product.price * quantity)}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Page.Section>

      {/* Mobile sticky add-to-cart bar */}
      <div className="pdp__sticky-bar">
        <div className="pdp__sticky-price">{formatPrice(product.price)}</div>
        <div className="pdp__sticky-cta">
          {isOutOfStock ? (
            <Button variant="primary" onClick={handleRemindClick}>
              {isSaved ? "You'll be notified" : 'Remind me when back in stock'}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleAddToCart}>
              Add to cart
            </Button>
          )}
        </div>
      </div>

      {/* Product Details — stacked sections (Option C layout, no tabs) */}
      <Page.Section className="pdp__details">
        <div className="pdp__section">
          <h2>Description</h2>
          <div className="pdp__description">
            <p className="pdp__answer-first">{answerFirstSummary}</p>
            <p>{product.description}</p>
            {factBullets.length > 0 && (
              <ul className="pdp__feature-list">
                {factBullets.map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="pdp__section">
          <h2>Specifications</h2>
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

        <div className="pdp__section">
          <h2>Reviews ({reviews?.length || 0})</h2>
          {renderReviewsList()}
        </div>
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

