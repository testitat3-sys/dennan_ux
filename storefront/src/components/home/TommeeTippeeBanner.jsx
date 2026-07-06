import React from 'react';
import { Link } from 'react-router-dom';
import './TommeeTippeeBanner.css';

const TommeeTippeeBanner = () => {
  return (
    <section className="tommee-banner" aria-label="Tommee Tippee Brand Promotion">
      <Link
        to="/brand/tommee-tippee"
        className="tommee-banner__link"
        aria-label="Shop Tommee Tippee products"
      >
        <img
          src="/new_assets/tommee tippee banner.webp"
          alt="Tommee Tippee Brand Banner - Shop the collection"
          className="tommee-banner__img"
          loading="lazy"
          decoding="async"
        />
        <span className="tommee-banner__overlay" aria-hidden="true" />
      </Link>
    </section>
  );
};

export default TommeeTippeeBanner;
