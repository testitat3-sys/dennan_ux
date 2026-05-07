import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import './OnboardingPage.css';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);
  const finishOnboarding = useMutation(api.users.updateProfile);

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [children, setChildren] = useState([{ id: Date.now(), dob: '' }]);
  const [dueDate, setDueDate] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (user === null) navigate('/auth');
    if (user?.onboardingComplete) navigate('/dashboard');
  }, [user, navigate]);

  const handleFinish = async () => {
    try {
      await finishOnboarding({
        role,
        children: role === 'parent' ? children : [],
        dueDate: role === 'expecting' ? dueDate : '',
        username,
        onboardingComplete: true
      });
      navigate('/dashboard');
    } catch (error) {
      console.error("Failed to finish onboarding:", error);
    }
  };

  const addChild = () => setChildren([...children, { id: Date.now(), dob: '' }]);
  const updateChildDob = (id, dob) => setChildren(children.map(c => c.id === id ? { ...c, dob } : c));

  if (!user) return null;

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-card">
          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
          </div>

          {step === 1 ? (
            <div className="step-content">
              <h1 className="step-title">Tell us about your journey</h1>
              <p className="step-desc">Help us personalize your experience.</p>
              
              <div className="role-cards">
                <button 
                  className={`role-card ${role === 'expecting' ? 'selected' : ''}`}
                  onClick={() => setRole('expecting')}
                >
                  <span className="role-icon">🤰</span>
                  <span className="role-name">I'm expecting</span>
                </button>
                <button 
                  className={`role-card ${role === 'parent' ? 'selected' : ''}`}
                  onClick={() => setRole('parent')}
                >
                  <span className="role-icon">👶</span>
                  <span className="role-name">I'm a parent</span>
                </button>
              </div>

              {role && (
                <div className="date-inputs">
                  {role === 'expecting' ? (
                    <div className="input-group">
                      <label>Your Due Date</label>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  ) : (
                    <div className="children-list">
                      {children.map((child, idx) => (
                        <div key={child.id} className="input-group">
                          <label>Child {idx + 1} Birthday</label>
                          <input type="date" value={child.dob} onChange={(e) => updateChildDob(child.id, e.target.value)} />
                        </div>
                      ))}
                      <button className="btn-add" onClick={addChild}>+ Add another child</button>
                    </div>
                  )}
                </div>
              )}

              <button 
                className="btn-primary" 
                disabled={!role || (role === 'expecting' ? !dueDate : !children[0].dob)}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="step-content">
              <h1 className="step-title">Choose a username</h1>
              <p className="step-desc">This is how you'll be known in the Dennan community.</p>
              
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="e.g. SuperMom2026" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="actions">
                <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary" disabled={!username} onClick={handleFinish}>
                  Finish Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
