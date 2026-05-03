import React, { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastRemovedItem, setLastRemovedItem] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState('Kampala Central');

  const addToCart = (product, quantity, size) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.id === product.id && item.size === size
      );

      if (existingItemIndex > -1) {
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        return [...prevItems, { ...product, quantity, size }];
      }
    });
  };

  const updateQuantity = (productId, size, delta) => {
    setCartItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === productId && item.size === size) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId, size) => {
    setCartItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.id === productId && item.size === size);
      if (itemToRemove) {
        setLastRemovedItem(itemToRemove);
      }
      return prevItems.filter(item => !(item.id === productId && item.size === size));
    });
  };

  const undoRemove = () => {
    if (lastRemovedItem) {
      setCartItems(prev => [...prev, lastRemovedItem]);
      setLastRemovedItem(null);
    }
  };

  const saveForLater = (productId, size) => {
    // In a real app, this would call an API to add to wishlist
    // For now, we just remove from cart and log
    console.log(`Saved for later: ${productId} (${size})`);
    removeFromCart(productId, size);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = typeof item.price === 'string' 
        ? parseFloat(item.price.replace('£', '').replace('UGX', '').replace(/,/g, ''))
        : item.price;
      return acc + (price * item.quantity);
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

