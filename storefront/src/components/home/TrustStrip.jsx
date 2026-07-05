import React from 'react';
import './TrustStrip.css';

const TrustStrip = ({ items }) => {
  if (!items) return null;

  const getIcon = (icon) => {
    switch (icon) {
      case 'clock':
        return <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>;
      case 'tiktok':
        return <path d="M12.525.023l-.35-.023c-.24 0-.44.2-.44.44v17.31c0 1.25-1.01 2.26-2.26 2.26s-2.26-1.01-2.26-2.26 1.01-2.26 2.26-2.26c.21 0 .42.03.61.08v-2.31c-.2-.04-.4-.06-.61-.06-2.52 0-4.57 2.05-4.57 4.57s2.05 4.57 4.57 4.57 4.57-2.05 4.57-4.57V7.29c1.47 1.05 3.26 1.67 5.19 1.67v-2.26c-1.61 0-3.05-.72-4.04-1.85-.35-.4-.65-.85-.88-1.34-.34-.73-.55-1.55-.55-2.42V.463c0-.24-.2-.44-.44-.44z"/>;
      case 'instagram':
        return <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>;
      case 'users':
        return <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>;
      default:
        return null;
    }
  };

  return (
    <div className="trust-strip" aria-label="Our community and heritage">
      {items.map((item, i) => (
        <div key={i} className="trust-item">
          <div className={`trust-item__icon trust-item__icon--${item.type}`} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={item.type === 'secondary' ? 'currentColor' : 'none'} stroke={item.type === 'secondary' ? 'none' : 'currentColor'} strokeWidth="1.8">
              {getIcon(item.icon)}
            </svg>
          </div>
          <span className="trust-item__title">{item.title}</span>
          <span className="trust-item__sub">{item.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default TrustStrip;

