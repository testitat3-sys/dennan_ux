import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProducts } from '../services/api';
import { useCart } from '../context/CartContext';
import Toast from '../components/ui/Toast';
import './PDP.css';

const PDP = () => {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('Newborn');
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const products = await getProducts();
      const foundProduct = products?.find(p => p.id === parseInt(productId));
      if (foundProduct) {
        setProduct(foundProduct);
        window.scrollTo(0, 0);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [productId]);

  if (loading) return <div className="pdp-loading">Loading product details...</div>;
  if (!product) return <div className="pdp-loading">Product not found.</div>;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize);
    setShowToast(true);
  };

  const sizes = ['Newborn', '0-3m', '3-6m', '6-9m'];

  return (
    <main className="pdp">
      <div className="pdp__container">
        {/* Breadcrumbs */}
        <nav className="pdp__breadcrumbs">
          <Link to="/">Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <Link to={`/category/${product.stage}`}>{product.stage.charAt(0).toUpperCase() + product.stage.slice(1)}</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span>{product.name}</span>
        </nav>

        <div className="pdp__grid">
          {/* Left: Image Gallery */}
          <div className="pdp__gallery">
            <div className="pdp__main-image">
              <img src={product.image} alt={product.name} />
              {product.tags && product.tags.map((tag, idx) => (
                <span key={idx} className={`pdp__badge pdp__badge--${tag.type}`}>
                  {tag.text}
                </span>
              ))}
            </div>
            <div className="pdp__thumbnails">
              {[1, 2, 3].map(i => (
                <div key={i} className="pdp__thumbnail">
                  <img src={product.image} alt={`${product.name} view ${i}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="pdp__info">
            <div className="pdp__header">
              <span className="pdp__brand">{product.brand}</span>
              <h1 className="pdp__title">{product.name}</h1>
              <div className="pdp__price-wrap">
                <span className="pdp__price">{product.price}</span>
                {product.wasPrice && <span className="pdp__was-price">{product.wasPrice}</span>}
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

            {/* Delivery Urgency */}
            <div className="pdp__urgency">
              <div className="urgency__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p>Order in <strong>4h 25m</strong> for delivery by <strong>Tomorrow, 4:00 PM</strong></p>
            </div>

            {/* Selection Controls */}
            <div className="pdp__controls">
              {product.category === 'Apparel' && (
                <div className="pdp__sizes">
                  <span className="control-label">Select Size</span>
                  <div className="size-grid">
                    {sizes.map(size => (
                      <button 
                        key={size}
                        className={`size-btn ${selectedSize === size ? 'is-active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pdp__quantity">
                <span className="control-label">Quantity</span>
                <div className="stepping-component pdp__stepping">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>—</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pdp__actions">
              <button className="btn-primary pdp__add-btn" onClick={handleAddToCart}>
                Add to Cart — {product.price}
              </button>
              <button className="btn-secondary pdp__wishlist-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                Add to Registry
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pdp__trust">
              <div className="trust-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Authentic Brand</span>
              </div>
              <div className="trust-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
                <span>Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <section className="pdp__details">
          <div className="pdp__tabs">
            <button 
              className={`pdp__tab ${activeTab === 'details' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Description
            </button>
            <button 
              className={`pdp__tab ${activeTab === 'specs' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              Specifications
            </button>
            <button 
              className={`pdp__tab ${activeTab === 'reviews' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({product.reviews?.length || 0})
            </button>
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

            {activeTab === 'reviews' && (
              <div className="pdp__reviews">
                {product.reviews?.map((review, idx) => (
                  <div key={idx} className="review-card">
                    <div className="review-header">
                      <div className="review-rating">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        ))}
                      </div>
                      <span className="review-age">Child: {review.childAge}</span>
                    </div>
                    <p className="review-text">"{review.text}"</p>
                    <span className="review-author">— {review.author}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Toast 
        isOpen={showToast} 
        message={`${product.name} added to cart`} 
        onClose={() => setShowToast(false)} 
      />
    </main>
  );
};

export default PDP;

