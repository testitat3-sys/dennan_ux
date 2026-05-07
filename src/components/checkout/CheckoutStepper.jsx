import React from 'react';
import './CheckoutStepper.css';

const StepIcons = {
  cart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  payment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect width="20" height="14" x="2" y="5" rx="2"/>
      <line x1="2" x2="22" y1="10" y2="10"/>
    </svg>
  ),
  confirmation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 8V20" />
      <path d="M19 12H5" />
      <path d="M7 8V5a2 2 0 0 1 2-2h2v3" />
      <path d="M17 8V5a2 2 0 0 0-2-2h-2v3" />
    </svg>
  )
};

const CheckoutStepper = ({ currentStepId, steps = [] }) => {
  const currentStepIndex = steps.findIndex(s => s.id === currentStepId);
  
  const displaySteps = steps.map(step => ({
    ...step,
    icon: StepIcons[step.id] || StepIcons.cart
  }));

  return (
    <div className="checkout-stepper-container">
      <div className="checkout-stepper">
        {displaySteps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <React.Fragment key={step.id}>
              <div className={`stepper-item ${isCompleted ? 'is-completed' : ''} ${isCurrent ? 'is-current' : ''}`}>
                <div className="stepper-icon-wrapper">
                  {step.icon}
                  {isCompleted && (
                    <div className="stepper-check">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className="stepper-label">{step.label}</span>
              </div>
              {index < displaySteps.length - 1 && (
                <div className={`stepper-line ${isCompleted ? 'is-active' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutStepper;

