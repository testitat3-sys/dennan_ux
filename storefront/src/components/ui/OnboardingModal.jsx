import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import { Mail, ArrowRight, ArrowLeft, Baby, Heart, Plus, Users, MoreHorizontal } from 'lucide-react';
import Button from './Button';
import './OnboardingModal.css';

const OnboardingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login, updateProfile } = useUser();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const saveJourney = useMutation(api.users.saveOnboardingJourney);
  const submitReferralSource = useMutation(api.referralSources.submitReferralSource);

  // ── Step state ──────────────────────────────────────────────────────────────
  // For Authenticated users: 1 = role selection, 2 = date details
  // For Unauthenticated users: 1 = email screen
  const [step, setStep] = useState(1);
  const initialized = useRef(false);

  // ── Profile/Journey state ───────────────────────────────────────────────────
  const [role, setRole] = useState(null);       // 'expecting' | 'parent'
  const [dueDate, setDueDate] = useState('');
  const [children, setChildren] = useState([{ id: Date.now(), dob: '', gender: 'unspecified' }]);
  const [firstName, setFirstName] = useState('');
  const [referralSource, setReferralSource] = useState(null);
  const [otherReferralDetail, setOtherReferralDetail] = useState('');

  // ── Email / auth state ──────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState('');
  const [isDirectLogin, setIsDirectLogin] = useState(false);

  // ── Modal mount animation state ─────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);


  // ── Date Boundary Calculations ─────────────────────────────────────────────
  const today = new Date();

  const formatDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Expecting bounds: min = today, max = 10 months from now
  const minDueDate = formatDateString(today);
  const maxDueDateObj = new Date();
  maxDueDateObj.setMonth(today.getMonth() + 10);
  const maxDueDate = formatDateString(maxDueDateObj);

  // Parent bounds: min = 12 years ago, max = today
  const maxDobDate = formatDateString(today);
  const minDobDateObj = new Date();
  minDobDateObj.setFullYear(today.getFullYear() - 12);
  const minDobDate = formatDateString(minDobDateObj);

  // ── Initialize state on open ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !initialized.current) {
      initialized.current = true;
      setSent(false);
      setResendCooldown(0);
      setEmailError('');

      if (isAuthenticated && user) {
        // Hydrate from existing profile data if we are already authenticated
        setRole(user.role || null);
        setDueDate(user.dueDate || '');
        if (user.children) {
          setChildren(user.children.map((c, i) => ({ id: i, dob: c.dob, gender: c.gender || 'unspecified' })));
        } else {
          setChildren([{ id: Date.now(), dob: '', gender: 'unspecified' }]);
        }
        setFirstName(user.name || '');
        setStep(1);
      } else {
        setFirstName('');
        setStep(1);
      }
    }
    if (!isOpen) {
      initialized.current = false;
    }
  }, [isOpen, isAuthenticated, user]);

  // ── Modal animation ─────────────────────────────────────────────────────────
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

  // ── Resend cooldown timer ───────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isMounted) return null;

  // ── Progress ────────────────────────────────────────────────────────────────
  const totalSteps = isAuthenticated ? 3 : 1;
  const displayStep = isAuthenticated ? step : 1;
  const progress = (displayStep / totalSteps) * 100;

  // ── Step 1: Role selection ──────────────────────────────────────────────────
  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleDirectLoginClick = () => {
    setIsDirectLogin(true);
    localStorage.setItem('dennan_is_direct_login', 'true');
    setStep(4);
  };

  // ── Step 3: Journey details submit (Authenticated only) ─────────────────────
  const handleJourneySubmit = async () => {
    setEmailError('');
    setPending(true);

    try {
      const payload = {
        role,
        dueDate: role === 'expecting' ? dueDate : undefined,
        children: role === 'parent' ? children.map(c => ({ dob: c.dob, gender: c.gender || 'unspecified' })) : undefined,
        name: firstName.trim() || undefined,
      };
      console.log(`[OnboardingModal] Calling saveOnboardingJourney:`, payload);
      await saveJourney(payload);

      if (referralSource) {
        try {
          await submitReferralSource({
            source: referralSource,
            otherDetail: referralSource === 'other' ? otherReferralDetail.trim() || undefined : undefined,
          });
        } catch (error) {
          console.error("[OnboardingModal] submitReferralSource error:", error);
        }
      }

      // Update local profile state in UserContext
      updateProfile({
        role,
        dueDate: payload.dueDate,
        children: payload.children,
        name: payload.name,
      });

      onClose();
      navigate('/dashboard');
    } catch (error) {
      console.error("[OnboardingModal] saveOnboardingJourney error:", error);
      setEmailError('Failed to save your journey profile. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const addChild = () => {
    if (children.length < 5) {
      setChildren([...children, { id: Date.now(), dob: '', gender: 'unspecified' }]);
    }
  };

  const updateChildDob = (id, dob) => {
    setChildren(children.map(c => c.id === id ? { ...c, dob } : c));
  };

  const updateChildGender = (id, gender) => {
    setChildren(children.map(c => c.id === id ? { ...c, gender } : c));
  };

  const isDateStepValid = () => {
    if (role === 'expecting') {
      return !!dueDate && dueDate >= minDueDate && dueDate <= maxDueDate;
    }
    return (
      children.length > 0 &&
      children.every(
        (c) => c.dob !== '' && c.dob >= minDobDate && c.dob <= maxDobDate
      )
    );
  };

  // ── Email submit (Unauthenticated magic link request) ──────────────────────
  const handleEmailSubmit = async (e) => {
    if (e) e.preventDefault();
    setEmailError('');
    setPending(true);

    try {
      // Save profile details to localStorage before signing in
      const profile = {
        role,
        dueDate: role === 'expecting' ? dueDate : undefined,
        children: role === 'parent' ? children.map(c => ({ dob: c.dob, gender: c.gender || 'unspecified' })) : undefined,
        name: firstName.trim(),
        referralSource: referralSource || undefined,
        otherReferralDetail: referralSource === 'other' ? otherReferralDetail.trim() || undefined : undefined,
        _savedAt: Date.now()
      };
      localStorage.setItem('dennan_onboarding_profile', JSON.stringify(profile));
      console.log(`[OnboardingModal] Saved onboarding journey details to localStorage:`, profile);

      console.log(`[OnboardingModal] Initiating signIn for ${email}`);
      await signIn("resend", {
        email,
        redirectTo: "/after-signin"
      });
      setSent(true);
    } catch (error) {
      console.error("[OnboardingModal] Sign in error:", error);
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setPending(true);
    try {
      await signIn("resend", {
        email,
        redirectTo: "/after-signin"
      });
      setResendCooldown(30);
    } catch (error) {
      console.error("[OnboardingModal] Resend error:", error);
    } finally {
      setPending(false);
    }
  };

  const handleBack = () => {
    setSent(false);
    setResendCooldown(0);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
          {step > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              className="onboarding-skip"
              onClick={() => {
                if (!isAuthenticated && step === 4 && sent) {
                  setSent(false);
                  setCapturedLink('');
                  setResendCooldown(0);
                } else if (isDirectLogin && step === 4) {
                  setIsDirectLogin(false);
                  localStorage.removeItem('dennan_is_direct_login');
                  setStep(1);
                } else {
                  setStep(prev => prev - 1);
                }
              }}
              icon={<ArrowLeft size={14} />}
              iconPosition="left"
            >
              Back
            </Button>
          ) : (
            <Button variant="skip" size="sm" onClick={onClose}>Skip for now</Button>
          )}
          <Button 
            variant="ghost" 
            className="onboarding-close" 
            onClick={onClose} 
            aria-label="Close"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
          />
        </div>

        <div className="onboarding-content">

          {/* Step 1: Role selection */}
          {step === 1 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">Where are you in your journey?</h2>
              <p className="onboarding-step-desc">We'll personalise your experience to show you exactly what you need.</p>
              <div className="onboarding-cards">
                <Button
                  variant={role === 'expecting' ? 'primary' : 'ghost'}
                  className={`onboarding-card ${role === 'expecting' ? 'is-active' : ''}`}
                  onClick={() => handleRoleSelect('expecting')}
                  style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: 'var(--space-6)' }}
                >
                  <div className="onboarding-card-icon">
                    <Heart size={28} strokeWidth={1.2} />
                  </div>
                  <span className="onboarding-card-label">I'm expecting</span>
                  <span className="onboarding-card-sub">Pregnant & preparing</span>
                </Button>
                <Button
                  variant={role === 'parent' ? 'primary' : 'ghost'}
                  className={`onboarding-card ${role === 'parent' ? 'is-active' : ''}`}
                  onClick={() => handleRoleSelect('parent')}
                  style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: 'var(--space-6)' }}
                >
                  <div className="onboarding-card-icon">
                    <Baby size={28} strokeWidth={1.2} />
                  </div>
                  <span className="onboarding-card-label">I'm already a parent</span>
                  <span className="onboarding-card-sub">My child is here</span>
                </Button>
              </div>
              <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                <Button
                  variant="link"
                  onClick={handleDirectLoginClick}
                  style={{ fontSize: '0.875rem' }}
                >
                  Already have an account? Login
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Date details */}
          {step === 2 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">
                {role === 'expecting' ? 'When is your due date?' : 'When is your child\'s birthday?'}
              </h2>
              <p className="onboarding-step-desc">
                {role === 'expecting'
                  ? "We'll help you time your nursery setup and hospital bag."
                  : "We'll show you gear that fits their current milestones."}
              </p>

              <div className="onboarding-date-section">
                {role === 'expecting' ? (
                  <div className="date-input-group">
                    <label className="date-label">Expected Due Date</label>
                    <input
                      type="date"
                      className="onboarding-input"
                      value={dueDate}
                      min={minDueDate}
                      max={maxDueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                    {dueDate && (dueDate < minDueDate || dueDate > maxDueDate) && (
                      <p className="date-error-msg">
                        {dueDate < minDueDate
                          ? "Due date cannot be in the past."
                          : `Due date must be within 10 months (by ${new Date(maxDueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}).`}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {children.map((child, index) => (
                      <div key={child.id} className="date-input-group">
                        <label className="date-label">Child {index + 1} Details</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ flex: 1.6 }}>
                            <input
                              type="date"
                              className="onboarding-input"
                              value={child.dob}
                              min={minDobDate}
                              max={maxDobDate}
                              onChange={(e) => updateChildDob(child.id, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <select
                              value={child.gender || 'unspecified'}
                              onChange={(e) => updateChildGender(child.id, e.target.value)}
                              className="onboarding-input"
                              style={{ width: '100%', paddingRight: '20px' }}
                            >
                              <option value="unspecified">Select Gender</option>
                              <option value="boy">Boy</option>
                              <option value="girl">Girl</option>
                            </select>
                          </div>
                        </div>
                        {child.dob && (child.dob < minDobDate || child.dob > maxDobDate) && (
                          <p className="date-error-msg">
                            {child.dob > maxDobDate
                              ? "Birthday cannot be in the future."
                              : `Age limit is 12 years (born after ${new Date(minDobDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}).`}
                          </p>
                        )}
                      </div>
                    ))}
                    {children.length < 5 && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="add-another-btn" 
                        onClick={addChild}
                        icon={<Plus size={18} />}
                        iconPosition="left"
                      >
                        Add another child
                      </Button>
                    )}
                  </>
                )}
              </div>

              {emailError && (
                <p style={{ color: 'var(--error, #ef4444)', fontSize: '0.8125rem', marginTop: '12px', textAlign: 'center' }}>
                  {emailError}
                </p>
              )}

              <div className="onboarding-actions">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setStep(3)}
                  disabled={!isDateStepValid() || pending}
                  icon={<ArrowRight size={18} />}
                  iconPosition="right"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: First Name & Referral Source */}
          {step === 3 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">Tell us about yourself</h2>
              <p className="onboarding-step-desc">
                Choose your first name to personalise your Dennan experience.
              </p>

              <div className="onboarding-date-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="date-input-group">
                  <label className="date-label">First Name</label>
                  <input
                    type="text"
                    className="onboarding-input"
                    placeholder="e.g. Sarah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="date-input-group">
                  <label className="date-label">How did you know about us? (optional)</label>
                  <div className="referral-source-options">
                    {[
                      {
                        value: 'tiktok', label: 'TikTok', icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 3v10.5a3.5 3.5 0 1 1-2.5-3.36V6.5a5.5 5.5 0 0 0 5.5 5.5" /><path d="M16 3a4.5 4.5 0 0 0 4.5 4.5" /></svg>
                        )
                      },
                      {
                        value: 'instagram', label: 'Instagram', icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></svg>
                        )
                      },
                      { value: 'friend', label: 'A friend', icon: <Users size={20} /> },
                      {
                        value: 'google', label: 'Google', icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        )
                      },
                      { value: 'other', label: 'Other', icon: <MoreHorizontal size={20} /> },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`referral-source-chip ${referralSource === opt.value ? 'is-selected' : ''}`}
                        onClick={() => setReferralSource(opt.value)}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {referralSource === 'other' && (
                    <input
                      type="text"
                      className="onboarding-input"
                      placeholder="Please tell us where..."
                      value={otherReferralDetail}
                      onChange={(e) => setOtherReferralDetail(e.target.value)}
                      style={{ marginTop: '12px' }}
                    />
                  )}
                </div>
              </div>

              {emailError && (
                <p style={{ color: 'var(--error, #ef4444)', fontSize: '0.8125rem', marginTop: '12px', textAlign: 'center' }}>
                  {emailError}
                </p>
              )}

              <div className="onboarding-actions">
                {isAuthenticated ? (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleJourneySubmit}
                    disabled={!firstName.trim() || pending}
                    loading={pending}
                    icon={<ArrowRight size={18} />}
                    iconPosition="right"
                  >
                    Complete Setup
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setStep(4)}
                    disabled={!firstName.trim() || pending}
                    icon={<ArrowRight size={18} />}
                    iconPosition="right"
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Email Entry (Unauthenticated only) */}
          {!isAuthenticated && step === 4 && (
            <div className="onboarding-step">
              {!sent ? (
                <>
                  <h2 className="onboarding-step-title">Welcome to Dennan</h2>
                  <p className="onboarding-step-desc">
                    Enter your email to receive a magic sign-in link and save your personalization journey.
                  </p>
                  <form onSubmit={handleEmailSubmit} style={{ width: '100%' }}>
                    <div className="date-input-group">
                      <label className="date-label">Email Address</label>
                      <div style={{ position: 'relative' }}>
                        <Mail
                          size={18}
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                        />
                        <input
                          type="email"
                          className="onboarding-input"
                          placeholder="hello@example.com"
                          style={{ paddingLeft: '40px' }}
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                          required
                        />
                      </div>
                      {emailError && (
                        <p style={{ color: 'var(--error, #ef4444)', fontSize: '0.8125rem', marginTop: '6px' }}>
                          {emailError}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      disabled={!email || pending}
                      loading={pending}
                      icon={<ArrowRight size={18} />}
                      iconPosition="right"
                      style={{ marginTop: '0.5rem' }}
                    >
                      Send Magic Link
                    </Button>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Mail style={{ color: 'var(--primary)' }} size={32} />
                  </div>
                  <h3>Check your email</h3>
                  <p className="onboarding-step-desc" style={{ fontSize: '0.875rem' }}>
                    We've sent a magic link to <strong>{email}</strong>
                  </p>

                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button
                      onClick={handleResend}
                      variant="secondary"
                      fullWidth
                      size="sm"
                      disabled={pending || resendCooldown > 0}
                      loading={pending}
                    >
                      {resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : "Resend email"}
                    </Button>

                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleBack}
                    >
                      Entered the wrong email? Click here to change it
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

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
        .onboarding-card-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .date-error-msg {
          color: var(--error, #ef4444);
          font-size: 0.75rem;
          margin-top: 4px;
          animation: fadeIn 0.2s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OnboardingModal;
