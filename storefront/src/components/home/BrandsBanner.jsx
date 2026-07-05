import React from 'react';
import { Link } from 'react-router-dom';
import './BrandsBanner.css';

const BrandsBanner = ({ brands }) => {
  if (!brands) return null;

  return (
    <section className="brands-banner" aria-labelledby="brands-banner-heading">
      <div className="section__header">
        <h2 className="section__title" id="brands-banner-heading">Most Loved Brands</h2>
      </div>
      
      <div className="brands-banner__track-wrap">
        <div className="brands-banner__track">
          {brands.map((brand, i) => (
            <Link key={i} to={`/brand/${brand.id}`} className="brand-item">
              <div className="brand-item__logo">
                <img src={brand.logo} alt={`${brand.name} Logo`} />
                <span className="brand-item__discount">{brand.discount}</span>
              </div>
              <h3 className="brand-item__name">{brand.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsBanner;

