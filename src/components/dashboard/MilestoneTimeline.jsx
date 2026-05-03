import './MilestoneTimeline.css';

const MilestoneTimeline = ({ info }) => {
  const milestones = info.type === 'expecting' 
    ? [
        { label: 'Conception', week: 0 },
        { label: '1st Trimester', week: 12 },
        { label: '2nd Trimester', week: 27 },
        { label: '3rd Trimester', week: 36 },
        { label: 'Due Date', week: 40 }
      ]
    : [
        { label: 'Birth', month: 0 },
        { label: '6 Months', month: 6 },
        { label: '1 Year', month: 12 },
        { label: '18 Months', month: 18 },
        { label: '2 Years', month: 24 }
      ];

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

