import './NextMilestoneCard.css';

const NextMilestoneCard = ({ stageInfo, nextMilestoneData = [] }) => {
  const getNextContent = () => {
    const current = nextMilestoneData.find(m => {
      if (stageInfo.type === 'expecting') {
        return stageInfo.week >= m.minWeek && stageInfo.week <= m.maxWeek;
      } else {
        return stageInfo.months >= m.minMonth && stageInfo.months <= m.maxMonth;
      }
    });
    return current || { title: 'Next Step', desc: 'Stay tuned for your next milestone.', action: 'Explore' };
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

