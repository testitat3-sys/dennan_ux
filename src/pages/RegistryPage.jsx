import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistry } from '../context/RegistryContext';
import RegistryHeader from '../components/registry/RegistryHeader';
import RegistryCategoryGroup from '../components/registry/RegistryCategoryGroup';
import GroupGiftingModal from '../components/registry/GroupGiftingModal';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import Toast from '../components/ui/Toast';
import './RegistryPage.css';

const RegistryPage = () => {
  const navigate = useNavigate();
  const {
    registryItems,
    registryProfile,
    loading,
    toggleMustHave,
    confirmContribution,
    markAsPurchased,
    updatePrivacy,
    removeFromRegistry
  } = useRegistry();

  const [viewMode, setViewMode] = useState('parent'); // Default to parent for dashboard, switchable to guest
  const [priceFilter, setPriceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('registry'); // registry, thank-you
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Sorting: Must-Haves first
  const sortedItems = useMemo(() => {
    let filtered = [...registryItems];
    
    // Apply price filter (UGX equivalents for < £25, £25–£100, > £100)
    if (priceFilter === 'under25') filtered = filtered.filter(i => i.price < 120000);
    else if (priceFilter === '25to100') filtered = filtered.filter(i => i.price >= 120000 && i.price <= 480000);
    else if (priceFilter === 'over100') filtered = filtered.filter(i => i.price > 480000);

    return filtered.sort((a, b) => {
      if (a.isMustHave && !b.isMustHave) return -1;
      if (!a.isMustHave && b.isMustHave) return 1;
      return 0;
    });
  }, [registryItems, priceFilter]);

  const categories = useMemo(() => {
    const cats = [...new Set(sortedItems.map(item => item.category))];
    return cats;
  }, [sortedItems]);

  const handleToggleMustHave = (itemId) => {
    toggleMustHave(itemId);
    const item = registryItems.find(i => i.id === itemId || i.productId === itemId);
    if (item) {
      setToastMessage(`"${item.name}" preferences updated.`);
      setShowToast(true);
    }
  };

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

  if (loading || !registryProfile) {
    return (
      <div className="registry-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
        Retrieving your baby registry...
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
          viewMode={viewMode} 
          setViewMode={setViewMode} 
          onShowToast={showHeaderToast}
        />

        <div className="registry-content" style={{ paddingInline: 0 }}>
          <section className="registry-controls-strip">
            {viewMode === 'parent' && (
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
              </div>
            )}

            {activeTab === 'registry' && (
              <div className="filters-row">
                <div className="filter-group">
                  <span className="label-md uppercase tracking-wider" style={{ letterSpacing: '0.08em', fontWeight: '700', color: 'var(--text-tertiary)' }}>
                    Curate by Price
                  </span>
                  <div className="price-chips">
                    {['all', 'under25', '25to100', 'over100'].map(f => (
                      <button 
                        key={f}
                        className={`chip ${priceFilter === f ? 'active' : ''}`}
                        onClick={() => setPriceFilter(f)}
                      >
                        {f === 'all' ? 'All' : f === 'under25' ? '< UGX 120k' : f === '25to100' ? 'UGX 120k – 480k' : '> UGX 480k'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="registry-stats desktop-only">
                  <span className="label-md">Total Items: {registryItems.length}</span>
                  <span className="label-md">Purchased: {registryItems.filter(i => i.status === 'purchased').length}</span>
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
                    onToggleMustHave={handleToggleMustHave}
                    onBuy={handleBuy}
                    onContribute={handleContributeClick}
                    onRemove={removeFromRegistry}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <div className="starter-kit">
                    <span className="label-md text-brand" style={{ color: 'var(--color-brand-primary)', fontWeight: '700' }}>Getting Started</span>
                    <h3 className="headline-md">Your Registry is Empty</h3>
                    <p className="body-sm text-secondary">
                      Start your journey by adding curated selections from your wishlist or shopping cart.
                    </p>
                    <div className="starter-suggestions">
                      <div className="suggestion-card">
                        <img src="/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif" alt="" />
                        <span className="label-md" style={{ marginTop: 'var(--space-2)', fontWeight: '600' }}>Feeding</span>
                      </div>
                      <div className="suggestion-card">
                        <img src="/new_assets/SnüzPod 4 Bedside Crib - White.jfif" alt="" />
                        <span className="label-md" style={{ marginTop: 'var(--space-2)', fontWeight: '600' }}>Nursery</span>
                      </div>
                      <div className="suggestion-card">
                        <img src="/new_assets/Organic Cotton Starter Set.jfif" alt="" />
                        <span className="label-md" style={{ marginTop: 'var(--space-2)', fontWeight: '600' }}>Apparel</span>
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                      Browse Recommends
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="thank-you-section">
              <div className="section-header">
                <h2 className="headline-md" style={{ fontFamily: 'var(--font-editorial)', fontWeight: '400' }}>Thank You Note Tracker</h2>
                <p className="body-sm text-secondary">Keep track of gifts received and notes sent to your generous friends and family.</p>
              </div>
              
              <div className="gift-log-table">
                <div className="log-header">
                  <span>Gift Item</span>
                  <span>From</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {registryItems.filter(i => i.status === 'purchased').length > 0 ? (
                  registryItems.filter(i => i.status === 'purchased').map(item => (
                    <div key={item.id} className="log-row">
                      <div className="gift-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <img src={item.image} alt="" className="mini-thumb" />
                        <span className="title-sm">{item.name}</span>
                      </div>
                      <span className="body-sm" style={{ fontWeight: '500' }}>{item.purchasedBy?.name || item.contributions[0]?.name || 'Anonymous Gifter'}</span>
                      <div>
                        <span className="status-tag" style={{ padding: 'var(--space-1) var(--space-3)', background: 'color-mix(in srgb, var(--color-support-green), transparent 85%)', color: 'var(--color-support-green)', borderRadius: 'var(--radius-pill)', fontSize: 'var(--label-md)', fontWeight: '600' }}>Sent</span>
                      </div>
                      <button className="btn-secondary btn-sm" onClick={() => showHeaderToast(`Thank you card sent for ${item.name}`)}>Mark as Sent</button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 'var(--space-12) var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-md)' }}>
                    No gifts purchased yet. Gifted items will appear here for you to track.
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
      
      {viewMode === 'guest' && (
        <div className="delivery-privacy-footer" style={{ gridColumn: 'span 2' }}>
          <div className="footer-card">
            <h4 className="title-sm">Shipping & Privacy Secured</h4>
            <p className="body-sm text-secondary">
              Gifts will be shipped directly to <strong>{registryProfile.ownerName}</strong> in {registryProfile.address?.city || 'Kampala'}. 
              The full delivery address is encrypted to safeguard parent privacy.
            </p>
          </div>
        </div>
      )}

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
