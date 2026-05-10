import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const WishlistContext = createContext();
const GUEST_WISHLIST_KEY = 'dennan_guest_wishlist';

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useConvexAuth();

  // --- Guest Wishlist State ---
  const [guestWishlist, setGuestWishlist] = useState(() => {
    try {
      const item = localStorage.getItem(GUEST_WISHLIST_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(guestWishlist));
  }, [guestWishlist]);

  // --- Authenticated Wishlist State ---
  const convexWishlistRaw = useQuery(api.wishlist.getWishlistItems, isAuthenticated ? {} : "skip");
  const convexAddToWishlist = useMutation(api.wishlist.addToWishlist);
  const convexRemoveFromWishlist = useMutation(api.wishlist.removeFromWishlist);

  const convexWishlist = useMemo(() => {
    if (!convexWishlistRaw) return [];
    return convexWishlistRaw.map(item => ({
      ...item.product,
      id: item.productId,
      wishlistItemId: item._id,
      notifyBackInStock: item.notifyBackInStock
    }));
  }, [convexWishlistRaw]);

  // --- Guest Wishlist Details Hydration ---
  const guestProductIds = useMemo(() => {
    if (isAuthenticated) return [];
    return guestWishlist;
  }, [guestWishlist, isAuthenticated]);

  const guestWishlistHydratedRaw = useQuery(
    api.wishlist.getGuestWishlistDetails,
    !isAuthenticated && guestProductIds.length > 0 ? { productIds: guestProductIds } : "skip"
  );

  const guestWishlistHydrated = useMemo(() => {
    if (isAuthenticated) return [];
    if (!guestWishlistHydratedRaw || guestWishlistHydratedRaw.length === 0) {
      // fallback to basic guest items (keeps array size)
      return guestWishlist.map(id => ({ id, _id: id, isGuest: true }));
    }
    return guestWishlistHydratedRaw.map(item => ({
      ...item.product,
      id: item.productId,
      isGuest: true
    }));
  }, [guestWishlistHydratedRaw, guestWishlist, isAuthenticated]);

  // --- Unified Wishlist ---
  const wishlistItems = isAuthenticated ? convexWishlist : guestWishlistHydrated;

  const isInWishlist = (productId) => {
    const cleanId = typeof productId === 'object' ? (productId._id || productId.id) : productId;
    return wishlistItems.some(item => item.id === cleanId || item._id === cleanId);
  };

  const addToWishlist = async (product, notifyBackInStock) => {
    const id = product._id || product.id;
    if (isAuthenticated) {
      try {
        await convexAddToWishlist({ productId: id, notifyBackInStock });
      } catch (err) {
        console.error("Failed to add to database wishlist:", err);
      }
    } else {
      setGuestWishlist(prev => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
    }
  };

  const removeFromWishlist = async (productId) => {
    const cleanId = typeof productId === 'object' ? (productId._id || productId.id) : productId;
    if (isAuthenticated) {
      try {
        await convexRemoveFromWishlist({ productId: cleanId });
      } catch (err) {
        console.error("Failed to remove from database wishlist:", err);
      }
    } else {
      setGuestWishlist(prev => prev.filter(id => id !== cleanId));
    }
  };

  const toggleWishlist = async (product, notifyBackInStock) => {
    const id = product._id || product.id;
    if (isInWishlist(id)) {
      await removeFromWishlist(id);
      return false; // Removed
    } else {
      await addToWishlist(product, notifyBackInStock);
      return true; // Added
    }
  };

  // --- Bulk Moves to Cart ---
  const moveItemToCart = async (product, size, cartContext) => {
    const id = product._id || product.id;
    // Add to cart with quantity 1
    await cartContext.addToCart(product, 1, size || 'M');
    // Remove from wishlist
    await removeFromWishlist(id);
  };

  const moveAllToCart = async (cartContext) => {
    // Only move items that are in stock (inventory === undefined || inventory > 0)
    const inStockItems = wishlistItems.filter(item => item.inventory === undefined || item.inventory > 0);
    
    for (const item of inStockItems) {
      await cartContext.addToCart(item, 1, 'M');
      await removeFromWishlist(item.id);
    }
  };

  const totalWishlistItems = useMemo(() => wishlistItems.length, [wishlistItems]);

  const value = {
    wishlistItems,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    moveItemToCart,
    moveAllToCart,
    totalWishlistItems
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
