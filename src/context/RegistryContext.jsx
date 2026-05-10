import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getRegistryData } from '../services/api';

const RegistryContext = createContext();
const REGISTRY_ITEMS_KEY = 'dennan_registry_items';
const REGISTRY_PROFILE_KEY = 'dennan_registry_profile';

export const useRegistry = () => {
  const context = useContext(RegistryContext);
  if (!context) {
    throw new Error('useRegistry must be used within a RegistryProvider');
  }
  return context;
};

export const RegistryProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  // --- Guest / Fallback Mock State ---
  const [guestItems, setGuestItems] = useState(() => {
    try {
      const item = localStorage.getItem(REGISTRY_ITEMS_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  const [guestProfile, setGuestProfile] = useState(() => {
    try {
      const item = localStorage.getItem(REGISTRY_PROFILE_KEY);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  });

  const [fallbackLoading, setFallbackLoading] = useState(true);

  // Sync guest state to localStorage
  useEffect(() => {
    localStorage.setItem(REGISTRY_ITEMS_KEY, JSON.stringify(guestItems));
  }, [guestItems]);

  useEffect(() => {
    localStorage.setItem(REGISTRY_PROFILE_KEY, JSON.stringify(guestProfile));
  }, [guestProfile]);

  // Load fallback data from json-server or defaults if no guest state exists
  useEffect(() => {
    if (isAuthenticated) return;
    const loadFallback = async () => {
      try {
        if (!guestProfile || guestItems.length === 0) {
          const data = await getRegistryData();
          if (data) {
            if (guestItems.length === 0) setGuestItems(data.items || []);
            if (!guestProfile) {
              setGuestProfile(data.profile || {
                id: "registry-123",
                ownerName: "Sarah & Mike",
                eventName: "Baby Miller's Arrival",
                eventDate: "2026-07-15",
                message: "We're so excited to welcome our little one! Thank you for supporting us.",
                privacy: "public",
              });
            }
          }
        }
        setFallbackLoading(false);
      } catch (error) {
        console.error("Failed to load fallback registry:", error);
        setFallbackLoading(false);
      }
    };
    loadFallback();
  }, [isAuthenticated, guestItems.length, guestProfile]);

  // --- Authenticated Database State ---
  const dbRegistry = useQuery(api.registry.get, isAuthenticated ? {} : "skip");
  const dbEnsureRegistry = useMutation(api.registry.ensureRegistry);
  const dbAddItem = useMutation(api.registry.addItem);
  const dbRemoveItem = useMutation(api.registry.removeItem);
  const dbToggleMustHave = useMutation(api.registry.toggleMustHave);
  const dbUpdateProfile = useMutation(api.registry.updateProfile);
  const dbAddContribution = useMutation(api.registry.addContribution);
  const dbMarkPurchased = useMutation(api.registry.markPurchased);

  // Auto-create database registry if missing for authenticated user
  useEffect(() => {
    if (isAuthenticated && dbRegistry === null) {
      const initRegistry = async () => {
        try {
          await dbEnsureRegistry();
        } catch (error) {
          console.error("Failed to auto-create baby registry:", error);
        }
      };
      initRegistry();
    }
  }, [isAuthenticated, dbRegistry, dbEnsureRegistry]);

  // Unified registry data
  const registryItems = useMemo(() => {
    if (isAuthenticated) {
      return dbRegistry?.items || [];
    }
    return guestItems;
  }, [isAuthenticated, dbRegistry, guestItems]);

  const registryProfile = useMemo(() => {
    if (isAuthenticated) {
      return dbRegistry?.profile || null;
    }
    return guestProfile;
  }, [isAuthenticated, dbRegistry, guestProfile]);

  const loading = isAuthenticated 
    ? (dbRegistry === undefined || authLoading) 
    : fallbackLoading;

  // --- Context Mutators ---

  const addToRegistry = async (product) => {
    const prodId = product._id || product.id;
    
    // Clean up price (legacy values etc)
    let cleanPrice = product.price;
    if (typeof cleanPrice === 'string') {
      const cleanStr = cleanPrice.replace(/£/g, '').replace(/ugx/i, '').replace(/,/g, '').trim();
      const parsed = parseFloat(cleanStr);
      cleanPrice = parsed;
      if (product.price.includes('£')) {
        cleanPrice = Math.round(parsed * 4800);
      }
    }

    if (isAuthenticated) {
      try {
        await dbAddItem({ productId: prodId });
        return true;
      } catch (error) {
        console.error("Failed to add registry item to database:", error);
        return false;
      }
    } else {
      const exists = guestItems.some(item => item.productId === prodId);
      if (exists) return false;

      const newItem = {
        id: `ri-${Date.now()}`,
        productId: prodId,
        name: product.name,
        price: cleanPrice || 0,
        image: product.image,
        category: product.category || 'Nursery',
        isMustHave: false,
        status: 'available',
        requestedQuantity: 1,
        purchasedQuantity: 0,
        isGroupGifting: cleanPrice > 100000,
        contributions: []
      };

      setGuestItems(prev => [newItem, ...prev]);
      return true;
    }
  };

  const removeFromRegistry = async (itemId) => {
    // Determine the product ID
    let prodId = itemId;
    const matchedItem = registryItems.find(item => item.id === itemId || item.productId === itemId);
    if (matchedItem) {
      prodId = matchedItem.productId;
    }

    if (isAuthenticated) {
      try {
        await dbRemoveItem({ productId: prodId });
      } catch (error) {
        console.error("Failed to remove registry item from database:", error);
      }
    } else {
      setGuestItems(prev => prev.filter(item => item.id !== itemId && item.productId !== itemId));
    }
  };

  const toggleMustHave = async (itemId) => {
    let prodId = itemId;
    const matchedItem = registryItems.find(item => item.id === itemId || item.productId === itemId);
    if (matchedItem) {
      prodId = matchedItem.productId;
    }

    if (isAuthenticated) {
      try {
        await dbToggleMustHave({ productId: prodId });
      } catch (error) {
        console.error("Failed to toggle must-have status in database:", error);
      }
    } else {
      setGuestItems(prev => prev.map(item => 
        (item.id === itemId || item.productId === itemId) ? { ...item, isMustHave: !item.isMustHave } : item
      ));
    }
  };

  const confirmContribution = async (itemId, contributorName, amount) => {
    let prodId = itemId;
    const matchedItem = registryItems.find(item => item.id === itemId || item.productId === itemId);
    if (matchedItem) {
      prodId = matchedItem.productId;
    }

    if (isAuthenticated && registryProfile) {
      try {
        await dbAddContribution({
          registryId: registryProfile.id,
          productId: prodId,
          contributorName,
          amount: parseFloat(amount)
        });
      } catch (error) {
        console.error("Failed to add contribution in database:", error);
      }
    } else {
      setGuestItems(prev => prev.map(item => {
        if (item.id === itemId || item.productId === itemId) {
          const newContributions = [...item.contributions, { name: contributorName, amount: parseFloat(amount), date: new Date().toISOString() }];
          const total = newContributions.reduce((acc, c) => acc + c.amount, 0);
          return {
            ...item,
            contributions: newContributions,
            status: total >= item.price ? 'purchased' : 'available',
            purchasedQuantity: total >= item.price ? item.requestedQuantity : 0
          };
        }
        return item;
      }));
    }
  };

  const markAsPurchased = async (itemId) => {
    let prodId = itemId;
    const matchedItem = registryItems.find(item => item.id === itemId || item.productId === itemId);
    if (matchedItem) {
      prodId = matchedItem.productId;
    }

    if (isAuthenticated && registryProfile) {
      try {
        await dbMarkPurchased({
          registryId: registryProfile.id,
          productId: prodId,
          purchaserName: "Anonymous Guest"
        });
      } catch (error) {
        console.error("Failed to mark item as purchased in database:", error);
      }
    } else {
      setGuestItems(prev => prev.map(item => 
        (item.id === itemId || item.productId === itemId) ? { ...item, status: 'purchased', purchasedQuantity: item.requestedQuantity } : item
      ));
    }
  };

  const updatePrivacy = async (newPrivacy) => {
    if (isAuthenticated && registryProfile) {
      try {
        await dbUpdateProfile({
          registryId: registryProfile.id,
          privacy: newPrivacy
        });
      } catch (error) {
        console.error("Failed to update privacy in database:", error);
      }
    } else if (guestProfile) {
      setGuestProfile(prev => ({ ...prev, privacy: newPrivacy }));
    }
  };

  const moveFromWishlistToRegistry = async (product, wishlistContext) => {
    const success = await addToRegistry(product);
    if (success) {
      const id = product.id || product._id;
      await wishlistContext.removeFromWishlist(id);
    }
    return success;
  };

  const moveFromCartToRegistry = async (cartItem, cartContext) => {
    const success = await addToRegistry(cartItem);
    if (success) {
      await cartContext.removeFromCart(cartItem.id, cartItem.size);
    }
    return success;
  };

  const value = {
    registryItems,
    registryProfile,
    loading,
    addToRegistry,
    removeFromRegistry,
    toggleMustHave,
    confirmContribution,
    markAsPurchased,
    updatePrivacy,
    moveFromWishlistToRegistry,
    moveFromCartToRegistry
  };

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
};
