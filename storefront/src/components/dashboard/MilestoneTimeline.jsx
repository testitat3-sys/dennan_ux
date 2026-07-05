import './MilestoneTimeline.css';

const MilestoneTimeline = ({ info, milestones = [] }) => {

  const currentVal = info.type === 'expecting' ? info.week : info.months;
  const maxVal = info.type === 'expecting' ? 40 : 24;

  return (
    <div className="milestone-timeline">
      <div className="timeline-track">
        <div 
          className="timeline-progress" 
          style={{ width: `${Math.min((currentVal / maxVal) * 100, 100)}%` }}
        ></div>
        
        {milestones.map((m, idx) => {
          const mVal = info.type === 'expecting' ? m.week : m.month;
          const pos = (mVal / maxVal) * 100;
          const isActive = currentVal >= mVal;

          return (
            <div 
              key={idx} 
              className={`timeline-marker ${isActive ? 'is-active' : ''}`}
              style={{ left: `${pos}%` }}
            >
              <div className="marker-dot"></div>
              <span className="marker-label">{m.label}</span>
            </div>
          );
        })}
      </div>
      
    </div>
  );
};

export default MilestoneTimeline;

