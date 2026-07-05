import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Gift, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Text from '../components/ui/Text';
import ProductCardSkeleton from '../components/products/ProductCardSkeleton';
import ContributionModal from '../components/registry/ContributionModal';
import PesapalPaymentModal from '../components/checkout/PesapalPaymentModal';
import Toast from '../components/ui/Toast';
import './PublicRegistryPage.css';

const PublicRegistryPage = () => {
  const { registryId } = useParams();

  // Fetch public registry — no auth required
  const registry = useQuery(
    api.registry.getShared,
    registryId ? { registryId } : 'skip'
  );

  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null); // { redirectUrl, paymentId, item, amount }
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Intelligently select the default item to contribute to when using the general contribute CTA
  const defaultContributeItem = useMemo(() => {
    if (!registry?.items?.length) return null;
    const itemsList = registry.items;
    // Find the first unpurchased group gifting item
    const groupGiftingItem = itemsList.find(item => item.isGroupGifting && item.status !== 'purchased');
    if (groupGiftingItem) return groupGiftingItem;
    // Otherwise find the first unpurchased must-have item (if any)
    const mustHaveItem = itemsList.find(item => item.isMustHave && item.status !== 'purchased');
    if (mustHaveItem) return mustHaveItem;
    // Fallback to the first unpurchased item
    const unpurchasedItem = itemsList.find(item => item.status !== 'purchased');
    return unpurchasedItem || itemsList[0];
  }, [registry]);

  // ── Overall funding progress ──────────────────────────────────────────────
  const totalStats = useMemo(() => {
    if (!registry?.items?.length) return { percent: 0, contributed: 0, total: 0 };
    let total = 0;
    let contributed = 0;
    registry.items.forEach((item) => {
      total += item.price;
      if (item.status === 'purchased') {
        contributed += item.price;
      } else if (item.isGroupGifting && item.contributions?.length) {
        contributed += item.contributions.reduce((acc, c) => acc + c.amount, 0);
      }
    });
    return {
      percent: Math.round((contributed / total) * 100) || 0,
      contributed,
      total,
    };
  }, [registry]);

  // ── Open contribution modal ───────────────────────────────────────────────
  const handleContribute = (item) => {
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
      setToastMessage(
        `UGX ${pendingPayment.amount.toLocaleString()} contributed toward "${pendingPayment.item.name}". Thank you!`
      );
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (registry === undefined) {
    return (
      <div className="public-registry-page">
        <div className="public-registry-hero">
          <div style={{
            height: 180,
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-xl)',
            animation: 'pulse 1.5s infinite',
          }} />
        </div>
        <div className="public-skeleton-grid">
          {[1, 2, 3, 4].map((n) => <ProductCardSkeleton key={n} />)}
        </div>
      </div>
    );
  }

  // ── Not found / private ───────────────────────────────────────────────────
  if (!registry) {
    return (
      <div className="public-registry-page">
        <div className="public-registry-error">
          <Text variant="headline-md" color="primary" style={{ fontFamily: 'var(--font-editorial)' }}>
            Registry not available
          </Text>
          <Text variant="body-lg" color="secondary">
            This registry may be private or does not exist. Ask the owner for the correct link.
          </Text>
        </div>
      </div>
    );
  }

  const { profile, items } = registry;
  const displayTitle = profile.eventType
    ? `${profile.eventType} Registry`
    : profile.eventName || 'Registry';

  const displayedItems = showAllItems ? items : items.slice(0, 4);

  const renderPackagingPreview = (item) => {
    const patternType = item.patternType || 'stripe';
    const color = item.colorCode || 'pink';
    const colorHex = {
      pink: '#d35097',
      blue: '#4dbee3',
      green: '#7fa93e',
      gold: '#e1d328',
      anchor: '#111111'
    }[color] || '#d35097';
    
    const patternId = `public-card-pattern-${patternType}-${color}`;
    
    let patternSVG = null;
    switch (patternType) {
      case 'stripe':
        patternSVG = (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="20" height="20" fill="#fdfdfd" />
            <line x1="0" y1="0" x2="0" y2="20" stroke={colorHex} strokeWidth="8" />
            <line x1="0" y1="0" x2="0" y2="20" stroke="#ffffff" strokeWidth="2" />
          </pattern>
        );
        break;
      case 'dots':
        patternSVG = (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fdfdfd" />
            <circle cx="12" cy="12" r="5" fill={colorHex} />
          </pattern>
        );
        break;
      case 'grid':
        patternSVG = (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#fdfdfd" />
            <rect width="20" height="20" fill="none" stroke={colorHex} strokeWidth="3" />
          </pattern>
        );
        break;
      case 'chevron':
        patternSVG = (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fdfdfd" />
            <path d="M0 12 L12 0 L24 12 L12 24 Z" fill="none" stroke={colorHex} strokeWidth="3" />
          </pattern>
        );
        break;
      default:
        patternSVG = (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={colorHex} />
          </pattern>
        );
    }

    return (
      <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>{patternSVG}</defs>
        <rect x="40" y="40" width="120" height="120" rx="12" ry="12" fill={`url(#${patternId})`} stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
        <rect x="93" y="40" width="14" height="120" fill="#ffffff" opacity="0.95" />
        <rect x="99" y="40" width="2" height="120" fill="var(--color-brand-accent, #e1d328)" />
        <rect x="40" y="93" width="120" height="14" fill="#ffffff" opacity="0.95" />
        <rect x="40" y="99" width="120" height="2" fill="var(--color-brand-accent, #e1d328)" />
        <path d="M95 100 L75 135 L85 133 Z" fill="#ffffff" opacity="0.95" />
        <path d="M105 100 L125 135 L115 133 Z" fill="#ffffff" opacity="0.95" />
        <path d="M100 100 C70 70 50 110 100 100" fill="#ffffff" opacity="0.95" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        <path d="M100 100 C130 70 150 110 100 100" fill="#ffffff" opacity="0.95" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        <circle cx="100" cy="100" r="7" fill="#ffffff" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        <circle cx="100" cy="100" r="3" fill="var(--color-brand-accent, #e1d328)" />
      </svg>
    );
  };

  return (
    <div className="public-registry-page">

      {/* Hero Card */}
      <div className="public-registry-hero">
        <Card hasBorder={false} hasShadow={true}>
          <Card.Header>
            <span className="public-registry-owner-label">
              {profile.ownerName}'s Registry
            </span>
            <h1 className="public-registry-title">{displayTitle}</h1>
            {profile.message && (
              <p className="public-registry-message">{profile.message}</p>
            )}
          </Card.Header>

          {items.length > 0 && (
            <Card.Body>
              <div className="public-registry-progress">
                <div className="public-progress-header">
                  <span className="public-progress-label">Funding Progress</span>
                  <span className="public-progress-percent">{totalStats.percent}%</span>
                </div>
                <div className="public-progress-track">
                  <div
                    className="public-progress-fill"
                    style={{ width: `${Math.min(totalStats.percent, 100)}%` }}
                  />
                </div>
                <div className="public-progress-amounts">
                  UGX {totalStats.contributed.toLocaleString()} raised of UGX {totalStats.total.toLocaleString()}
                </div>
              </div>
            </Card.Body>
          )}
        </Card>
      </div>

      {/* Items Section */}
      {items.length > 0 ? (
        <>
          {/* General Contribute CTA Button */}
          <div className="public-registry-general-contribute" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-10)' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => defaultContributeItem && handleContribute(defaultContributeItem)}
              disabled={!defaultContributeItem}
              style={{
                maxWidth: '400px',
                width: '100%',
                height: '52px',
                fontSize: '1rem',
                fontWeight: '600',
                boxShadow: 'var(--shadow-secondary)'
              }}
              icon={<Gift size={18} />}
              iconPosition="left"
            >
              Contribute to Registry
            </Button>
          </div>

          <div className="public-registry-section-header">
            <Text
              variant="headline-md"
              color="primary"
              className="public-registry-section-title"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              Gift Items
            </Text>
            <Text variant="body-md" color="secondary" className="public-registry-section-sub">
              Click any item below to view details and contribute directly toward it.
            </Text>
          </div>

          <div className="public-items-grid">
            {displayedItems.map((item) => {
              const contributed = (item.contributions || []).reduce(
                (acc, c) => acc + c.amount, 0
              );
              const itemPercent = Math.min(
                Math.round((contributed / item.price) * 100) || 0, 100
              );
              const isPurchased = item.status === 'purchased';
              const isVirtualPackaging = item.productId === 'virtual-packaging';

              return (
                <Card
                  key={item.id}
                  isHoverable={!isPurchased}
                  className={`public-item-card ${!isPurchased ? 'clickable-card' : ''}`}
                  removePadding
                  onClick={() => !isPurchased && handleContribute(item)}
                  style={{ cursor: !isPurchased ? 'pointer' : 'default' }}
                >
                  {/* Product Image / Packaging Preview */}
                  <div className="public-item-image-wrap" style={{ background: isVirtualPackaging ? '#fafafa' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', width: '100%', overflow: 'hidden' }}>
                    {isVirtualPackaging ? (
                      renderPackagingPreview(item)
                    ) : (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="public-item-image"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div className="public-item-body" style={{ paddingBottom: 'var(--space-4)' }}>
                    <span className="public-item-name">{item.name}</span>
                    <span className="public-item-price">
                      UGX {item.price.toLocaleString()}
                    </span>

                    {isPurchased ? (
                      <span className="public-item-gifted-badge">
                        <CheckCircle size={13} />
                        Fully gifted
                      </span>
                    ) : item.isGroupGifting && contributed > 0 ? (
                      <div className="public-item-mini-progress">
                        <div className="public-item-mini-track">
                          <div
                            className="public-item-mini-fill"
                            style={{ width: `${itemPercent}%` }}
                          />
                        </div>
                        <span className="public-item-mini-label">
                          UGX {contributed.toLocaleString()} of {item.price.toLocaleString()} raised
                        </span>
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>

          {items.length > 4 && !showAllItems && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-8)' }}>
              <Button
                variant="link"
                onClick={() => setShowAllItems(true)}
                style={{ fontSize: '1rem', fontWeight: '600' }}
              >
                Show More (+{items.length - 4} items remaining)
              </Button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-20) 0' }}>
          <Text variant="body-lg" color="tertiary">
            No items have been added to this registry yet.
          </Text>
        </div>
      )}

      {/* Contribution Modal */}
      <ContributionModal
        item={selectedItem}
        registryId={profile.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPaymentInitiated={handlePaymentInitiated}
      />

      {/* Pesapal Payment Modal */}
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

      {/* Toast */}
      <Toast
        isOpen={showToast}
        message={toastMessage}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default PublicRegistryPage;
