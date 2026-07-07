import React from 'react';
import { Link } from 'react-router-dom';
import { REAL_BRANDS } from '../../constants/brandsData';
import './BrandsBanner.css';

const BrandsBanner = () => {
  return (
    <section className="brands-banner" aria-labelledby="brands-banner-heading">
      <div className="section__header">
        <h2 className="section__title" id="brands-banner-heading">Most Loved Brands</h2>
      </div>
      
      <div className="brands-banner__track-wrap">
        <div className="brands-banner__track">
          {REAL_BRANDS.map((brand, i) => (
            <Link key={i} to={`/brand/${brand.id}`} className="brand-item">
              <div className="brand-item__logo">
                {brand.logo ? (
                  <img src={brand.logo} alt={`${brand.name} Logo`} />
                ) : (
                  <div className="brand-item__monogram">{brand.name.charAt(0)}</div>
                )}
                {brand.maxDiscount > 0 && (
                  <span className="brand-item__discount">-{brand.maxDiscount}%</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsBanner;


