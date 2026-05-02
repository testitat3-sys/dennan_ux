import React from 'react';
import './RegistryHeader.css';

const RegistryHeader = ({ profile, viewMode, setViewMode }) => {
  const calculateDaysLeft = (date) => {
    const diff = new Date(date) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = calculateDaysLeft(profile.eventDate);

  return (
    <header className="registry-header">
      <div className="header-top">
        <div className="profile-info">
          <span className="label-sm">Registry</span>
          <h1>{profile.ownerName}'s Baby Registry</h1>
          <p className="body-md text-secondary">{profile.message}</p>
        </div>

        <div className="countdown-container">
          <div className="countdown-card">
            <span className="countdown-number">{daysLeft}</span>
            <span className="label-sm">Days</span>
          </div>
          <div className="event-info">
            <p className="title-md">{profile.eventName}</p>
            <p className="label-sm text-tertiary">{new Date(profile.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <div className="share-controls">
          <button className="btn-secondary btn-sm">
            <span>Copy Link</span>
          </button>
          <button className="btn-secondary btn-sm">
            <span>Share</span>
          </button>
        </div>

        <div className="view-switcher">
          <button 
            className={`switch-btn ${viewMode === 'parent' ? 'active' : ''}`}
            onClick={() => setViewMode('parent')}
          >
            Manage
          </button>
          <button 
            className={`switch-btn ${viewMode === 'guest' ? 'active' : ''}`}
            onClick={() => setViewMode('guest')}
          >
            Guest View
          </button>
        </div>
      </div>
    </header>
  );
};

export default RegistryHeader;
