import React from 'react';
import './StageNavRail.css';

const stages = [
  { id: 'all', label: 'All Products' },
  { id: 'newborn', label: 'Newborn' },
  { id: 'toddler', label: 'Toddler' },
  { id: 'maternity', label: 'Maternity' }
];

const StageNavRail = ({ activeStage, onStageChange }) => {
  return (
    <div className="stage-nav">
      <div className="stage-nav__container">
        {stages.map((stage) => (
          <button
            key={stage.id}
            className={`stage-nav__item ${activeStage === stage.id ? 'is-active' : ''}`}
            onClick={() => onStageChange(stage.id)}
          >
            {stage.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StageNavRail;
