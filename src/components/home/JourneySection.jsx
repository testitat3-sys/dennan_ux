import React from 'react';
import './JourneySection.css';
import StageTile from '../ui/StageTile';

const JourneySection = ({ stages }) => {
  if (!stages) return null;

  return (
    <section className="section" aria-labelledby="journey-heading">
      <div className="section__header">
        <p className="section__eyebrow">Personalised for you</p>
        <h2 className="section__title" id="journey-heading">Shop by journey stage</h2>
        <p className="section__subtitle">Find everything curated to exactly where you are right now.</p>
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

