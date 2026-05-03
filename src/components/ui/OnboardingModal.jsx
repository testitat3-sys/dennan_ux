import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './OnboardingModal.css';

const OnboardingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null); // 'expecting' or 'parent'
  const [children, setChildren] = useState([{ id: Date.now(), dob: '' }]);
  const [dueDate, setDueDate] = useState('');
  const [email, setEmail] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
      const timer = setTimeout(() => setIsMounted(false), 400);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const addChild = () => {
    if (children.length < 5) {
      setChildren([...children, { id: Date.now(), dob: '' }]);
    }
  };

  const updateChildDob = (id, dob) => {
    setChildren(children.map(c => c.id === id ? { ...c, dob } : c));
  };

  const handleFinish = () => {
    const userData = { role, children, dueDate, email };
    login(userData);
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className={`onboarding-overlay ${active ? 'is-open' : ''}`} onClick={onClose}>
      <div 
        className={`onboarding-modal ${active ? 'is-open' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onboarding-progress">
          <div className="onboarding-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="onboarding-header">
          <button className="onboarding-skip" onClick={onClose}>Skip for now</button>
          <button className="onboarding-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">Where are you in your journey?</h2>
              <p className="onboarding-step-desc">We’ll personalize your experience to show you exactly what you need.</p>
              <div className="onboarding-cards">
                <div 
                  className={`onboarding-card ${role === 'expecting' ? 'is-active' : ''}`}
                  onClick={() => handleRoleSelect('expecting')}
                >
                  <div className="onboarding-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121M17.636 17.636l-2.121-2.121M6.364 6.364l2.121 2.121"/>
                      <circle cx="12" cy="12" r="4"/>
                    </svg>
                  </div>
                  <span className="onboarding-card-label">I’m expecting</span>
                </div>
                <div 
                  className={`onboarding-card ${role === 'parent' ? 'is-active' : ''}`}
                  onClick={() => handleRoleSelect('parent')}
                >
                  <div className="onboarding-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16c1.5 0 3-1.5 3-3.5s-1.5-3.5-3-3.5-3 1.5-3 3.5 1.5 3.5 3 3.5z"/>
                      <circle cx="9" cy="9" r="1"/>
                      <circle cx="15" cy="9" r="1"/>
                    </svg>
                  </div>
                  <span className="onboarding-card-label">I’m already a parent</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">
                {role === 'expecting' ? 'When is your due date?' : 'When is your child’s birthday?'}
              </h2>
              <p className="onboarding-step-desc">
                {role === 'expecting' 
                  ? 'We’ll help you time your nursery setup and hospital bag.' 
                  : 'We’ll show you gear that fits their current milestones.'}
              </p>
              
              <div className="onboarding-date-section">
                {role === 'expecting' ? (
                  <div className="date-input-group">
                    <label className="date-label">Expected Due Date</label>
                    <input 
                      type="date" 
                      className="onboarding-input" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    {children.map((child, index) => (
                      <div key={child.id} className="date-input-group">
                        <label className="date-label">Child {index + 1} Birthday</label>
                        <input 
                          type="date" 
                          className="onboarding-input" 
                          value={child.dob}
                          onChange={(e) => updateChildDob(child.id, e.target.value)}
                        />
                      </div>
                    ))}
                    {children.length < 5 && (
                      <button className="add-another-btn" onClick={addChild}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add another child
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="onboarding-actions">
                <button 
                  className="btn-primary-full" 
                  onClick={() => setStep(3)}
                  disabled={role === 'expecting' ? !dueDate : !children[0].dob}
                >
                  Continue
                </button>
                <div className="gift-option">
                  <button className="btn-ghost" onClick={() => setStep(3)}>
                    I’m shopping for a gift
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">Join the Dennan Family</h2>
              <p className="onboarding-step-desc">Enter your email to save your profile and receive your personalized guide.</p>
              
              <div className="email-section">
                <div className="date-input-group">
                  <label className="date-label">Email Address</label>
                  <input 
                    type="email" 
                    className="onboarding-input" 
                    placeholder="hello@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="otp-options">
                  <p className="date-label" style={{ textAlign: 'center', marginBottom: '8px' }}>Or continue with</p>
                  <button className="otp-btn">
                    <svg className="otp-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Receive OTP via SMS
                  </button>
                  <button className="otp-btn">
                    <svg className="otp-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    Receive OTP via Email
                  </button>
                </div>
              </div>

              <div className="onboarding-actions">
                <button 
                  className="btn-primary-full" 
                  onClick={handleFinish}
                  disabled={!email}
                >
                  Finish & Complete Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;

