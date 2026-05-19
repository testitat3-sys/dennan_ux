import React from 'react';
import Button from '../ui/Button';
import Text from '../ui/Text';
import { Card } from '../ui/Card';
import './BrandHeader.css';

const BrandHeader = ({ brand }) => {
  return (
    <Card
      hasBorder={false}
      hasShadow={false}
      hasBackground={false}
      hasRadius={false}
      className="brand-header"
    >
      {/* Banner Canvas */}
      <div className="brand-header__banner">
        <img
          src={brand.banner}
          alt={`${brand.name} lifestyle`}
          className="brand-header__banner-img"
        />
        <div className="brand-header__banner-overlay" />

        {/* Actions — floating top-right inside banner */}
        <div className="brand-header__actions">
          <Button variant="white" size="sm">
            Follow Brand
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            iconPosition="left"
          >
            Ask AI Specialist
          </Button>
        </div>

        {/* Identity row — anchored to bottom of banner */}
        <div className="brand-header__content">
          <div className="brand-header__identity">

            {/* Logo */}
            <div className="brand-header__logo-container">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="brand-header__logo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentNode.querySelector('.brand-header__logo-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="brand-header__logo-placeholder"
                style={{ display: brand.logo ? 'none' : 'flex' }}
              >
                <Text variant="headline-md" as="span">
                  {brand.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </div>
            </div>

            {/* Info */}
            <div className="brand-header__info">
              <Text variant="display-sm" as="h1" className="brand-header__title">
                {brand.name}
              </Text>
              <Text variant="body-lg" className="brand-header__mission">
                {brand.mission}
              </Text>
              <div className="brand-header__badges">
                {brand.certifications.map((cert, i) => (
                  <div key={i} className="brand-header__badge">
                    <span className="brand-header__badge-icon">{cert.icon}</span>
                    <Text variant="label-md" as="span" className="brand-header__badge-name">
                      {cert.name}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile-only: identity rendered below the banner in normal flow */}
      <div className="brand-header__mobile-content">
        <div className="brand-header__info">
          <Text variant="headline-lg" as="h1" className="brand-header__title">
            {brand.name}
          </Text>
          <Text variant="body-sm" className="brand-header__mission">
            {brand.mission}
          </Text>
          <div className="brand-header__badges">
            {brand.certifications.map((cert, i) => (
              <div key={i} className="brand-header__badge">
                <span className="brand-header__badge-icon">{cert.icon}</span>
                <Text variant="label-sm" as="span" className="brand-header__badge-name">
                  {cert.name}
                </Text>
              </div>
            ))}
          </div>
        </div>
        <div className="brand-header__mobile-actions">
          <Button variant="primary" fullWidth>
            Follow Brand
          </Button>
          <Button
            variant="outline"
            fullWidth
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            iconPosition="left"
          >
            Ask AI Specialist
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default BrandHeader;
