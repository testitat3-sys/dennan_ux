import React from 'react';

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
      
      <style>{`
        .milestone-timeline {
          padding: 60px 0 40px;
          position: relative;
        }
        
        .timeline-track {
          height: 4px;
          background: var(--surface-container-high);
          border-radius: 2px;
          position: relative;
        }
        
        .timeline-progress {
          height: 100%;
          background: var(--color-brand-primary);
          border-radius: 2px;
          position: relative;
          transition: width 1s ease-out;
        }
        
        .timeline-marker {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .marker-dot {
          width: 12px;
          height: 12px;
          background: white;
          border: 2px solid var(--surface-container-highest);
          border-radius: 50%;
          transition: all 0.3s ease;
          z-index: 2;
        }
        
        .timeline-marker.is-active .marker-dot {
          background: var(--color-brand-primary);
          border-color: var(--color-brand-primary);
          transform: scale(1.2);
          box-shadow: 0 0 15px color-mix(in srgb, var(--color-brand-primary), transparent 60%);
        }
        
        .marker-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-tertiary);
          white-space: nowrap;
          position: absolute;
          top: 20px;
          transition: color 0.3s ease;
        }
        
        .timeline-marker.is-active .marker-label {
          color: var(--color-anchor);
        }
      `}</style>
    </div>
  );
};

export default MilestoneTimeline;
