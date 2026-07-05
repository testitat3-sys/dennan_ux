import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegistry } from '../context/RegistryContext';
import { useCart } from '../context/CartContext';
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import RegistryHeader from '../components/registry/RegistryHeader';
import RegistryCategoryGroup from '../components/registry/RegistryCategoryGroup';
import AddEventModal from '../components/registry/AddEventModal';
import DeleteConfirmModal from '../components/registry/DeleteConfirmModal';
import SuggestionProductCard from '../components/products/SuggestionProductCard';
import RegistrySuggestionRail from '../components/registry/RegistrySuggestionRail';
import ContributionModal from '../components/registry/ContributionModal';
import PesapalPaymentModal from '../components/checkout/PesapalPaymentModal';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import ProductCardSkeleton from '../components/products/ProductCardSkeleton';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import ContributorsModal from '../components/registry/ContributorsModal';
import NotifySignupModal from '../components/registry/NotifySignupModal';
import { ShoppingBag, Plus, Trash2, ArrowRight } from 'lucide-react';
import './RegistryPage.css';
import SearchStrip from '../components/home/SearchStrip';

const RegistryPage = () => {
  const navigate = useNavigate();
  const { setIsCartOpen } = useCart();
  const {
    registryItems,
    registryProfile,
    loading,
    addToRegistry,
    toggleMustHave,
    markAsPurchased,
    updatePrivacy,
    removeFromRegistry,
    removePackaging
  } = useRegistry();

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const convexUser = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const dbProducts = useQuery(api.data.getProducts, {}) || [];

  const [viewMode] = useState('parent'); // Default to parent for management
  const [activeTab, setActiveTab] = useState('registry'); // registry, thank-you
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null); // { redirectUrl, paymentId, item, amount }
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isContributorsModalOpen, setIsContributorsModalOpen] = useState(false);
  const [seenContributorsModal, setSeenContributorsModal] = useState([]);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Convex mutation for saving event type
  const dbSetEventType = useMutation(api.registry.setEventType);

  // Dynamic Catalog Search & Suggested Items
  const displayedSearchProducts = useMemo(() => {
    const registryProductIds = new Set(registryItems.map(item => item.productId || item.id));
    const available = dbProducts.filter(p => !registryProductIds.has(p._id || p.id || p.productId));

    if (!searchQuery.trim()) {
      const stageFilter = convexUser?.stage || 'newborn';
      const stageProducts = available.filter(p => p.stage === stageFilter);
      return stageProducts.length > 0 ? stageProducts.slice(0, 8) : available.slice(0, 8);
    }

    return available.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 8);
  }, [dbProducts, searchQuery, registryItems, convexUser]);

  // Toast States & Queue Management
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastQueue, setToastQueue] = useState([]);
  const [hasCheckedUnseen, setHasCheckedUnseen] = useState(false);

  // Loading state checks (handles authentication, user details, and registry collection)
  const onboardingLoading = isAuthenticated && convexUser === undefined;
  const isPageLoading = authLoading || loading || onboardingLoading;

  // Process the toast queue in succession with a smooth transition delay
  useEffect(() => {
    if (!showToast && toastQueue.length > 0) {
      const timer = setTimeout(() => {
        const nextToast = toastQueue[0];
        setToastMessage(nextToast);
        setShowToast(true);
        setToastQueue(prev => prev.slice(1));
      }, 600); // 600ms delay gives enough time for the closing animation to fully finish
      return () => clearTimeout(timer);
    }
  }, [showToast, toastQueue]);



  // Sorting: Must-Haves first (Removed priceFilter)
  const sortedItems = useMemo(() => {
    return [...registryItems].sort((a, b) => {
      if (a.isMustHave && !b.isMustHave) return -1;
      if (!a.isMustHave && b.isMustHave) return 1;
      return 0;
    });
  }, [registryItems]);

  const categories = useMemo(() => {
    const cats = [...new Set(sortedItems.map(item => item.category))];
    return cats;
  }, [sortedItems]);

  const handleBuy = (itemId) => {
    markAsPurchased(itemId);
    const item = registryItems.find(i => i.id === itemId || i.productId === itemId);
    if (item) {
      // Optimistically mark this purchase as seen in localStorage to prevent double toasting
      const expectedId = `purchased-${itemId}`;
      try {
        const stored = localStorage.getItem('dennan_seen_contributions');
        const seen = stored ? JSON.parse(stored) : [];
        if (!seen.includes(expectedId)) {
          localStorage.setItem('dennan_seen_contributions', JSON.stringify([...seen, expectedId]));
        }
      } catch (e) {}

      setToastMessage(`"${item.name}" marked as gifted!`);
      setShowToast(true);
    }
  };

  const handleContributeClick = (itemId) => {
    const item = registryItems.find(i => i.id === itemId || i.productId === itemId);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handlePaymentInitiated = ({ redirectUrl, paymentId, item, amount }) => {
    setPendingPayment({ redirectUrl, paymentId, item, amount });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    if (pendingPayment) {
      setToastMessage(`UGX ${pendingPayment.amount.toLocaleString()} contributed towards "${pendingPayment.item.name}"!`);
      setShowToast(true);
    }
    setPendingPayment(null);
  };

  const handlePaymentFailure = () => {
    setIsPaymentModalOpen(false);
    setToastMessage('Payment did not go through. Please try again.');
    setShowToast(true);
    setPendingPayment(null);
  };

  const showHeaderToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleInitiateRemove = (itemId) => {
    const item = registryItems.find(i => i.id === itemId || i.productId === itemId);
    if (!item) return;

    const totalContributed = (item.contributions || []).reduce((acc, c) => acc + c.amount, 0);

    if (totalContributed > 0) {
      setItemToDelete({ item, totalContributed });
      setIsDeleteConfirmOpen(true);
    } else {
      removeFromRegistry(item.id || item.productId);
      setToastMessage(`"${item.name}" removed from your registry.`);
      setShowToast(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { item, totalContributed } = itemToDelete;
    
    await removeFromRegistry(item.id || item.productId);
    setToastMessage(`"${item.name}" removed. UGX ${totalContributed.toLocaleString()} converted to Dennan Store Credit!`);
    setShowToast(true);
    
    setIsDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  // Overall Master Progress Calculator
  const totalRegistryStats = useMemo(() => {
    if (registryItems.length === 0) return { percent: 0, contributed: 0, total: 0 };

    let totalValue = 0;
    let contributedValue = 0;

    registryItems.forEach(item => {
      totalValue += item.price;
      if (item.status === 'purchased') {
        contributedValue += item.price;
      } else if (item.isGroupGifting && item.contributions) {
        contributedValue += item.contributions.reduce((acc, curr) => acc + curr.amount, 0);
      }
    });

    const percent = Math.round((contributedValue / totalValue) * 100) || 0;
    return { percent, contributed: contributedValue, total: totalValue };
  }, [registryItems]);

  const contributionsList = useMemo(() => {
    const list = [];
    registryItems.forEach(item => {
      // Direct full purchase
      if (item.status === 'purchased' && (!item.contributions || item.contributions.length === 0)) {
        list.push({
          id: `purchased-${item.id || item.productId}`,
          itemName: item.name,
          image: item.image,
          from: item.purchasedBy?.name || 'Anonymous Gifter',
          priceContributed: item.price,
          date: item.purchasedBy?.date || new Date().toISOString(),
        });
      }
      // Group gifting contributions
      if (item.contributions && item.contributions.length > 0) {
        item.contributions.forEach((contrib, idx) => {
          list.push({
            id: `contrib-${item.id || item.productId}-${idx}`,
            itemName: item.name,
            image: item.image,
            from: contrib.name || 'Anonymous Contributor',
            priceContributed: contrib.amount,
            date: contrib.date || new Date().toISOString(),
          });
        });
      }
    });
    // Sort list by date descending (most recent first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [registryItems]);

  // Load seen contributors modal on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dennan_seen_contributors_modal');
      if (stored) {
        setSeenContributorsModal(JSON.parse(stored));
      }
    } catch (e) {
      console.error('[RegistryPage] failed to parse seen contributors modal:', e);
    }
  }, []);

  const unseenContributorsCount = useMemo(() => {
    const seenSet = new Set(seenContributorsModal);
    return contributionsList.filter(c => !seenSet.has(c.id)).length;
  }, [contributionsList, seenContributorsModal]);

  const handleOpenContributorsModal = () => {
    setIsContributorsModalOpen(true);
  };

  const handleCloseContributorsModal = () => {
    setIsContributorsModalOpen(false);
    const currentIds = contributionsList.map(c => c.id);
    setSeenContributorsModal(currentIds);
    try {
      localStorage.setItem('dennan_seen_contributors_modal', JSON.stringify(currentIds));
    } catch (e) {
      console.error('[RegistryPage] failed to save seen contributors modal:', e);
    }
  };

  const handleNotifySignupSuccess = () => {
    setToastMessage("You're on the list! We'll email you when Gift Wrapping launches.");
    setShowToast(true);
  };

  // Live reactive notifications & catch-up for offline contributions
  useEffect(() => {
    if (isPageLoading || registryItems.length === 0) return;

    let storedSeen;
    try {
      const stored = localStorage.getItem('dennan_seen_contributions');
      storedSeen = stored ? JSON.parse(stored) : null;
    } catch (e) {
      storedSeen = null;
    }

    const currentIds = contributionsList.map(c => c.id);

    if (storedSeen === null) {
      // First time tracking: initialize localStorage with current contributions and don't toast them
      try {
        localStorage.setItem('dennan_seen_contributions', JSON.stringify(currentIds));
      } catch (e) {
        console.error('[RegistryPage] failed to initialize localStorage:', e);
      }
      setHasCheckedUnseen(true);
      return;
    }

    const seenSet = new Set(storedSeen);

    // Find any new contributions that aren't in the seen list
    const newContributions = contributionsList.filter(c => !seenSet.has(c.id));

    if (newContributions.length > 0) {
      // If we haven't done the initial load catch-up yet, we cap at 3 to prevent spam
      const toProcess = !hasCheckedUnseen 
        ? newContributions.slice(0, 3) 
        : newContributions;

      const newToastMessages = toProcess.map(c => {
        const amountStr = c.priceContributed.toLocaleString();
        return `🎉 ${c.from} just contributed UGX ${amountStr} towards "${c.itemName}"!`;
      });

      // Add to the queue
      setToastQueue(prev => [...prev, ...newToastMessages]);

      // Update localStorage seen IDs with ALL new IDs
      const updatedSeen = Array.from(new Set([...storedSeen, ...currentIds]));
      try {
        localStorage.setItem('dennan_seen_contributions', JSON.stringify(updatedSeen));
      } catch (e) {
        console.error('[RegistryPage] failed to update localStorage:', e);
      }
    }

    setHasCheckedUnseen(true);
  }, [contributionsList, isPageLoading, hasCheckedUnseen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Curated fallback packs
  const packs = useMemo(() => {
    const stage1Products = dbProducts.filter(p => p.stage === 'mother').slice(0, 3);
    const stage2Products = dbProducts.filter(p => p.stage === 'newborn').slice(0, 3);
    const stage3Products = dbProducts.filter(p => p.stage === 'kid').slice(0, 3);
    const stage4Products = dbProducts.filter(p => p.stage === 'christening').slice(0, 3);

    const fallbackMother = [
      {
        id: "mock-m1",
        _id: "mock-m1",
        name: "Closer to Nature Starter Set",
        brand: "Tommee Tippee",
        price: 180000,
        image: "/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif",
        category: "Feeding",
        stage: "mother",
        tags: [{ type: "primary", text: "Newborn Starter" }]
      },
      {
        id: "mock-m2",
        _id: "mock-m2",
        name: "Silicone Breast Pump Manual",
        brand: "Haakaa",
        price: 95000,
        image: "https://picsum.photos/400/400?random=11",
        category: "Nursing",
        stage: "mother",
        tags: [{ type: "primary", text: "Must-Have" }]
      },
      {
        id: "mock-m3",
        _id: "mock-m3",
        name: "Hospital Bag Essentials",
        brand: "Mamas & Papas",
        price: 150000,
        image: "/new_assets/Organic Cotton Starter Set.jfif",
        category: "Apparel",
        stage: "mother",
        tags: [{ type: "primary", text: "Organic" }]
      }
    ];

    const fallbackNewborn = [
      {
        id: "mock-n1",
        _id: "mock-n1",
        name: "SnüzPod 4 Bedside Crib",
        brand: "Snuz",
        price: 850000,
        image: "/new_assets/SnüzPod 4 Bedside Crib - White.jfif",
        category: "Sleep",
        stage: "newborn",
        tags: [{ type: "primary", text: "Premium Sleep" }]
      },
      {
        id: "mock-n2",
        _id: "mock-n2",
        name: "Skip Hop Forma Backpack",
        brand: "Skip Hop",
        price: 295000,
        image: "/new_assets/Skip Hop Forma Backpack Nappy Bag.jfif",
        category: "Comfort",
        stage: "newborn",
        tags: [{ type: "primary", text: "Top Rated" }]
      },
      {
        id: "mock-n3",
        _id: "mock-n3",
        name: "Organic Cotton Starter Set",
        brand: "Mamas & Papas",
        price: 150000,
        image: "/new_assets/Organic Cotton Starter Set.jfif",
        category: "Apparel",
        stage: "newborn",
        tags: [{ type: "primary", text: "Eco-Friendly" }]
      }
    ];

    const fallbackToddler = [
      {
        id: "mock-t1",
        _id: "mock-t1",
        name: "Babycook Neo Blender",
        brand: "Beaba",
        price: 650000,
        image: "/new_assets/BÉABA Babycook Neo Food Blender.jfif",
        category: "Weaning",
        stage: "kid",
        tags: [{ type: "primary", text: "French Design" }]
      },
      {
        id: "mock-t2",
        _id: "mock-t2",
        name: "Babycook Solo",
        brand: "Beaba",
        price: 470000,
        image: "/new_assets/BÉABA Babycook Solo.jfif",
        category: "Weaning",
        stage: "kid",
        tags: [{ type: "primary", text: "Compact Weaning" }]
      },
      {
        id: "mock-t3",
        _id: "mock-t3",
        name: "Explore & More Gym",
        brand: "Skip Hop",
        price: 320000,
        image: "https://picsum.photos/400/400?random=15",
        category: "Play",
        stage: "kid",
        tags: [{ type: "primary", text: "Developmental" }]
      }
    ];

    const fallbackChristening = [
      {
        id: "mock-c1",
        _id: "mock-c1",
        name: "Heirloom Linen Christening Gown",
        brand: "Mamas & Papas",
        price: 250000,
        image: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=400&auto=format&fit=crop&q=80",
        category: "Apparel",
        stage: "christening",
        tags: [{ type: "primary", text: "Heirloom Outfit" }]
      },
      {
        id: "mock-c2",
        _id: "mock-c2",
        name: "Sterling Silver Keepsake Spoon & Rattle Set",
        brand: "Tiffany & Co.",
        price: 450000,
        image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&auto=format&fit=crop&q=80",
        category: "Keepsakes",
        stage: "christening",
        tags: [{ type: "primary", text: "Sterling Silver" }]
      },
      {
        id: "mock-c3",
        _id: "mock-c3",
        name: "Embroidered Organic Cotton Shawl",
        brand: "Mamas & Papas",
        price: 180000,
        image: "/new_assets/Organic Cotton Starter Set.jfif",
        category: "Comfort",
        stage: "christening",
        tags: [{ type: "primary", text: "100% Organic" }]
      }
    ];

    return {
      mother: {
        title: "Expectant Mothers",
        description: "Curated daily comfort, nursing, and recovery staples designed for your third trimester and hospital bag.",
        color: "rgba(211, 80, 151, 0.05)", // Muted Brand Primary
        badge: "Stage 1",
        items: stage1Products.length > 0 ? stage1Products : fallbackMother
      },
      newborn: {
        title: "Newborn Journey",
        description: "Clinical precision and soft organic cotton essentials designed for sleep, comfort, and gentle grooming.",
        color: "rgba(77, 190, 227, 0.05)", // Muted Support Blue
        badge: "Stage 2",
        items: stage2Products.length > 0 ? stage2Products : fallbackNewborn
      },
      toddler: {
        title: "Baby & Toddler",
        description: "Safety-tested active gear, feeding processors, and milestone play products designed for high curiosity.",
        color: "rgba(127, 169, 62, 0.05)", // Muted Support Green
        badge: "Stage 3",
        items: stage3Products.length > 0 ? stage3Products : fallbackToddler
      },
      christening: {
        title: "Christening Celebration",
        description: "Elegant keepsake gifts, embroidered linen shawls, and heirloom outfits designed for a beautiful, blessed christening ceremony.",
        color: "rgba(225, 211, 40, 0.05)", // Muted Gold Brand Accent
        badge: "Special Event",
        items: stage4Products.length > 0 ? stage4Products : fallbackChristening
      }
    };
  }, [dbProducts]);

  const handleAddToRegistry = async (product) => {
    const success = await addToRegistry(product);
    if (success) {
      setToastMessage(`"${product.name}" added to your registry!`);
      setShowToast(true);
    } else {
      setToastMessage(`"${product.name}" is already in your registry.`);
      setShowToast(true);
    }
  };

  const handleAddGroupToRegistry = async (packKey, pack) => {
    let addedCount = 0;
    for (const item of pack.items) {
      const success = await addToRegistry(item);
      if (success) {
        addedCount++;
      }
    }
    if (addedCount > 0) {
      setToastMessage(`Added ${addedCount} essentials from ${pack.title} to your registry!`);
      setShowToast(true);
    } else {
      setToastMessage(`All essentials from ${pack.title} are already in your registry.`);
      setShowToast(true);
    }
  };

  // Stage Personalization Selector
  const userStagePackKey = useMemo(() => {
    if (registryProfile?.eventType?.toLowerCase() === 'christening') {
      return 'christening';
    }
    const stage = convexUser?.stage;
    if (stage === 'mother') return 'mother';
    if (stage === 'newborn') return 'newborn';
    if (stage === 'kid') return 'toddler';
    return 'newborn'; // default fallback
  }, [convexUser, registryProfile]);

  const activePacks = useMemo(() => {
    const key = userStagePackKey;
    if (packs[key]) {
      return [[key, packs[key]]];
    }
    return Object.entries(packs);
  }, [packs, userStagePackKey]);

  // High-Fidelity Pulse Skeleton Loader (Preserves left sidebar)
  if (isPageLoading) {
    return (
      <div className="dashboard-container">
        <DashboardSidebar />
        <main className="dashboard-main registry-page" style={{ padding: 'var(--space-8) var(--space-6)' }}>
          <div className="registry-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ width: '80px', height: '14px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-pill)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '220px', height: '36px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                <div style={{ width: '100px', height: '32px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '100px', height: '32px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>

            <div style={{ height: '90px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: '180px', height: '14px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-sm)' }} />
                <div style={{ width: '40px', height: '14px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-pill)' }} />
            </div>

            <div>
              <div style={{ width: '150px', height: '24px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isOnboarded = convexUser?.isOnboarded === true;

  if (!isOnboarded) {
    return (
      <div className="dashboard-container">
        {/* Persisted Sidebar Navigation */}
        <DashboardSidebar />

        {/* Locked Main Content Canvas */}
        <main className="dashboard-main registry-page" style={{ padding: 0 }}>
          <div className="onboarding-gate-wrapper">
            <div className="onboarding-gate-card">
              <span className="label-md text-brand" style={{ color: 'var(--color-brand-primary)', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 'var(--space-4)' }}>
                Registry Setup Required
              </span>
              <h1 className="headline-lg" style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--headline-lg)', color: 'var(--text-primary)', margin: 0 }}>
                Finish Your Onboarding
              </h1>
              <p className="body-md text-secondary" style={{ lineHeight: '1.6', marginBlock: 'var(--space-4) var(--space-8)' }}>
                Complete your parenting profile to activate your baby registry. This unlocks personalized, stage-by-stage suggested essentials and safe shipping parameters.
              </p>
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/onboarding')}
              >
                Finish Onboarding
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Persisted Sidebar */}
      <DashboardSidebar />

      {/* Main Registry Canvas */}
      <main className="dashboard-main registry-page">
        <div className="registry-page-inner">
          <RegistryHeader
            profile={registryProfile}
            onShowToast={showHeaderToast}
            onAddFromCart={() => setIsCartOpen(true)}
            totalRegistryStats={totalRegistryStats}
            registryItems={registryItems}
            hasContributors={contributionsList.length > 0}
            unseenContributorsCount={unseenContributorsCount}
            onSeeContributors={handleOpenContributorsModal}
          />

          <div className="registry-content">
            <div className="registry-items-section">
              {/* ── Empty state: no event type set yet ───────────────────────── */}
              {!registryProfile?.eventType && categories.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                  <Card
                    hasShadow={true}
                    hasBorder={true}
                    className="empty-state-card"
                    style={{ maxWidth: 480, width: '100%' }}
                  >
                    <Card.Header>
                      <Text
                        variant="label-md"
                        color="brand-primary"
                        style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}
                      >
                        Registry
                      </Text>
                      <Text
                        variant="headline-md"
                        color="primary"
                        style={{ fontFamily: 'var(--font-editorial)', margin: 0 }}
                      >
                        Your registry is empty
                      </Text>
                    </Card.Header>
                    <Card.Body>
                      <Text variant="body-lg" color="secondary">
                        Create an event to start building your registry.
                      </Text>
                    </Card.Body>
                    <Card.Actions>
                      <Button
                        variant="primary"
                        icon={<Plus size={16} />}
                        iconPosition="left"
                        onClick={() => setIsAddEventOpen(true)}
                      >
                        Add an event
                      </Button>
                    </Card.Actions>
                  </Card>
                </div>
              ) : categories.length > 0 ? (
                <>
                  <RegistryCategoryGroup
                    key="gift-items"
                    category="Gift Items"
                    title="Gift Items"
                    items={sortedItems}
                    viewMode={viewMode}
                    onBuy={handleBuy}
                    onContribute={handleContributeClick}
                    onRemove={handleInitiateRemove}
                  />

                  {/* Gift Wrapping Section */}
                  <section className="category-group packaging-section" style={{ borderTop: '1px dashed var(--surface-container-high)', marginTop: 'var(--space-12)', paddingTop: 'var(--space-10)' }}>
                    <div className="gift-wrapping-banner">
                      <div className="gift-wrapping-banner__image">
                        <img src="/new_assets/gifting.png" alt="Gift wrapping" />
                      </div>
                      <div className="gift-wrapping-banner__content">
                        <span className="gift-wrapping-banner__badge">Gift Wrapping</span>
                        <Text variant="body-lg" color="secondary" style={{ marginTop: 'var(--space-3)' }}>
                          Beautiful wrapping for birthdays, baby showers, and more. Soon you'll be able to personalise them with your own heartfelt message.
                        </Text>
                        <Button
                          variant="primary"
                          onClick={() => setIsNotifyModalOpen(true)}
                          style={{ marginTop: 'var(--space-4)' }}
                        >
                          Notify Me
                        </Button>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                /* ── Event set but no items yet: show curated recommendations */
                <div className="empty-state-container">
                  <div className="empty-state post-onboarding-empty" style={{ marginBottom: 'var(--space-12)' }}>
                    <div className="starter-kit">
                      <span className="label-md text-brand" style={{ color: 'var(--color-brand-primary)', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Getting Started
                      </span>
                      <Text
                        variant="headline-md"
                        color="primary"
                        style={{ fontFamily: 'var(--font-editorial)', marginTop: 'var(--space-2)', marginBlock: 0 }}
                      >
                        Your Registry is Empty
                      </Text>
                      <Text
                        variant="body-md"
                        color="secondary"
                        style={{ maxWidth: '480px', marginBlock: 'var(--space-4) 0', lineHeight: '1.5' }}
                      >
                        Start your journey by adding curated, high-end essentials designed for your parenting phase below.
                      </Text>
                    </div>
                  </div>

                  {/* Curated Recommendations Lanes */}
                  <section className="curated-recommendations-section" style={{ paddingBottom: 'var(--space-10)' }}>
                    <div className="recommendations-header" style={{ marginBottom: 'var(--space-8)' }}>
                      <Text
                        variant="headline-md"
                        color="primary"
                        style={{ fontFamily: 'var(--font-editorial)', marginBottom: 'var(--space-2)', marginTop: 0 }}
                      >
                        Recommended for Your Journey
                      </Text>
                      <Text
                        variant="body-md"
                        color="secondary"
                        style={{ fontWeight: 300 }}
                      >
                        Hand-selected essentials from top-tier brands, optimized for your current stage. Click "Add to Registry" to include them.
                      </Text>
                    </div>

                    <div className="recommended-packs-lanes" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                      {activePacks.map(([key, pack]) => (
                        <div key={key} className="recommended-pack-lane">

                          {/* Left Leading Pack Card */}
                          <Card
                            variant="feature"
                            className="pack-lead-card"
                            style={{ background: pack.color, flex: '0 0 300px' }}
                          >
                            <Card.Header>
                              <span className="label-xs text-brand">
                                {pack.badge}
                              </span>
                              <Text
                                variant="headline-sm"
                                color="primary"
                                style={{ fontFamily: 'var(--font-editorial)', margin: 0 }}
                              >
                                {pack.title}
                              </Text>
                            </Card.Header>
                            <Card.Body>
                              <p className="body-xs text-secondary">
                                {pack.description}
                              </p>
                            </Card.Body>
                            <Card.Actions>
                              <Button
                                variant="primary"
                                fullWidth
                                onClick={() => handleAddGroupToRegistry(key, pack)}
                                icon={<ArrowRight size={16} />}
                                iconPosition="right"
                              >
                                Add Entire Pack
                              </Button>
                            </Card.Actions>
                          </Card>

                          {/* Right Swipeable Lane */}
                          <div className="touch-scroll-row">
                            {pack.items.map((item, idx) => (
                              <SuggestionProductCard
                                key={item.id || idx}
                                product={item}
                                onAddToRegistry={handleAddToRegistry}
                              />
                            ))}
                          </div>

                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

          {/* Persistent Suggested Items Section with dynamic Search Bar */}
          <section className="registry-discovery-section" style={{ borderTop: '1px dashed var(--surface-container-high)', paddingTop: 'var(--space-16)', paddingBottom: '0' }}>
            <div className="discovery-header" style={{ marginBottom: 'var(--space-8)' }}>
              <Text
                variant="headline-md"
                color="primary"
                style={{ fontFamily: 'var(--font-editorial)', margin: 0 }}
              >
                Add Items to Your Registry
              </Text>
              <Text
                variant="body-md"
                color="secondary"
                style={{ fontWeight: 300, marginTop: 'var(--space-2)' }}
              >
                Search our premium catalog or browse suggested essentials below to build your dream collection.
              </Text>

              {/* Search Bar Input Container */}
              <div className="registry-search-bar-wrap" style={{ marginTop: 'var(--space-6)', maxWidth: '500px', marginBottom: 'var(--space-8)' }}>
                <SearchStrip
                  initialQuery={searchQuery}
                  placeholder="Search premium stroller, bedside crib, bottles..."
                  isMinimal={true}
                  onChange={(val) => setSearchQuery(val)}
                  onSubmit={(val) => setSearchQuery(val)}
                />
              </div>
            </div>

            {/* Suggested Products Rail: horizontal scroll on desktop, 2-col/first-4 grid on mobile */}
            {displayedSearchProducts.length > 0 ? (
              <RegistrySuggestionRail
                products={displayedSearchProducts}
                onAddToRegistry={handleAddToRegistry}
              />
            ) : (
              <div style={{ padding: 'var(--space-8) 0', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                No matching products found. Try searching for "crib", "stroller", or "backpack".
              </div>
            )}
          </section>
        </div>
        </div>
      </main>

      <DeleteConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        item={itemToDelete?.item}
        totalContributed={itemToDelete?.totalContributed || 0}
      />

      <ContributorsModal
        isOpen={isContributorsModalOpen}
        onClose={handleCloseContributorsModal}
        contributions={contributionsList}
        seenContributorsModal={seenContributorsModal}
      />

      <ContributionModal
        item={selectedItem}
        registryId={registryProfile?.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPaymentInitiated={handlePaymentInitiated}
      />

      <PesapalPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        redirectUrl={pendingPayment?.redirectUrl}
        orderId={pendingPayment?.paymentId}
        statusEndpoint="contribution-status?paymentId="
        successStatuses={['completed']}
        failureStatuses={['failed']}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onConfirm={async (label) => {
          try {
            await dbSetEventType({ eventType: label });
          } catch (err) {
            console.error('[RegistryPage] setEventType error:', err);
          }
          setIsAddEventOpen(false);
        }}
      />

      <NotifySignupModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        onSuccess={handleNotifySignupSuccess}
        convexUser={convexUser}
        source="registry_gift_wrapping"
        title="Get notified when Gift Wrapping launches"
        subtext="Leave your details and we'll email you the moment premium gift wrapping is ready."
      />

      {/* Floating notifications */}
      <Toast
        isOpen={showToast}
        message={toastMessage}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default RegistryPage;
