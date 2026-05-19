import React from 'react';
import Button from './Button';

const CuratedFailState = ({ 
  title = "Exhibit Temporarily Unavailable", 
  message = "We are currently unable to load these items from our catalog. This is likely a temporary connection blip. Please try reloading the page.", 
  actionLabel = "Refresh Catalog", 
  onAction,
  eyebrow = "Connection Note"
}) => {
  return (
    <div className="curated-fail-state" role="alert">
      {eyebrow && <span className="curated-fail-state__eyebrow">{eyebrow}</span>}
      <h2 className="curated-fail-state__title">{title}</h2>
      <p className="curated-fail-state__message">{message}</p>
      {onAction && (
        <Button 
          variant="primary"
          onClick={onAction} 
          className="curated-fail-state__action"
          aria-label={actionLabel}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default CuratedFailState;
