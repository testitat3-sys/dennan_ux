import React from 'react';

const StageTile = ({ stage }) => {
  const { title, eyebrow, copy, subtext, image, heroImage, href, type } = stage;
  const displayImage = image || heroImage || '';
  const displayCopy = copy || subtext || '';
  
  return (
    <a href={href} className={`stage-tile stage-tile--${type}`} aria-label={`Shop ${title}`}>
      <img src={displayImage} alt={title} className="stage-bg" />
      <div className="stage-tile__bg" aria-hidden="true"></div>
      <div className="stage-tile__shape" aria-hidden="true"></div>
      <div className="stage-tile__content">
        <p className="stage-tile__eyebrow">{eyebrow}</p>
        <h3 className="stage-tile__title" dangerouslySetInnerHTML={{ __html: title }}></h3>
        <p className="stage-tile__copy">{displayCopy}</p>
        <span className="stage-tile__arrow">
          Explore
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </a>
  );
};

export default StageTile;

