import React from 'react';
import './TierSection.css';
import TierCard from '../ui/TierCard';

const TierSection = ({ tiers }) => {
  if (!tiers) return null;

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

