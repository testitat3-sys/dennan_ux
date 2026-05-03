import './NextMilestoneCard.css';

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
      
    </div>
  );
};

export default NextMilestoneCard;

