import React from 'react';
import StageTile from '../ui/StageTile';

const stages = [
  {
    type: 'expectant',
    title: 'Expectant<br>&amp; New Mom',
    eyebrow: 'Stage 1',
    copy: 'Hospital bag, postpartum recovery, feeding prep, and everything you need before baby arrives.',
    image: '/assets/stage_expectant.png',
    href: '/journey/expectant'
  },
  {
    type: 'newborn',
    title: 'Newborn<br>0–6 months',
    eyebrow: 'Stage 2',
    copy: 'Safe sleep, feeding essentials, skin care, and gentle gear for the tiniest stage of all.',
    image: '/assets/stage_newborn.webp',
    href: '/journey/newborn'
  },
  {
    type: 'toddler',
    title: 'Baby<br>&amp; Toddler',
    eyebrow: 'Stage 3',
    copy: 'Weaning, movement, play, and independence. Everything for curious, growing little ones.',
    image: '/assets/stage_toddler.webp',
    href: '/journey/toddler'
  }
];

const JourneySection = () => {
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
