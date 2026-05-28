import React from 'react';
import './TierSection.css';
import TierCard from '../ui/TierCard';
import Text from '../ui/Text';

const TierSection = ({ tiers }) => {
  if (!tiers) return null;

  return (
    <section className="section tier-strip" aria-labelledby="tier-heading">
      <div className="section__header">
        <Text role="label-sm" as="p" color="brand-primary" className="section__eyebrow">
          How we curate
        </Text>
        <Text role="headline-lg" as="h2" id="tier-heading">
          Essentials, Must-Haves &amp; Luxuries
        </Text>
        <Text role="body-sm" as="p" color="secondary" className="section__subtitle">
          Every product in our catalogue is assigned a tier so you can shop confidently, whatever your budget.
        </Text>
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
