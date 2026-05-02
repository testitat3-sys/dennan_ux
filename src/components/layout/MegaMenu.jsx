import React from 'react';
import { Link } from 'react-router-dom';

const MegaMenu = ({ isOpen, data, categoryType }) => {
  if (!data) return null;
  const { featured, columns } = data;

  return (
    <div className={`mega-menu ${isOpen ? 'is-active' : ''}`}>
      <div className="mega-menu__featured">
        <div className="mega-menu__featured-img">
          <img src={featured.image} alt={featured.alt} />
        </div>
        <h4 className="mega-menu__featured-title">{featured.title}</h4>
        <Link to={featured.link} className="label-sm">{featured.linkText}</Link>
      </div>
      {columns.map((col, idx) => (
        <div key={idx}>
          <span className="mega-menu__col-title">{col.title}</span>
          <ul className="mega-menu__list">
            {col.links.map((link, lIdx) => (
              <li key={lIdx}>
                <Link to={link.href === '#' && ['mother', 'newborn', 'kid'].includes(categoryType) 
                  ? `/category/${categoryType}?q=${encodeURIComponent(link.text)}` 
                  : link.href}>
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default MegaMenu;
