import React from 'react';

const DefaultProductImage = ({ className = '', style = {} }) => {
  return (
    <div 
      className={`default-product-image ${className}`} 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block', // changed from flex to block to allow svg to fill
        backgroundColor: 'var(--surface-container-low, #faf9f8)', 
        ...style 
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 400 400" 
        preserveAspectRatio="xMidYMid slice" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-primary, #d35097)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-brand-secondary, #832c7a)" stopOpacity="0.05" />
          </linearGradient>
          <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="var(--color-brand-primary, #d35097)" fillOpacity="0.1" />
          </pattern>
        </defs>
        
        {/* Base Gradient Background */}
        <rect width="100%" height="100%" fill="url(#bg-gradient)" />
        
        {/* Pattern Overlay */}
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
        
        {/* Abstract blobs / shapes in corners */}
        <circle cx="0" cy="0" r="150" fill="var(--color-brand-accent, #e1d328)" fillOpacity="0.1" />
        <circle cx="400" cy="400" r="200" fill="var(--color-brand-primary, #d35097)" fillOpacity="0.1" />
        
        {/* Center Icon Group - Using translate to center the tote bag icon */}
        <g transform="translate(150, 150)">
          {/* Soft background circle behind icon */}
          <circle cx="50" cy="50" r="60" fill="#ffffff" fillOpacity="0.7" />
          <circle cx="50" cy="50" r="45" fill="var(--surface-container-low, #faf9f8)" />
          
          {/* Tote bag body */}
          <rect x="25" y="35" width="50" height="45" rx="8" fill="#ffffff" stroke="var(--color-brand-primary, #d35097)" strokeWidth="4" />
          
          {/* Handle */}
          <path d="M35 35V25C35 10 65 10 65 25V35" stroke="var(--color-brand-secondary, #832c7a)" strokeWidth="4" strokeLinecap="round" fill="none" />
          
          {/* Decorative star */}
          <path d="M50 60L47 53L40 50L47 47L50 40L53 47L60 50L53 53L50 60Z" fill="var(--color-brand-accent, #e1d328)" />
        </g>
      </svg>
    </div>
  );
};

export default DefaultProductImage;
