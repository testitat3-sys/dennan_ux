import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import MilestoneTimeline from '../components/dashboard/MilestoneTimeline';
import NextMilestoneCard from '../components/dashboard/NextMilestoneCard';
import PredictiveFeed from '../components/dashboard/PredictiveFeed';
import MilestoneBadges from '../components/dashboard/MilestoneBadges';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
import './Dashboard.css';

const Dashboard = () => {
  const { user, getStageInfo } = useUser();
  const navigate = useNavigate();
  const stageInfo = getStageInfo();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || !stageInfo) return null;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-content">
          <span className="dashboard__eyebrow">Your Journey</span>
          <h1 className="dashboard__title">Growing with You</h1>
          <p className="dashboard__subtitle">
            Welcome back. You are currently in the <strong>{stageInfo.display}</strong> stage. 
            Here is what we’ve curated for you today.
          </p>
        </div>
      </header>

      <section className="dashboard__timeline-section">
        <MilestoneTimeline info={stageInfo} />
      </section>

      <div className="dashboard__grid">
        <div className="dashboard__main">
          <section className="dashboard__section">
            <h2 className="dashboard__section-title">The Now Feed</h2>
            <p className="dashboard__section-desc">Products specifically for your current week.</p>
            <PredictiveFeed type="now" stageInfo={stageInfo} onAddToCart={handleAddToCart} />
          </section>

          <section className="dashboard__section">
            <h2 className="dashboard__section-title">Next Up Sneak Peek</h2>
            <p className="dashboard__section-desc">Get a head start on what’s coming next.</p>
            <PredictiveFeed type="next" stageInfo={stageInfo} onAddToCart={handleAddToCart} />
          </section>
        </div>

        <aside className="dashboard__sidebar">
          <NextMilestoneCard stageInfo={stageInfo} />
          <MilestoneBadges user={user} stageInfo={stageInfo} />
          
          <div className="dashboard__content-card">
            <h3 className="dashboard__card-title">Editorial: Sleep & Recovery</h3>
            <p className="dashboard__card-text">
              Handling the 4-month sleep regression doesn't have to be a solo journey.
            </p>
            <button className="dashboard__card-btn">Read 2-min Guide</button>
          </div>
        </aside>
      </div>

      <section className="dashboard__checklist">
        <div className="dashboard__checklist-header">
          <h2 className="dashboard__section-title">Stage Checklist</h2>
          <span className="dashboard__checklist-badge">3 items remaining</span>
        </div>
        <div className="dashboard__checklist-items">
          <div className="checklist-item">
            <input type="checkbox" id="item1" />
            <label htmlFor="item1">Pack the hospital bag essentials</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="item2" />
            <label htmlFor="item2">Install the car seat (ISOFIX check)</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="item3" />
            <label htmlFor="item3">Finalize the nursery lighting</label>
          </div>
        </div>
      </section>

      {selectedProduct && (
        <QuickViewModal 
          product={selectedProduct} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleModalSuccess}
        />
      )}

      <Toast 
        isOpen={showToast} 
        message={toastMessage} 
        onClose={() => setShowToast(false)} 
      />
    </div>
  );
};

export default Dashboard;

