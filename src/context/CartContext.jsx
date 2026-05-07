import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const CartContext = createContext();
const GUEST_CART_KEY = 'dennan_guest_cart';

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useConvexAuth();

  // --- Guest Cart State ---
  const [guestCartItems, setGuestCartItems] = useState(() => {
    try {
      const item = localStorage.getItem(GUEST_CART_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCartItems));
  }, [guestCartItems]);

  // --- Authenticated Cart State ---
  const convexCartItemsRaw = useQuery(api.cart.getCartItems, isAuthenticated ? {} : "skip");
  const convexAddToCart = useMutation(api.cart.addToCart);
  const convexUpdateQuantity = useMutation(api.cart.updateQuantity);
  const convexRemoveFromCart = useMutation(api.cart.removeFromCart);

  const convexCartItems = useMemo(() => {
    if (!convexCartItemsRaw) return [];
    return convexCartItemsRaw.map(item => ({
      ...item.product,
      id: item.productId,
      quantity: item.quantity,
      size: item.size,
      cartItemId: item._id
    }));
  }, [convexCartItemsRaw]);

  // --- Guest Cart Price Hydration from DB ---
  const simplifiedGuestCartItems = useMemo(() => {
    if (isAuthenticated) return [];
    return guestCartItems.map(item => ({
      productId: item.id || item.productId,
      quantity: item.quantity,
      size: item.size || ""
    }));
  }, [guestCartItems, isAuthenticated]);

  const guestCartHydratedRaw = useQuery(
    api.cart.getGuestCartDetails,
    !isAuthenticated && simplifiedGuestCartItems.length > 0 ? { items: simplifiedGuestCartItems } : "skip"
  );

  const guestCartItemsHydrated = useMemo(() => {
    if (isAuthenticated) return [];
    // Fallback to local storage cache if loading is in progress or query returns empty
    if (!guestCartHydratedRaw || guestCartHydratedRaw.length === 0) {
      return guestCartItems;
    }
    return guestCartHydratedRaw.map(item => ({
      ...item.product,
      id: item.productId,
      quantity: item.quantity,
      size: item.size,
      isGuest: true
    }));
  }, [guestCartHydratedRaw, guestCartItems, isAuthenticated]);

  // --- Hybrid Cart (DB-Backed for both Guest & Authenticated) ---
  const cartItems = isAuthenticated ? convexCartItems : guestCartItemsHydrated;


  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastRemovedItem, setLastRemovedItem] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState('Kampala Central');

  const addToCart = async (product, quantity, size) => {
    const id = product._id || product.id;
    if (isAuthenticated) {
      try {
        await convexAddToCart({ productId: id, quantity, size });
      } catch (err) {
        console.error("Failed to add to cart:", err);
      }
    } else {
      setGuestCartItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(
          item => item.id === id && item.size === size
        );

        if (existingItemIndex > -1) {
          const newItems = [...prevItems];
          let newQty = newItems[existingItemIndex].quantity + quantity;
          if (product.inventory !== undefined) {
             newQty = Math.min(newQty, product.inventory);
          }
          newItems[existingItemIndex].quantity = newQty;
          return newItems;
        } else {
          let qtyToAdd = quantity;
          if (product.inventory !== undefined) {
             qtyToAdd = Math.min(qtyToAdd, product.inventory);
          }
          return [...prevItems, { ...product, id, quantity: qtyToAdd, size }];
        }
      });
    }
  };

  const updateQuantity = async (productId, size, delta) => {
    if (isAuthenticated) {
      const item = convexCartItems.find(i => i.id === productId && i.size === size);
      if (item && item.cartItemId) {
        try {
          await convexUpdateQuantity({ cartItemId: item.cartItemId, delta });
        } catch (err) {
           console.error("Failed to update quantity:", err);
        }
      }
    } else {
      setGuestCartItems(prevItems => {
        return prevItems.map(item => {
          if (item.id === productId && item.size === size) {
            let newQty = Math.max(1, item.quantity + delta);
            if (item.inventory !== undefined) {
               newQty = Math.min(newQty, item.inventory);
            }
            return { ...item, quantity: newQty };
          }
          return item;
        });
      });
    }
  };

  const removeFromCart = async (productId, size) => {
    if (isAuthenticated) {
       const item = convexCartItems.find(i => i.id === productId && i.size === size);
       if (item) {
          try {
             await convexRemoveFromCart({ cartItemId: item.cartItemId });
             setLastRemovedItem(item);
          } catch(err) { console.error(err); }
       }
    } else {
      setGuestCartItems(prevItems => {
        const itemToRemove = prevItems.find(item => item.id === productId && item.size === size);
        if (itemToRemove) {
          setLastRemovedItem(itemToRemove);
        }
        return prevItems.filter(item => !(item.id === productId && item.size === size));
      });
    }
  };

  const undoRemove = async () => {
    if (lastRemovedItem) {
      if (isAuthenticated) {
         try {
           await convexAddToCart({ 
             productId: lastRemovedItem.id, 
             quantity: lastRemovedItem.quantity, 
             size: lastRemovedItem.size 
           });
           setLastRemovedItem(null);
         } catch(err) { console.error(err); }
      } else {
         setGuestCartItems(prev => [...prev, lastRemovedItem]);
         setLastRemovedItem(null);
      }
    }
  };

  const saveForLater = (productId, size) => {
    // In a real app, this would call an API to add to wishlist
    // For now, we just remove from cart and log
    console.log(`Saved for later: ${productId} (${size})`);
    removeFromCart(productId, size);
  };

  const clearCart = () => {
    if (!isAuthenticated) {
      setGuestCartItems([]);
    }
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = typeof item.price === 'string' 
        ? parseFloat(item.price.replace('£', '').replace('UGX', '').replace(/,/g, ''))
        : item.price;
      // Convert legacy pounds to UGX if needed (using exchange rate 4800), otherwise use native UGX
      const cleanPrice = typeof item.price === 'string' && item.price.includes('£') 
        ? price * 4800 
        : price;
      return acc + ((cleanPrice || 0) * item.quantity);
    }, 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    deliveryLocation,
    setDeliveryLocation,
    addToCart,
    updateQuantity,
    removeFromCart,
    undoRemove,
    saveForLater,
    clearCart,
    subtotal,
    totalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
