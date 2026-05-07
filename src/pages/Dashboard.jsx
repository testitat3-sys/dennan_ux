import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import MilestoneTimeline from '../components/dashboard/MilestoneTimeline';
import NextMilestoneCard from '../components/dashboard/NextMilestoneCard';
import PredictiveFeed from '../components/dashboard/PredictiveFeed';
import MilestoneBadges from '../components/dashboard/MilestoneBadges';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';
import { getDashboardData } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, getStageInfo, setShowOnboarding, logout } = useUser();
  const convexUser = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      console.log("[Dashboard.jsx] Initiating sign out...");
      logout();
      await signOut();
    } catch (error) {
      console.error("Failed to sign out from Convex:", error);
    } finally {
      navigate('/');
    }
  };
  const stageInfo = getStageInfo();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const data = await getDashboardData();
      setDashboardData(data);
      setLoading(false);
    };
    loadData();
  }, []);

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
      setShowOnboarding(true);
      navigate('/');
    }
  }, [user, navigate, setShowOnboarding]);

  if (!user || loading || !dashboardData) return null;

  const displayName = convexUser?.name || convexUser?.username || user?.email || 'User';

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-row">
          <div className="dashboard__header-content">
            <span className="dashboard__eyebrow">Your Journey</span>
            <h1 className="dashboard__title">Growing with You</h1>
            <p className="dashboard__subtitle">
              Welcome back, {displayName}.
              {stageInfo ? ` You are currently in the ${stageInfo.display} stage.` : ''}
              {stageInfo ? ` Here is what we’ve curated for you today.` : ''}
            </p>
          </div>
          <button className="dashboard__signout-btn" onClick={handleSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dashboard__signout-icon">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {!stageInfo ? (
        <div className="dashboard__grid" style={{ padding: 'var(--space-xl) 5%', maxWidth: '800px', margin: '0 auto' }}>
          <div className="card glass">
            <h2 style={{ marginBottom: 'var(--space-md)' }}>Your Profile Details</h2>
            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
              <p><strong>Name:</strong> {convexUser?.name || 'N/A'}</p>
              <p><strong>Username:</strong> {convexUser?.username || 'N/A'}</p>
              <p><strong>Email:</strong> {convexUser?.email || user?.email}</p>
              {convexUser?.interests && convexUser.interests.length > 0 && (
                <p><strong>Interests:</strong> {convexUser.interests.join(', ')}</p>
              )}
            </div>
            <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-md)', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '8px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Your personalized journey and milestones will appear here once you add more stage information (like pregnancy due date or child's birthday).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="dashboard__timeline-section">
            <MilestoneTimeline info={stageInfo} milestones={stageInfo.type === 'expecting' ? dashboardData.milestones.expecting : dashboardData.milestones.newborn} />
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
              <NextMilestoneCard stageInfo={stageInfo} nextMilestoneData={stageInfo.type === 'expecting' ? dashboardData.nextMilestone.expecting : dashboardData.nextMilestone.newborn} />
              <MilestoneBadges user={user} stageInfo={stageInfo} badgeData={stageInfo.type === 'expecting' ? dashboardData.badges.expecting : dashboardData.badges.newborn} />
              
              <div className="dashboard__content-card">
                <h3 className="dashboard__card-title">Editorial: {dashboardData.editorial.title}</h3>
                <p className="dashboard__card-text">
                  {dashboardData.editorial.text}
                </p>
                <button className="dashboard__card-btn">{dashboardData.editorial.btnText}</button>
              </div>
            </aside>
          </div>

          <section className="dashboard__checklist">
            <div className="dashboard__checklist-header">
              <h2 className="dashboard__section-title">Stage Checklist</h2>
              <span className="dashboard__checklist-badge">
                {(stageInfo.type === 'expecting' ? dashboardData.checklists.expecting : dashboardData.checklists.newborn).length} items remaining
              </span>
            </div>
            <div className="dashboard__checklist-items">
              {(stageInfo.type === 'expecting' ? dashboardData.checklists.expecting : dashboardData.checklists.newborn).map(item => (
                <div className="checklist-item" key={item.id}>
                  <input type="checkbox" id={item.id} />
                  <label htmlFor={item.id}>{item.label}</label>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

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

