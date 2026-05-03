import React from 'react';
import './BrandHeader.css';

const BrandHeader = ({ brand }) => {
  return (
    <header className="brand-header">
      <div className="brand-header__banner">
        <img src={brand.banner} alt={`${brand.name} lifestyle`} className="brand-header__banner-img" />
        <div className="brand-header__banner-overlay"></div>
      </div>
      
      <div className="brand-header__content">
        <div className="brand-header__identity">
          <div className="brand-header__logo-container">
            <div className="brand-header__logo-placeholder">
              {/* Using text as logo placeholder if no img */}
              {brand.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          
          <div className="brand-header__info">
            <h1 className="brand-header__title">{brand.name}</h1>
            <p className="brand-header__mission">{brand.mission}</p>
            
            <div className="brand-header__badges">
              {brand.certifications.map((cert, i) => (
                <div key={i} className="brand-header__badge">
                  <span className="brand-header__badge-icon">{cert.icon}</span>
                  <span className="brand-header__badge-name">{cert.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="brand-header__actions">
          <button className="brand-header__btn brand-header__btn--primary">
            Follow Brand
          </button>
          <button className="brand-header__btn brand-header__btn--secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Ask AI Specialist
          </button>
        </div>
      </div>
    </header>
  );
};

export default BrandHeader;

