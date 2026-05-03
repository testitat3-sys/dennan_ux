import React from 'react';

const NextMilestoneCard = ({ stageInfo }) => {
  const getNextContent = () => {
    if (stageInfo.type === 'expecting') {
      if (stageInfo.week < 12) return { title: 'First Scan', desc: 'Preparing for your first look at your little one. Time to start the registry!', action: 'Start Registry' };
      if (stageInfo.week < 27) return { title: 'Nursery Setup', desc: 'You’re entering the golden trimester. Perfect time to paint and prep.', action: 'Shop Decor' };
      return { title: 'Hospital Bag', desc: 'The countdown is on. Let’s make sure you have everything for the big day.', action: 'Bag Checklist' };
    } else {
      if (stageInfo.months < 6) return { title: 'First Solids', desc: 'Ready for the big switch? High chairs and soft spoons await.', action: 'Explore Weaning' };
      if (stageInfo.months < 12) return { title: 'First Steps', desc: 'Time for sturdy shoes and baby-proofing the living room.', action: 'Baby Proofing' };
      return { title: 'Toddler Transition', desc: 'Moving to a big kid bed? We have the softest transition sets.', action: 'Shop Bedding' };
    }
  };

  const content = getNextContent();

  return (
    <div className="next-milestone-card">
      <div className="next-milestone-card__content">
        <span className="next-milestone-card__eyebrow">Coming Up Next</span>
        <h3 className="next-milestone-card__title">{content.title}</h3>
        <p className="next-milestone-card__desc">{content.desc}</p>
        <button className="next-milestone-card__btn">{content.action}</button>
      </div>
      
      <style>{`
        .next-milestone-card {
          padding: 40px;
          background: var(--color-anchor);
          border-radius: var(--radius-lg);
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .next-milestone-card::after {
          content: '';
          position: absolute;
          top: -20%;
          right: -10%;
          width: 150px;
          height: 150px;
          background: var(--color-brand-primary);
          filter: blur(60px);
          opacity: 0.4;
          border-radius: 50%;
        }
        
        .next-milestone-card__eyebrow {
          display: block;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--color-brand-primary-light);
          margin-bottom: 16px;
        }
        
        .next-milestone-card__title {
          font-family: 'Newsreader', serif;
          font-size: 2rem;
          margin-bottom: 12px;
          font-weight: 400;
        }
        
        .next-milestone-card__desc {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.6;
          opacity: 0.8;
          margin-bottom: 24px;
        }
        
        .next-milestone-card__btn {
          width: 100%;
          padding: 14px;
          background: white;
          color: var(--color-anchor);
          border: none;
          border-radius: var(--radius-md);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .next-milestone-card__btn:hover {
          background: var(--color-brand-primary);
          color: white;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default NextMilestoneCard;

