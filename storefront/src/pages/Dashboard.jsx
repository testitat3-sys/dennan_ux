import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import DashboardSidebar from '../components/dashboard/DashboardSidebar';

// Import Existing UI Components
import Button from '../components/ui/Button';
import TierCard from '../components/ui/TierCard';
import StageTile from '../components/ui/StageTile';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import CardGrid from '../components/ui/CardGrid';

import PredictiveFeed from '../components/dashboard/PredictiveFeed';
import QuickViewModal from '../components/products/QuickViewModal';
import Toast from '../components/ui/Toast';

import { getDashboardData } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, getStageInfo, setShowOnboarding, logout } = useUser();
  const convexUser = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const stageInfo = getStageInfo();

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const dash = await getDashboardData();
        setDashboardData(dash);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };



  if (!user || loading || !dashboardData) return null;

  const displayName = convexUser?.name || convexUser?.username || user?.email || 'User';

  const hasName = convexUser?.name || convexUser?.username;
  const collectionTitle = hasName ? `The ${hasName} Collection.` : "Your Collection.";

  // StageTile mock structure matching user stage parameters
  const activeStageTileData = stageInfo ? {
    title: stageInfo.type === 'expecting' ? "Expectant Motherhood" : "Newborn Journey",
    eyebrow: stageInfo.type === 'expecting' ? `Week ${stageInfo.week} of 40` : `${stageInfo.months || 0} Months Old`,
    copy: stageInfo.type === 'expecting' 
      ? "Nurturing postpartum recovery and nursery setups before baby's big day." 
      : "Milestones in movement, sensory exploration, and soft organic essentials.",
    image: stageInfo.type === 'expecting' ? "/assets/stage_expectant.png" : "/assets/stage_newborn.webp",
    type: stageInfo.type === 'expecting' ? "expectant" : "newborn",
    href: stageInfo.type === 'expecting' ? "/collection/curated-picks" : "/collection/essentials"
  } : null;

  const essentialsTier = {
    title: "The Essentials",
    badge: "Daily Staples",
    copy: "Curated everyday staples designed for comfort and quality throughout every journey stage.",
    image: "/assets/newborn_apparel.png",
    href: "/collection/essentials",
    type: "essentials"
  };

  return (
    <div className="dashboard-container">
      {/* 5. Navigation & Utility Side-Panel */}
      <DashboardSidebar />

      {/* Main Content Scroll Canvas */}
      <Page as="main" className="dashboard-main">
        
        {/* 1. The Welcome Canvas (Hero Section) */}
        <Page.Section as="header" className="welcome-canvas">
          <h1 className="welcome-canvas__greeting">
            {collectionTitle}
          </h1>
          
          <Card variant="section" hasBorder={false} style={{ backgroundColor: 'var(--surface-container-low)' }}>
            <Card.Body>
              <CardGrid columns={3} gap="default" className="welcome-canvas__overview">
                <div className="overview-stat">
                  <span className="overview-stat__label">Parent profile</span>
                  <span className="overview-stat__value">{displayName}</span>
                  <span className="overview-stat__desc">{convexUser?.email || user?.email}</span>
                </div>
                
                <div className="overview-stat">
                  <span className="overview-stat__label">Current path</span>
                  <span className="overview-stat__value">
                    {stageInfo ? stageInfo.display : 'Not Onboarded'}
                  </span>
                  <span className="overview-stat__desc">
                    {stageInfo ? `Tailored items based on your child's age.` : 'Personalize your feed by completing onboarding.'}
                  </span>
                </div>

                {convexUser?.interests && convexUser.interests.length > 0 && (
                  <div className="overview-stat">
                    <span className="overview-stat__label">Interests</span>
                    <span className="overview-stat__value">Curated Fit</span>
                    <span className="overview-stat__desc">{convexUser.interests.join(', ')}</span>
                  </div>
                )}
              </CardGrid>
            </Card.Body>
          </Card>
        </Page.Section>

        {!stageInfo ? (
          <Page.Section>
            <Card className="wildcard-discovery-card" variant="feature" hasBorder={false} style={{ background: 'var(--surface-container-low)', textAlign: 'center' }}>
              <Card.Header align="center">
                <h2 className="welcome-canvas__greeting" style={{ fontSize: 'var(--headline-lg)', margin: '0 auto' }}>
                  Start Your Journey
                </h2>
              </Card.Header>
              <Card.Body align="center">
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                  Completing your parenting profile details lets us personalize your dashboard, recommend size-appropriate gear, and track important developmental milestones.
                </p>
              </Card.Body>
              <Card.Actions align="center">
                <Button onClick={() => navigate('/profile')}>Complete Profile Setup</Button>
              </Card.Actions>
            </Card>
          </Page.Section>
        ) : (
          <>
            {/* 2. The Journey Profile (Dynamic Module) */}
            <Page.Section className="journey-profile">
              <CardGrid columns={2} gap="loose">
                <div className="journey-tracker">
                  <h2 className="journey-tracker__title">Timeline of Growth</h2>
                  
                  <div className="progress-bar-container">
                    <div className="progress-bar__labels">
                      <span>{stageInfo.type === 'expecting' ? 'Conception' : 'Birth'}</span>
                      <span>{stageInfo.type === 'expecting' ? 'Week 40' : '2 Years'}</span>
                    </div>
                    <div className="progress-bar__track">
                      <div 
                        className="progress-bar__fill" 
                        style={{ width: `${stageInfo.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="journey-milestones">
                    <div className="milestone-highlight">
                      <span className="milestone-highlight__title">Current Status</span>
                      <span className="milestone-highlight__date">{stageInfo.display}</span>
                    </div>
                    {stageInfo.type === 'expecting' && user.dueDate && (
                      <div className="milestone-highlight">
                        <span className="milestone-highlight__title">Expected Due Date</span>
                        <span className="milestone-highlight__date">
                          {new Date(user.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="journey-profile__cta-group">
                    <Button variant="secondary" onClick={() => navigate('/profile')}>
                      Edit Journey Info
                    </Button>
                  </div>
                </div>

                {/* Dynamic StageTile Component from Design System */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  {activeStageTileData && <StageTile stage={activeStageTileData} />}
                </div>
              </CardGrid>
            </Page.Section>

            {/* Timeline Details, NextMilestoneCard & MilestoneBadges removed for streamlined overview */}

            {/* 3. Curated Recommendations & Discovery (Asymmetric Grid) */}
            <Page.Section className="discovery-section">
              <div className="discovery-header">
                <span className="discovery-header__eyebrow">AI-curated essentials</span>
                <h2 className="discovery-header__title">The Now Feed</h2>
              </div>
              
              <div className="asymmetric-discovery-grid">
                {/* Now / Next Product Feeds displaying ProductCard components */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--title-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontWeight: '400' }}>
                      Specially for your current stage
                    </h3>
                    <PredictiveFeed type="now" stageInfo={stageInfo} onAddToCart={handleAddToCart} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-editorial)', fontSize: 'var(--title-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontWeight: '400' }}>
                      Get a head start on next milestones
                    </h3>
                    <PredictiveFeed type="next" stageInfo={stageInfo} onAddToCart={handleAddToCart} />
                  </div>
                </div>

                <div className="discovery-sidebar-stack">
                  {/* Reuse TierCard with support green lookbook */}
                  <Card variant="default" hasBorder={false} className="essentials-wash-card" style={{ backgroundColor: 'color-mix(in srgb, var(--color-support-green), transparent 90%)' }}>
                    <Card.Header>
                      <span className="essentials-wash-card__badge">Featured Tier</span>
                      <h3 className="essentials-wash-card__title">The Essentials</h3>
                    </Card.Header>
                    <Card.Body>
                      <p className="essentials-wash-card__copy">
                        Daily comfort staples designed with clinical precision and botanical warmth. 
                      </p>
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <TierCard tier={essentialsTier} />
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Discovery Wildcard Card */}
                  <Card className="wildcard-discovery-card" variant="default">
                    <Card.Header>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--label-sm)', color: 'var(--color-brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
                        Beyond the Basics
                      </span>
                      <h3 className="wildcard-discovery-card__title">Nursery Aesthetics</h3>
                    </Card.Header>
                    <Card.Body>
                      <p className="wildcard-discovery-card__text">
                        Editorial: {dashboardData.editorial.title}. {dashboardData.editorial.text}
                      </p>
                    </Card.Body>
                    <Card.Actions>
                      <Button onClick={() => navigate('/collection/luxuries')} style={{ width: '100%' }}>
                        {dashboardData.editorial.btnText}
                      </Button>
                    </Card.Actions>
                  </Card>
                </div>
              </div>
            </Page.Section>

            {/* Stage Checklist Section removed for streamlined overview */}
          </>
        )}
      </Page>

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
