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
  const dbUpdatePackaging = useMutation(api.registry.updatePackaging);
  const dbRemovePackaging = useMutation(api.registry.removePackaging);

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

  // Helper to calculate packaging for local/guest preview
  const calculatePackaging = (itemsList) => {
    let S = 0, M = 0, L = 0, XL = 0;
    for (const item of itemsList) {
      if (item.productId === "virtual-packaging") continue;
      const name = (item.name || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const price = item.price || 0;

      if (price > 500000 || category.includes("travel") || name.includes("stroller") || name.includes("pram") || name.includes("car seat") || name.includes("high chair") || name.includes("cot") || name.includes("crib") || name.includes("hamper") || name.includes("playard")) {
        XL++;
      } else if (price > 150000 || category.includes("nursery") || name.includes("set") || name.includes("pack") || name.includes("bag") || name.includes("backpack") || name.includes("nest") || name.includes("lounger") || name.includes("carrier") || name.includes("gym") || name.includes("blender") || name.includes("processor") || name.includes("steriliser") || name.includes("pump") || name.includes("tub") || name.includes("bathtub") || name.includes("seat")) {
        L++;
      } else if (price > 30000 || name.includes("blanket") || name.includes("sheet") || name.includes("towel") || name.includes("bottle") || name.includes("warmer") || name.includes("toy") || name.includes("book") || name.includes("cushion") || name.includes("pillow") || name.includes("diaper")) {
        M++;
      } else {
        S++;
      }
    }
    return { S, M, L, XL };
  };

  // Unified registry data
  const registryItems = useMemo(() => {
    let items = isAuthenticated ? (dbRegistry?.items || []) : guestItems;
    
    // For guest mode, if they have selected packaging and it hasn't been injected yet:
    if (!isAuthenticated && guestProfile?.selectedPackagingPattern && guestProfile?.selectedPackagingColor) {
      const boxes = calculatePackaging(items);
      const theme = guestProfile.selectedPackagingPattern;
      const color = guestProfile.selectedPackagingColor;
      
      const multiplier = {
        stripe: 1.0,
        dots: 1.1,
        chevron: 1.2,
        grid: 1.3
      }[theme] || 1.0;
      const basePrice = (boxes.S * 5000) + (boxes.M * 10000) + (boxes.L * 18000) + (boxes.XL * 35000);
      const finalPrice = Math.round(basePrice * multiplier);
      
      const themeName = {
        stripe: 'Stripe Envelope Theme',
        dots: 'Classic Dotted Box Theme',
        chevron: 'Premium Chevron Gift Box Theme',
        grid: 'Deluxe Grid Hamper Theme'
      }[theme] || 'Custom Gift Wrapper';

      const colorName = {
        pink: 'Muted Pink',
        blue: 'Support Blue',
        green: 'Support Green',
        gold: 'Support Gold',
        anchor: 'Anchor Grey'
      }[color] || color;

      const breakdownParts = [];
      if (boxes.S > 0) breakdownParts.push(`${boxes.S} S Box${boxes.S > 1 ? 'es' : ''}`);
      if (boxes.M > 0) breakdownParts.push(`${boxes.M} M Box${boxes.M > 1 ? 'es' : ''}`);
      if (boxes.L > 0) breakdownParts.push(`${boxes.L} L Wrapper${boxes.L > 1 ? 's' : ''}`);
      if (boxes.XL > 0) breakdownParts.push(`${boxes.XL} XL Hamper${boxes.XL > 1 ? 's' : ''}`);
      const breakdownText = breakdownParts.join(', ');

      const exists = items.some(i => i.productId === 'virtual-packaging');
      if (!exists) {
        items = [...items, {
          id: "virtual-packaging",
          productId: "virtual-packaging",
          name: `Gift Packaging: ${themeName} (${colorName})`,
          price: finalPrice,
          image: `virtual-packaging-${theme}-${color}`,
          category: "Gift Packaging",
          isMustHave: false,
          isGroupGifting: false,
          status: guestProfile.packagingStatus || "available",
          purchasedBy: guestProfile.packagingPurchasedBy,
          description: `Intelligent packaging bundle. Includes: ${breakdownText}`,
          patternType: theme,
          colorCode: color,
          boxesBreakdown: boxes
        }];
      }
    }
    
    return items;
  }, [isAuthenticated, dbRegistry, guestItems, guestProfile]);

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

  const updatePackaging = async (pattern, color) => {
    if (isAuthenticated && registryProfile) {
      try {
        await dbUpdatePackaging({
          registryId: registryProfile.id,
          pattern,
          color
        });
      } catch (error) {
        console.error("Failed to update packaging in database:", error);
      }
    } else if (guestProfile) {
      setGuestProfile(prev => ({
        ...prev,
        selectedPackagingPattern: pattern,
        selectedPackagingColor: color,
        packagingStatus: 'available',
        packagingPurchasedBy: undefined
      }));
    }
  };

  const removePackaging = async () => {
    if (isAuthenticated && registryProfile) {
      try {
        await dbRemovePackaging({
          registryId: registryProfile.id
        });
      } catch (error) {
        console.error("Failed to remove packaging from database:", error);
      }
    } else if (guestProfile) {
      setGuestProfile(prev => {
        const copy = { ...prev };
        delete copy.selectedPackagingPattern;
        delete copy.selectedPackagingColor;
        delete copy.packagingStatus;
        delete copy.packagingPurchasedBy;
        return copy;
      });
    }
  };

  const removeFromRegistry = async (itemId) => {
    if (itemId === 'virtual-packaging') {
      await removePackaging();
      return;
    }
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
    if (itemId === 'virtual-packaging') {
      if (isAuthenticated && registryProfile) {
        try {
          await dbAddContribution({
            registryId: registryProfile.id,
            productId: 'virtual-packaging',
            contributorName,
            amount: parseFloat(amount)
          });
        } catch (error) {
          console.error("Failed to add contribution for packaging in database:", error);
        }
      } else if (guestProfile) {
        setGuestProfile(prev => ({
          ...prev,
          packagingStatus: 'purchased',
          packagingPurchasedBy: { name: contributorName, date: new Date().toISOString() }
        }));
      }
      return;
    }

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
    if (itemId === 'virtual-packaging') {
      if (isAuthenticated && registryProfile) {
        try {
          await dbAddContribution({
            registryId: registryProfile.id,
            productId: 'virtual-packaging',
            contributorName: 'Anonymous Guest',
            amount: 0
          });
        } catch (error) {
          console.error("Failed to mark packaging as purchased in database:", error);
        }
      } else if (guestProfile) {
        setGuestProfile(prev => ({
          ...prev,
          packagingStatus: 'purchased',
          packagingPurchasedBy: { name: 'Anonymous Guest', date: new Date().toISOString() }
        }));
      }
      return;
    }

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
      await cartContext.removeFromCart(cartItem.id, cartItem.size, 'registry');
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
    moveFromCartToRegistry,
    updatePackaging,
    removePackaging
  };

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
};
