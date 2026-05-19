import React from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import './RegistryHeader.css';

const RegistryHeader = ({ profile, onShowToast }) => {
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

  return (
    <Card 
      variant="section" 
      hasBorder={false} 
      hasShadow={false} 
      hasBackground={false} 
      className="registry-header"
    >
      <Card.Header>
        <span className="label-md">Registry</span>
        <h1>Baby Registry</h1>
      </Card.Header>
      <Card.Actions>
        <Button variant="secondary" size="sm" onClick={handleCopyLink}>
          Copy Link
        </Button>
        <Button variant="secondary" size="sm" onClick={handleCopyLink}>
          Share
        </Button>
      </Card.Actions>
    </Card>
  );
};

export default RegistryHeader;
