import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useRegistry } from '../context/RegistryContext';
import { formatPrice } from '../utils/priceUtils';
import { stripBrandFromName } from '../utils/productNameUtils';
import Toast from '../components/ui/Toast';
import ProductCard from '../components/products/ProductCard';
import Button from '../components/ui/Button';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import './WishlistPage.css';

const WishlistPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shareParam = searchParams.get('share');

  const wishlistContext = useWishlist();
  const {
    wishlistItems,
    removeFromWishlist,
    moveItemToCart,
    moveAllToCart,
    setNotifyBackInStock,
    totalWishlistItems
  } = wishlistContext;

  const cartContext = useCart();
  const { moveFromWishlistToRegistry } = useRegistry();

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // --- Support Shared Wishlists ---
  const sharedIds = shareParam ? shareParam.split(',') : [];
  const sharedWishlistRaw = useQuery(
    api.wishlist.getGuestWishlistDetails,
    shareParam && sharedIds.length > 0 ? { productIds: sharedIds } : "skip"
  );

  const isSharedView = !!shareParam;
  const itemsToDisplay = isSharedView
    ? (sharedWishlistRaw ? sharedWishlistRaw.map(item => ({ ...item.product, id: item.productId })) : [])
    : wishlistItems;

  const handleShareList = () => {
    // Collect all IDs
    const ids = wishlistItems.map(item => item._id || item.id).join(',');
    if (!ids) {
      setToastMessage('Your wishlist is empty, nothing to share.');
      setShowToast(true);
      return;
    }

    const shareUrl = `${window.location.origin}/wishlist?share=${ids}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setToastMessage('Wishlist link copied to clipboard!');
        setShowToast(true);
      })
      .catch(() => {
        setToastMessage('Failed to copy link. Please try again.');
        setShowToast(true);
      });
  };

  const handleMoveToCart = async (item) => {
    await moveItemToCart(item, 'M', cartContext);
    setToastMessage(`"${stripBrandFromName(item.name, item.brand)}" moved to cart!`);
    setShowToast(true);
  };

  const handleMoveToRegistry = async (item) => {
    const success = await moveFromWishlistToRegistry(item, wishlistContext);
    const displayName = stripBrandFromName(item.name, item.brand);
    if (success) {
      setToastMessage(`"${displayName}" moved to registry!`);
    } else {
      setToastMessage(`"${displayName}" is already in your registry.`);
    }
    setShowToast(true);
  };

  const handleMoveAllToCart = async () => {
    const inStockCount = itemsToDisplay.filter(item => item.inventory === undefined || item.inventory > 0).length;
    if (inStockCount === 0) {
      setToastMessage('No available items in stock to move to cart.');
      setShowToast(true);
      return;
    }

    await moveAllToCart(cartContext);
    setToastMessage(`Moved ${inStockCount} available item(s) to cart!`);
    setShowToast(true);
  };

  const toggleNotify = async (item) => {
    if (isSharedView) return;
    const productId = item.id || item._id;
    const next = !item.notifyBackInStock;
    await setNotifyBackInStock(productId, next);
    if (next) {
      setToastMessage(`Back-in-stock alert activated for "${stripBrandFromName(item.name, item.brand)}"!`);
      setShowToast(true);
    }
  };

  const isLoaded = isSharedView ? sharedWishlistRaw !== undefined : true;

  if (!isLoaded) {
    return (
      <div className="wishlist-loading-container">
        <div className="wishlist-spinner"></div>
        <p>Retrieving curated selections...</p>
      </div>
    );
  }

  return (
    <Page className="wishlist-page">
      <Page.Section className="wishlist-container">
        {/* Editorial Title Block */}
        <header className="wishlist-header">
          <div className="wishlist-title-wrap">
            <span className="wishlist-eyebrow">Dennan Curates</span>
            <h1 className="wishlist-title">
              {isSharedView ? "Shared Selections" : "Your Wishlist"}
            </h1>
            <p className="wishlist-subtitle">
              {isSharedView
                ? "View these hand-selected favorites curated specifically for you."
                : "A calm space for your thoughtful selections, ready to transition to your nursery when you are."}
            </p>
          </div>

          {!isSharedView && itemsToDisplay.length > 0 && (
            <div className="wishlist-bulk-actions">
              <Button
                variant="secondary"
                onClick={handleShareList}
                aria-label="Share wishlist"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>}
                iconPosition="left"
              >
                Share Wishlist
              </Button>
              <Button
                variant="primary"
                onClick={handleMoveAllToCart}
                disabled={itemsToDisplay.filter(item => item.inventory === undefined || item.inventory > 0).length === 0}
              >
                Move All to Cart
              </Button>
            </div>
          )}
        </header>

        {/* Empty State */}
        {itemsToDisplay.length === 0 ? (
          <Card variant="feature" hasShadow={false} className="wishlist-empty-state">
            <Card.Body>
              <div className="wishlist-empty-art">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <h2 className="wishlist-empty-title">
                {isSharedView ? "No Items Found" : "Your wishlist is empty"}
              </h2>
              <p className="wishlist-empty-desc">
                {isSharedView
                  ? "This shared wishlist is currently empty or has expired."
                  : "Explore our expert-guided categories to discover safe, beautiful essentials for your nursery."}
              </p>
              <Button to="/" variant="hero">
                Continue Shopping
              </Button>
            </Card.Body>
          </Card>
        ) : (
          /* Bookmarked Items Grid */
          <CardGrid className="wishlist-grid">
            {itemsToDisplay.map((item) => {
              const id = item.id || item._id;
              return (
                <ProductCard
                  key={id}
                  product={item}
                  wishlistMode={true}
                  showWishlistIcon={!isSharedView}
                  onRemove={() => removeFromWishlist(id)}
                  onAddToCart={handleMoveToCart}
                  isNotified={!!item.notifyBackInStock}
                  onToggleNotify={() => toggleNotify(item)}
                  onMoveToRegistry={handleMoveToRegistry}
                />
              );
            })}
          </CardGrid>
        )}
      </Page.Section>

      <Toast
        isOpen={showToast}
        message={toastMessage}
        onClose={() => setShowToast(false)}
      />
    </Page>
  );
};

export default WishlistPage;
