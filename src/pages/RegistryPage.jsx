import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegistry } from '../context/RegistryContext';
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import RegistryHeader from '../components/registry/RegistryHeader';
import RegistryCategoryGroup from '../components/registry/RegistryCategoryGroup';
import GroupGiftingModal from '../components/registry/GroupGiftingModal';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton';
import Toast from '../components/ui/Toast';
import './RegistryPage.css';

// Local Suggestion Product Card - Consistent with the Shop's Premium Product Card
const SuggestionProductCard = ({ product, onAddToRegistry }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { image, name, price, wasPrice, brand, tags, unitsSold } = product;
  const id = product.id || product._id;

  if (!imageLoaded && !imageError) {
    return (
      <div className="touch-scroll-item" style={{ flex: '0 0 240px', position: 'relative' }}>
        <ProductCardSkeleton />
        <img 
          src={image} 
          alt="" 
          onLoad={() => setImageLoaded(true)} 
          onError={() => setImageError(true)} 
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} 
        />
      </div>
    );
  }

  return (
    <article className="touch-scroll-item product-card product-card--loaded" style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', padding: 'var(--space-3)' }}>
      <Link to={`/product/${id}`} className="product-card__image-link" style={{ display: 'block', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
        <div className="product-card__image" style={{ height: '100%' }}>
          <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div className="product-card__tags">
            {unitsSold !== undefined && unitsSold > 0 && (
              <span className="tag tag--sales">
                {unitsSold} sold
              </span>
            )}
            {tags && tags
              .filter(tag => tag && tag.text && tag.text.toLowerCase() !== 'in stock')
              .map((tag, i) => (
                <span key={i} className={`tag tag--${tag.type}`}>{tag.text}</span>
              ))
            }
          </div>
        </div>
      </Link>
      
      <div className="product-card__info" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 'var(--space-3) 0 0', justifyContent: 'space-between' }}>
        <div>
          <span className="product-card__tier" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{brand || product.brand}</span>
          <Link to={`/product/${id}`} className="product-card__name-link">
            <h3 className="product-card__name" style={{ fontSize: '0.95rem', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: '2px', lineHeight: '1.2' }}>{name}</h3>
          </Link>
          <div className="product-card__price-row" style={{ marginTop: 'var(--space-1)', display: 'flex', gap: 'var(--space-2)' }}>
            <span className="product-card__price" style={{ fontSize: '0.95rem', fontWeight: '700' }}>UGX {price.toLocaleString()}</span>
            {wasPrice && <span className="product-card__price-was" style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>UGX {wasPrice.toLocaleString()}</span>}
          </div>
        </div>

        <button 
          className="product-card__add" 
          onClick={(e) => {
            e.preventDefault();
            onAddToRegistry(product);
          }}
          style={{ width: '100%', marginTop: 'var(--space-4)', paddingBlock: 'var(--space-2)' }}
        >
          Add to Registry
        </button>
      </div>
    </article>
  );
};

const RegistryPage = () => {
  const navigate = useNavigate();
  const {
    registryItems,
    registryProfile,
    loading,
    addToRegistry,
    toggleMustHave,
    confirmContribution,
    markAsPurchased,
    updatePrivacy,
    removeFromRegistry
  } = useRegistry();

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const convexUser = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const dbProducts = useQuery(api.data.getProducts, {}) || [];

  const [viewMode] = useState('parent'); // Default to parent for management
  const [activeTab, setActiveTab] = useState('registry'); // registry, thank-you
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Redirect guest/unauthenticated users to auth page
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log("[RegistryPage] User is unauthenticated, redirecting to /auth");
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Loading state checks (handles authentication, user details, and registry collection)
  const onboardingLoading = isAuthenticated && convexUser === undefined;
  const isPageLoading = authLoading || loading || onboardingLoading;

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
      setToastMessage(`"${item.name}" marked as gifted!`);
      setShowToast(true);
    }
  };

  const handleContributeClick = (itemId) => {
    const item = registryItems.find(i => i.id === itemId || i.productId === itemId);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmContribution = (itemId, contribution) => {
    confirmContribution(itemId, contribution.name, contribution.amount);
    const item = registryItems.find(i => i.id === itemId || i.productId === itemId);
    if (item) {
      setToastMessage(`UGX ${contribution.amount.toLocaleString()} contributed towards "${item.name}"!`);
      setShowToast(true);
    }
  };

  const showHeaderToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
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
    const stage = convexUser?.stage;
    if (stage === 'mother') return 'mother';
    if (stage === 'newborn') return 'newborn';
    if (stage === 'kid') return 'toddler';
    return 'newborn'; // default fallback
  }, [convexUser]);

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
              <button 
                className="btn-primary" 
                onClick={() => navigate('/onboarding')} 
                style={{ width: '100%', paddingBlock: 'var(--space-3)' }}
              >
                Finish Onboarding
              </button>
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
      <main className="dashboard-main registry-page" style={{ padding: 0 }}>
        <RegistryHeader 
          profile={registryProfile} 
          onShowToast={showHeaderToast}
        />

        <div className="registry-content" style={{ paddingInline: 0 }}>
          <section className="registry-controls-strip">
            <div className="parent-editorial-controls">
              <div className="parent-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
                  onClick={() => setActiveTab('registry')}
                >
                  Manage Registry
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'thank-you' ? 'active' : ''}`}
                  onClick={() => setActiveTab('thank-you')}
                >
                  Thank You Tracker
                </button>
              </div>
              
              {registryProfile && (
                <div className="privacy-settings-pill">
                  <span className="label-md">Privacy:</span>
                  <select 
                    className="privacy-select"
                    value={registryProfile.privacy}
                    onChange={(e) => {
                      updatePrivacy(e.target.value);
                      showHeaderToast(`Registry privacy updated to ${e.target.value}`);
                    }}
                  >
                    <option value="public">Public</option>
                    <option value="hidden">Hidden</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              )}
            </div>

            {/* Overall Progress Tracker Box (UGX-Based Overall Progress Bar) */}
            {activeTab === 'registry' && registryItems.length > 0 && (
              <div className="registry-overall-progress" style={{ background: 'var(--surface-container-low)', padding: 'var(--space-5) var(--space-6)', borderRadius: 'var(--radius-xl)', marginTop: 'var(--space-6)', boxShadow: 'var(--shadow-ambient)', border: '1px solid rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <h4 className="title-sm" style={{ fontFamily: 'var(--font-sans)', fontWeight: '700', color: 'var(--text-primary)' }}>Funding Progress</h4>
                    <p className="body-xs text-secondary" style={{ marginTop: '2px' }}>
                      UGX {totalRegistryStats.contributed.toLocaleString()} / {totalRegistryStats.total.toLocaleString()}
                    </p>
                  </div>
                  <span className="headline-sm" style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-editorial)', fontSize: 'var(--headline-md)' }}>
                    {totalRegistryStats.percent}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(totalRegistryStats.percent, 100)}%`, height: '100%', background: 'var(--color-brand-primary)', borderRadius: 'var(--radius-pill)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>
              </div>
            )}
          </section>

          {activeTab === 'registry' ? (
            <div className="registry-items-section">
              {categories.length > 0 ? (
                categories.map(cat => (
                  <RegistryCategoryGroup 
                    key={cat}
                    category={cat}
                    items={sortedItems.filter(i => i.category === cat)}
                    viewMode={viewMode}
                    onBuy={handleBuy}
                    onContribute={handleContributeClick}
                    onRemove={removeFromRegistry}
                  />
                ))
              ) : (
                // Post-Onboarding Empty State
                <div className="empty-state-container">
                  <div className="empty-state post-onboarding-empty" style={{ marginBottom: 'var(--space-12)' }}>
                    <div className="starter-kit" style={{ padding: 'var(--space-6)' }}>
                      <span className="label-md text-brand" style={{ color: 'var(--color-brand-primary)', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Getting Started
                      </span>
                      <h3 className="headline-md" style={{ fontFamily: 'var(--font-editorial)', marginTop: 'var(--space-2)' }}>Your Registry is Empty</h3>
                      <p className="body-md text-secondary" style={{ maxWidth: '480px', marginBlock: 'var(--space-4) 0', lineHeight: '1.5' }}>
                        Start your journey by adding curated, high-end essentials designed for your parenting phase below.
                      </p>
                    </div>
                  </div>

                  {/* Curated Recommendations Lanes */}
                  <section className="curated-recommendations-section" style={{ paddingBottom: 'var(--space-10)' }}>
                    <div className="recommendations-header" style={{ marginBottom: 'var(--space-8)' }}>
                      <h3 className="headline-md" style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--headline-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                        Recommended for Your Journey
                      </h3>
                      <p className="body-md text-secondary">
                        Hand-selected essentials from top-tier brands, optimized for your current stage. Click "Add to Registry" to include them.
                      </p>
                    </div>

                    <div className="recommended-packs-lanes" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                      {activePacks.map(([key, pack]) => (
                        <div key={key} className="recommended-pack-lane">
                          
                          {/* Left Leading pack-lead-card */}
                          <div className="pack-lead-card" style={{ background: pack.color }}>
                            <span className="label-xs text-brand">
                              {pack.badge}
                            </span>
                            <h4 className="headline-sm">
                              {pack.title}
                            </h4>
                            <p className="body-xs text-secondary">
                              {pack.description}
                            </p>
                            <button 
                              className="btn-primary btn-add-pack" 
                              onClick={() => handleAddGroupToRegistry(key, pack)}
                            >
                              Add Entire Pack
                            </button>
                          </div>

                          {/* Right Swipeable Lane Container (Using Consistent Shop Product Card Variant) */}
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
          ) : (
            <div className="thank-you-section">
              <div className="gift-log-table">
                <div className="log-header">
                  <span>Gift Item</span>
                  <span>Price Contributed</span>
                  <span>From</span>
                  <span>Date</span>
                </div>
                {contributionsList.length > 0 ? (
                  contributionsList.map(contrib => (
                    <div key={contrib.id} className="log-row">
                      <div className="gift-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <img src={contrib.image} alt="" className="mini-thumb" />
                        <span className="title-sm">{contrib.itemName}</span>
                      </div>
                      <span className="body-sm" style={{ fontWeight: '600', color: 'var(--color-brand-primary)' }}>
                        UGX {contrib.priceContributed.toLocaleString()}
                      </span>
                      <span className="body-sm" style={{ fontWeight: '500' }}>{contrib.from}</span>
                      <span className="body-sm text-secondary">{formatDate(contrib.date)}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 'var(--space-12) var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-md)' }}>
                    No contributions yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <GroupGiftingModal 
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmContribution}
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
