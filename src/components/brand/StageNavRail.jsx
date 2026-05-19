import React from 'react';
import Button from '../ui/Button';
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
          <Button
            key={stage.id}
            variant={activeStage === stage.id ? 'primary' : 'ghost'}
            size="sm"
            className={`stage-nav__item ${activeStage === stage.id ? 'is-active' : ''}`}
            onClick={() => onStageChange(stage.id)}
          >
            {stage.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StageNavRail;

