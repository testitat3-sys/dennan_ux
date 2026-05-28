import React from 'react';
import './JourneySection.css';
import StageTile from '../ui/StageTile';
import Text from '../ui/Text';

const JourneySection = ({ stages }) => {
  if (!stages) return null;

  return (
    <section className="section journey-section" aria-labelledby="journey-heading">
      <div className="section__header">
        <Text role="label-sm" as="p" color="brand-primary" className="section__eyebrow">
          Personalised for you
        </Text>
        <Text role="headline-lg" as="h2" id="journey-heading">
          Shop by journey stage
        </Text>
        <Text role="body-sm" as="p" color="secondary" className="section__subtitle">
          Find everything curated to exactly where you are right now.
        </Text>
      </div>

      <div className="journey-grid">
        {stages.map((stage, i) => (
          <StageTile key={i} stage={stage} />
        ))}
      </div>
    </section>
  );
};

export default JourneySection;
