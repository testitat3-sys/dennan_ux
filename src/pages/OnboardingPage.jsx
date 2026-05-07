import React, { useState, useEffect } from 'react';
import { User, Rocket, CheckCircle, ArrowRight, ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.viewer);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    try {
      console.log("[OnboardingPage.jsx] Initiating sign out...");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    interests: []
  });

  // Redirect if already onboarded
  useEffect(() => {
    if (user && user.isOnboarded) {
      console.log("[OnboardingPage] Already onboarded, redirecting to /dashboard");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.username)) {
      alert("Please fill in all fields");
      return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        name: formData.name,
        username: formData.username,
        interests: formData.interests,
      });
      console.log("[OnboardingPage] completeOnboarding mutation successfully completed");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Step {step} of {totalSteps}</span>
            <span style={{ fontWeight: 600 }}>{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <div style={{ height: '6px', background: 'var(--glass-bg)', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${(step / totalSteps) * 100}%`, 
                background: 'var(--primary)', 
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </div>
        </div>

        <div className="card glass">
          {step === 1 && (
            <div className="fade-in">
              <h2 className="title-xl text-gradient">Let's get started</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Tell us a bit about yourself.</p>
              
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Username</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="johndoe" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h2 className="title-xl text-gradient">Preferences</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>What are you interested in?</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                {['Development', 'Design', 'Marketing', 'Analytics'].map(item => (
                  <div 
                    key={item} 
                    className={`glass ${formData.interests.includes(item) ? 'active' : ''}`}
                    style={{ 
                      padding: 'var(--space-md)', 
                      cursor: 'pointer', 
                      textAlign: 'center',
                      border: formData.interests.includes(item) ? '2px solid var(--primary)' : '1px solid transparent',
                      background: formData.interests.includes(item) ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--glass-bg)'
                    }}
                    onClick={() => handleInterestToggle(item)}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in" style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)' }}>
                <CheckCircle size={40} color="white" />
              </div>
              <h2 className="title-xl text-gradient">All set!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Your profile is ready. Let's head to your dashboard.</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
            {step > 1 ? (
              <button onClick={prevStep} className="btn" style={{ gap: '8px', color: 'var(--text-muted)' }} disabled={isSubmitting}>
                <ArrowLeft size={18} /> Back
              </button>
            ) : <div />}
            
            <button 
              onClick={step === 3 ? handleComplete : nextStep} 
              className="btn btn-primary" 
              style={{ gap: '8px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {step === 3 ? 'Go to Profile' : 'Next'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sign Out option */}
        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
          <button 
            onClick={handleSignOut}
            className="btn-ghost"
            style={{ 
              fontSize: '0.8125rem', 
              color: 'var(--text-muted)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              opacity: 0.6,
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Not your account? Sign out
          </button>
        </div>
      </div>
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
