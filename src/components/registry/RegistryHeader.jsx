import React from 'react';
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
    <header className="registry-header">
      <div className="header-top">
        <div className="profile-info">
          <span className="label-md">Registry</span>
          <h1>Baby Registry</h1>
        </div>
        <div className="share-controls">
          <button className="btn-secondary btn-sm" onClick={handleCopyLink}>
            <span>Copy Link</span>
          </button>
          <button className="btn-secondary btn-sm" onClick={handleCopyLink}>
            <span>Share</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default RegistryHeader;
