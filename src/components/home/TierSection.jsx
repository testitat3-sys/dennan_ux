import React from 'react';
import TierCard from '../ui/TierCard';

const tiers = [
  {
    type: 'essentials',
    title: 'Essentials',
    badge: 'Core needs',
    copy: 'The non-negotiables for safety, feeding, and sleep.',
    image: '/assets/newborn_apparel.png',
    href: '/category?tier=essentials'
  },
  {
    type: 'musthaves',
    title: 'Must-Haves',
    badge: 'Quality of life',
    copy: 'Quality items that make an enormous difference to your daily life.',
    image: '/assets/feeding_nursing.png',
    href: '/category?tier=must-haves'
  },
  {
    type: 'luxuries',
    title: 'Luxuries',
    badge: 'Premium picks',
    copy: 'Premium picks beautifully made for when only the best will do.',
    image: '/assets/hero.webp',
    href: '/category?tier=luxuries'
  }
];

const TierSection = () => {
  return (
    <section className="section tier-strip" aria-labelledby="tier-heading">
      <div className="section__header">
        <p className="section__eyebrow">How we curate</p>
        <h2 className="section__title" id="tier-heading">Essentials, Must-Haves &amp; Luxuries</h2>
        <p className="section__subtitle">Every product in our catalogue is assigned a tier so you can shop confidently, whatever your budget.</p>
      </div>

      <div className="tier-grid">
        {tiers.map((tier, i) => (
          <TierCard key={i} tier={tier} />
        ))}
      </div>
    </section>
  );
};

export default TierSection;
