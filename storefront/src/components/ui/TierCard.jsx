import React from 'react';
import { Link } from 'react-router-dom';

const TierCard = ({ tier }) => {
  const { title, badge, copy, image, href, type } = tier;
  
  // Normalize legacy URLs (e.g., /tier/essentials) to match active PLP routes (/collection/essentials)
  const targetHref = href?.startsWith('/tier/')
    ? href.replace('/tier/', '/collection/').replace('musthaves', 'must-haves')
    : href;
  
  return (
    <article className={`tier-card tier-card--${type}`}>
      <div className="tier-card__image">
        <img src={image} alt={`${title} - ${badge}`} />
      </div>
      <div className="tier-card__content">
        <span className="tier-card__badge">{badge}</span>
        <h3 className="tier-card__title">{title}</h3>
        <p className="tier-card__copy">{copy}</p>
        <Link to={targetHref || '#'} className="tier-card__cta">
          Shop {title}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </article>
  );
};

export default TierCard;

