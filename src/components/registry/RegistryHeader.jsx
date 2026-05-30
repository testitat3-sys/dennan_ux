import React from 'react';
import { Copy } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Text from '../ui/Text';
import './RegistryHeader.css';

const RegistryHeader = ({ profile, onShowToast, onAddFromCart, totalRegistryStats, registryItems }) => {
  const handleCopyLink = () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/registry/${profile.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        onShowToast && onShowToast('Registry link copied to clipboard!');
      })
      .catch(() => {
        onShowToast && onShowToast('Failed to copy link.');
      });
  };

  const hasItems = registryItems && registryItems.length > 0;

  return (
    <Card 
      variant="section" 
      hasBorder={false} 
      hasShadow={false} 
      hasBackground={false} 
      removePaddingHorizontal={true}
      className="registry-header"
    >
      <div className="registry-header__main">
        <Card.Header>
          <span className="label-md registry-header__eyebrow">Registry</span>
          <h1>{profile?.eventType ? `${profile.eventType} Registry` : 'Baby Registry'}</h1>
        </Card.Header>
        <Card.Actions>
          {onAddFromCart && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={onAddFromCart}
            >
              Add items from cart
            </Button>
          )}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleCopyLink}
            icon={<Copy size={14} />}
            iconPosition="left"
          >
            Copy Link
          </Button>
        </Card.Actions>
      </div>

      {totalRegistryStats && hasItems && (
        <div className="registry-header__progress">
          <div className="funding-progress-card">
            <div className="funding-progress-card__header">
              <Text role="title-sm" as="h4" color="primary" className="funding-progress-card__title" style={{ fontFamily: 'var(--font-sans)', fontWeight: '700' }}>
                Funding Progress
              </Text>
              <span className="funding-progress-card__percent">
                {totalRegistryStats.percent}%
              </span>
            </div>
            <div className="funding-progress-card__track">
              <div 
                className="funding-progress-card__fill" 
                style={{ width: `${Math.min(totalRegistryStats.percent, 100)}%` }} 
              />
            </div>
            <div className="funding-progress-card__value-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="funding-progress-card__value">
                UGX {totalRegistryStats.contributed.toLocaleString()} raised of UGX {totalRegistryStats.total.toLocaleString()}
              </span>
              <span style={{ fontSize: 'var(--label-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                UGX {(totalRegistryStats.total - totalRegistryStats.contributed).toLocaleString()} left
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RegistryHeader;
