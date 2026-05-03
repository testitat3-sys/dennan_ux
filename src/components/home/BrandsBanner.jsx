import React from 'react';
import { Link } from 'react-router-dom';
import './BrandsBanner.css';

const brands = [
  { name: 'Tommee Tippee', id: 'tommee-tippee', logo: '/assets/tommee_tippee_logo_1777398496709.png', discount: 'Up to 25% off' },
  { name: 'Nuby', id: 'nuby', logo: '/assets/nuby_logo_1777398511621.png', discount: 'Up to 30% off' },
  { name: 'Philips Avent', id: 'philips-avent', logo: '/assets/philips_avent_logo_1777398524587.png', discount: 'Up to 20% off' },
  { name: 'Skip Hop', id: 'skip-hop', logo: '/assets/skip_hop_logo_1777398591541.png', discount: 'Up to 15% off' },
  { name: 'Snuz', id: 'snuz', logo: '/assets/snuz_logo_1777398603135.png', discount: 'Up to 10% off' },
  { name: 'Beaba', id: 'beaba', logo: '/assets/beaba_logo_1777398614779.png', discount: 'Up to 25% off' }
];

const BrandsBanner = () => {
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

