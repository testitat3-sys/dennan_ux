import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Button from '../ui/Button';
import Text from '../ui/Text';
import './ReviewModal.css';

const ReviewModal = ({ isOpen, onClose, orderItems = [], user }) => {
  const [active, setActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [author, setAuthor] = useState('');
  const [childAge, setChildAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reviewedIds, setReviewedIds] = useState({});
  const [touched, setTouched] = useState({ rating: false, author: false, reviewText: false });

  const saveReview = useMutation(api.products.addReview);

  // Sync author name with logged in user profile name
  useEffect(() => {
    if (user?.name) {
      setAuthor(user.name);
    }
  }, [user]);

  // Bottom slide-in animation transition states
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
    }
  }, [isOpen]);

  // Auto-select single product orders
  useEffect(() => {
    if (isOpen && orderItems && orderItems.length === 1) {
      setSelectedItem(orderItems[0]);
    }
  }, [isOpen, orderItems]);

  // Reset modal state on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null);
      setRating(0);
      setHoverRating(0);
      setReviewText('');
      setAuthor(user?.name || '');
      setChildAge('');
      setShowSuccess(false);
      setReviewedIds({});
      setTouched({ rating: false, author: false, reviewText: false });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle Review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setTouched({ rating: true, author: true, reviewText: true });

    if (!selectedItem) return;
    
    const prodId = selectedItem.productId || selectedItem._id || selectedItem.id;
    if (!prodId) {
      alert("Invalid product ID. Cannot submit review.");
      return;
    }

    if (rating === 0 || !author.trim() || !reviewText.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await saveReview({
        productId: prodId,
        author: author.trim(),
        rating,
        text: reviewText.trim(),
        childAge: childAge.trim() || undefined,
      });

      // Mark this product as successfully reviewed
      setReviewedIds(prev => ({
        ...prev,
        [prodId]: true
      }));

      setShowSuccess(true);
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert(err instanceof Error ? err.message : "Failed to save review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch back to items list to select next item to review
  const handleReviewAnother = () => {
    setSelectedItem(null);
    setRating(0);
    setHoverRating(0);
    setReviewText('');
    setChildAge('');
    setShowSuccess(false);
    setTouched({ rating: false, author: false, reviewText: false });
  };

  // Check if all items in order have been reviewed
  const allReviewed = orderItems.every(item => {
    const prodId = item.productId || item._id || item.id;
    return reviewedIds[prodId];
  });

  return (
    <div className={`review-modal-overlay ${active ? 'is-active' : ''}`} onClick={onClose}>
      <div 
        className={`review-modal ${active ? 'is-active' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="review-modal__header">
          <Text role="headline-md" as="h3" className="review-modal__title">
            {selectedItem ? 'Write a Review' : 'Select Product to Review'}
          </Text>
          <Button 
            variant="ghost" 
            className="review-modal__close" 
            onClick={onClose} 
            aria-label="Close modal"
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
          />
        </div>

        {/* Scrollable Content */}
        <div className="review-modal__content">
          
          {/* Success Screen */}
          {showSuccess ? (
            <div className="review-modal__success animate-fadeIn">
              <div className="success-icon-wrap">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <Text role="title-lg" as="h4" color="primary">Thank You for Your Feedback!</Text>
              <Text role="body-md" as="p" color="secondary" className="success-desc">
                Your review has been successfully submitted and helps other parents make better buying choices.
              </Text>
              
              <div className="success-actions">
                {orderItems.length > 1 && !allReviewed ? (
                  <Button variant="primary" fullWidth onClick={handleReviewAnother}>
                    Review Another Item
                  </Button>
                ) : (
                  <Button variant="primary" fullWidth onClick={onClose}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          ) : selectedItem ? (
            /* Review Form Form */
            <form onSubmit={handleSubmitReview} className="review-form-container animate-fadeIn">
              
              {/* Back Button (only shown for multi-product orders) */}
              {orderItems.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleReviewAnother}
                  className="review-form__back-btn"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>}
                >
                  Back to List
                </Button>
              )}

              {/* Product Preview Header */}
              <div className="review-product-preview">
                <div className="product-preview__thumbnail">
                  <img src={selectedItem.image} alt={selectedItem.productName || selectedItem.name} />
                </div>
                <div className="product-preview__info">
                  <Text role="label-sm" as="span" color="brand-primary" className="product-preview__stage">
                    {selectedItem.stage || 'Newborn'}
                  </Text>
                  <Text role="title-sm" as="h4" color="primary" className="product-preview__name">
                    {selectedItem.productName || selectedItem.name}
                  </Text>
                  {selectedItem.size && (
                    <Text role="body-sm" as="p" color="secondary" className="product-preview__meta">
                      Size: {selectedItem.size}
                    </Text>
                  )}
                </div>
              </div>

              {/* Star Rating Section */}
              <div className="review-form__section rating-section">
                <Text role="label-md" as="label" color="primary" className="form-label">
                  Your Rating
                </Text>
                <div className="star-rating-row">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <button
                      key={starValue}
                      type="button"
                      className={`star-btn ${starValue <= (hoverRating || rating) ? 'is-active' : ''}`}
                      onClick={() => {
                        setRating(starValue);
                        setTouched(prev => ({ ...prev, rating: true }));
                      }}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <svg 
                        width="32" 
                        height="32" 
                        viewBox="0 0 24 24" 
                        fill={starValue <= (hoverRating || rating) ? "currentColor" : "none"} 
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  ))}
                </div>
                {touched.rating && rating === 0 && (
                  <Text role="label-sm" color="support-red" className="form-error-hint">
                    * Please select a star rating.
                  </Text>
                )}
              </div>

              {/* Review Input Fields */}
              <div className="review-form__section">
                <Text role="label-md" as="label" htmlFor="reviewer-name" color="primary" className="form-label">
                  Your Name
                </Text>
                <input
                  id="reviewer-name"
                  type="text"
                  placeholder="e.g. Sandra Namubiru"
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    setTouched(prev => ({ ...prev, author: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, author: true }))}
                  className="review-input-text"
                  required
                />
                {touched.author && !author.trim() && (
                  <Text role="label-sm" color="support-red" className="form-error-hint">
                    * Name is required.
                  </Text>
                )}
              </div>

              <div className="review-form__section">
                <Text role="label-md" as="label" htmlFor="child-age" color="primary" className="form-label">
                  Child's Age (Optional)
                </Text>
                <input
                  id="child-age"
                  type="text"
                  placeholder="e.g. 6 months, 2 years"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  className="review-input-text"
                />
              </div>

              <div className="review-form__section">
                <Text role="label-md" as="label" htmlFor="review-text" color="primary" className="form-label">
                  Your Review
                </Text>
                <textarea
                  id="review-text"
                  placeholder="How did this product perform? Share your experience with other parents..."
                  value={reviewText}
                  onChange={(e) => {
                    setReviewText(e.target.value);
                    setTouched(prev => ({ ...prev, reviewText: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, reviewText: true }))}
                  className="review-input-textarea"
                  rows={4}
                  required
                />
                {touched.reviewText && !reviewText.trim() && (
                  <Text role="label-sm" color="support-red" className="form-error-hint">
                    * Review comments are required.
                  </Text>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isSubmitting}
                className="review-form__submit-btn"
              >
                Submit Review
              </Button>
            </form>
          ) : (
            /* Multi-Product List Screen */
            <div className="review-products-list animate-fadeIn">
              <Text role="body-md" as="p" color="secondary" className="list-subtitle">
                Please select an item from your order below to share your experience.
              </Text>
              
              <div className="products-grid-list">
                {orderItems.map((item, index) => {
                  const prodId = item.productId || item._id || item.id;
                  const isReviewed = reviewedIds[prodId];
                  return (
                    <div 
                      key={index} 
                      className={`select-product-card ${isReviewed ? 'is-reviewed' : ''}`}
                      onClick={() => !isReviewed && setSelectedItem(item)}
                    >
                      <div className="select-product-card__thumbnail">
                        <img src={item.image} alt={item.productName || item.name} />
                      </div>
                      <div className="select-product-card__info">
                        <Text role="label-sm" as="span" color="secondary" className="select-product-card__stage">
                          {item.stage || 'Newborn'}
                        </Text>
                        <Text role="title-sm" as="h4" color="primary" className="select-product-card__name">
                          {item.productName || item.name}
                        </Text>
                        {item.size && (
                          <Text role="body-sm" as="p" color="secondary" className="select-product-card__meta">
                            Size: {item.size}
                          </Text>
                        )}
                      </div>
                      
                      {/* Checkmark or Chevron indicator */}
                      <div className="select-product-card__indicator">
                        {isReviewed ? (
                          <div className="reviewed-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Reviewed</span>
                          </div>
                        ) : (
                          <svg className="chevron-right" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
