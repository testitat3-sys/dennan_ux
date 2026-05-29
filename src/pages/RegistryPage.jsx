import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegistry } from '../context/RegistryContext';
import { useCart } from '../context/CartContext';
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import RegistryHeader from '../components/registry/RegistryHeader';
import RegistryCategoryGroup from '../components/registry/RegistryCategoryGroup';
import GroupGiftingModal from '../components/registry/GroupGiftingModal';
import SuggestionProductCard from '../components/registry/SuggestionProductCard';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Catalog Search & Suggested Items
  const displayedSearchProducts = useMemo(() => {
    const registryProductIds = new Set(registryItems.map(item => item.productId || item.id));
    const available = dbProducts.filter(p => !registryProductIds.has(p._id || p.id || p.productId));

    if (!searchQuery.trim()) {
      const stageFilter = convexUser?.stage || 'newborn';
      const stageProducts = available.filter(p => p.stage === stageFilter);
      return stageProducts.length > 0 ? stageProducts.slice(0, 4) : available.slice(0, 4);
    }

    return available.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 8);
  }, [dbProducts, searchQuery, registryItems, convexUser]);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');



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
        <RegistryHeader
          profile={registryProfile}
          onShowToast={showHeaderToast}
          onAddFromCart={() => setIsCartOpen(true)}
          totalRegistryStats={totalRegistryStats}
          registryItems={registryItems}
        />

        <div className="registry-content">
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
                  <section className="curated-recommendations-section" style={{ backgroundColor: "blue", paddingBottom: 'var(--space-10)' }}>
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
                              <h4 className="headline-sm" style={{ margin: 0 }}>
                                {pack.title}
                              </h4>
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

          {/* Persistent Suggested Items Section with dynamic Search Bar */}
          <section className="registry-discovery-section" style={{ borderTop: '1px dashed var(--surface-container-high)', paddingTop: 'var(--space-16)', paddingBottom: '0' }}>
            <div className="discovery-header" style={{ marginBottom: 'var(--space-8)' }}>
              <h3 className="headline-md" style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--headline-lg)', color: 'var(--text-primary)' }}>
                Add Items to Your Registry
              </h3>
              <p className="body-md text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                Search our premium catalog or browse suggested essentials below to build your dream collection.
              </p>

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

            {/* Search Results / Curated Suggestions Grid */}
            <div className="registry-search-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
              {displayedSearchProducts.length > 0 ? (
                displayedSearchProducts.map(product => (
                  <SuggestionProductCard
                    key={product.id || product._id}
                    product={product}
                    onAddToRegistry={handleAddToRegistry}
                  />
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: 'var(--space-8) 0', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                  No matching products found. Try searching for "crib", "stroller", or "backpack".
                </div>
              )}
            </div>
          </section>
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
