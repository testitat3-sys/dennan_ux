import React, { useState, useMemo } from 'react';
import { registryProfile, registryItems as initialItems } from '../data/registryData';
import RegistryHeader from '../components/registry/RegistryHeader';
import RegistryCategoryGroup from '../components/registry/RegistryCategoryGroup';
import GroupGiftingModal from '../components/registry/GroupGiftingModal';
import './RegistryPage.css';

const RegistryPage = () => {
  const [viewMode, setViewMode] = useState('guest'); // Default to guest for demo
  const [items, setItems] = useState(initialItems);
  const [priceFilter, setPriceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('registry'); // registry, thank-you
  const [privacy, setPrivacy] = useState(registryProfile.privacy);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sorting: Must-Haves first
  const sortedItems = useMemo(() => {
    let filtered = [...items];
    
    // Apply price filter
    if (priceFilter === 'under25') filtered = filtered.filter(i => i.price < 25);
    else if (priceFilter === '25to100') filtered = filtered.filter(i => i.price >= 25 && i.price <= 100);
    else if (priceFilter === 'over100') filtered = filtered.filter(i => i.price > 100);

    return filtered.sort((a, b) => {
      if (a.isMustHave && !b.isMustHave) return -1;
      if (!a.isMustHave && b.isMustHave) return 1;
      return 0;
    });
  }, [items, priceFilter]);

  const categories = useMemo(() => {
    const cats = [...new Set(sortedItems.map(item => item.category))];
    return cats;
  }, [sortedItems]);

  const handleToggleMustHave = (itemId) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, isMustHave: !item.isMustHave } : item
    ));
  };

  const handleBuy = (itemId) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, status: 'purchased', purchasedQuantity: item.requestedQuantity } : item
    ));
    alert('Item added to cart! (Demo)');
  };

  const handleContributeClick = (itemId) => {
    const item = items.find(i => i.id === itemId);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmContribution = (itemId, contribution) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newContributions = [...item.contributions, { ...contribution, date: new Date().toISOString() }];
        const total = newContributions.reduce((acc, c) => acc + c.amount, 0);
        return { 
          ...item, 
          contributions: newContributions,
          status: total >= item.price ? 'purchased' : 'available'
        };
      }
      return item;
    }));
  };

  return (
    <div className="registry-page container">
      <RegistryHeader 
        profile={registryProfile} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
      />

      <main className="registry-content">
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
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
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
                <span className="label-md uppercase tracking-wider">Curate by Price</span>
                <div className="price-chips">
                  {['all', 'under25', '25to100', 'over100'].map(f => (
                    <button 
                      key={f}
                      className={`chip ${priceFilter === f ? 'active' : ''}`}
                      onClick={() => setPriceFilter(f)}
                    >
                      {f === 'all' ? 'All' : f === 'under25' ? '< £25' : f === '25to100' ? '£25 – £100' : '> £100'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="registry-stats desktop-only">
                <span className="label-md">Total Items: {items.length}</span>
                <span className="label-md">Purchased: {items.filter(i => i.status === 'purchased').length}</span>
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
                />
              ))
            ) : (
              <div className="empty-state">
                <div className="starter-kit">
                  <span className="label-md text-brand">Getting Started</span>
                  <h3 className="headline-md">Your Registry is Empty</h3>
                  <p className="body-sm text-secondary">
                    Start your journey with our curated <strong>Starter Kit</strong> checklist.
                  </p>
                  <div className="starter-suggestions">
                    <div className="suggestion-card">
                      <img src="/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif" alt="" />
                      <span className="label-md">Feeding</span>
                    </div>
                    <div className="suggestion-card">
                      <img src="/new_assets/SnüzPod 4 Bedside Crib - White.jfif" alt="" />
                      <span className="label-md">Nursery</span>
                    </div>
                    <div className="suggestion-card">
                      <img src="/new_assets/Organic Cotton Starter Set.jfif" alt="" />
                      <span className="label-md">Apparel</span>
                    </div>
                  </div>
                  <button className="btn-primary">Browse Essentials</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="thank-you-section">
            <div className="section-header">
              <h2 className="headline-md">Thank You Note Tracker</h2>
              <p className="body-sm text-secondary">Keep track of gifts received and notes sent.</p>
            </div>
            
            <div className="gift-log-table">
              <div className="log-header">
                <span>Gift Item</span>
                <span>From</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {items.filter(i => i.status === 'purchased').map(item => (
                <div key={item.id} className="log-row">
                  <div className="gift-info">
                    <img src={item.image} alt="" className="mini-thumb" />
                    <span className="title-sm">{item.name}</span>
                  </div>
                  <span className="body-sm">{item.purchasedBy?.name || item.contributions[0]?.name || 'Anonymous'}</span>
                  <div>
                    <span className="status-tag">Sent</span>
                  </div>
                  <button className="btn-secondary btn-sm">Mark as Sent</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <GroupGiftingModal 
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmContribution}
      />
      
      {viewMode === 'guest' && (
        <div className="delivery-privacy-footer">
          <div className="footer-card">
            <h4 className="title-sm">Shipping & Privacy</h4>
            <p className="body-sm text-secondary">
              Gifts will be shipped directly to <strong>{registryProfile.ownerName}</strong> in {registryProfile.address.city}. 
              The full address is concealed to protect user privacy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistryPage;

