import React from 'react';
import { Link } from 'react-router-dom';
import './GiftingBanner.css';

const GiftingBanner = ({ href = '/registry' }) => {
  return (
    <section className="gifting-banner" aria-label="Group gifting promotion">
      <Link
        to={href}
        className="gifting-banner__link"
        aria-label="Start a group gift — Circle of Love group gifting"
      >
        <picture>
          <source media="(max-width: 768px)" srcSet="/assets/Group%20gifting%20mobile.webp" />
          <img
            src="/assets/Group%20Gifting%20In%20Uganda.webp"
            alt="Circle of Love — Group gifting. Create a gift with friends or family and contribute in small amounts."
            className="gifting-banner__img"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <span className="gifting-banner__overlay" aria-hidden="true" />
      </Link>
    </section>
  );
};

export default GiftingBanner;
