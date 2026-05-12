import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Mail, ArrowRight, ArrowLeft, Loader2, Baby, Heart } from 'lucide-react';
import './OnboardingModal.css';

const OnboardingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login, updateProfile } = useUser();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const saveJourney = useMutation(api.users.saveOnboardingJourney);

  // ── Step state ──────────────────────────────────────────────────────────────
  // For Authenticated users: 1 = role selection, 2 = date details
  // For Unauthenticated users: 1 = email screen
  const [step, setStep] = useState(1);
  const initialized = useRef(false);

  // ── Profile/Journey state ───────────────────────────────────────────────────
  const [role, setRole] = useState(null);       // 'expecting' | 'parent'
  const [dueDate, setDueDate] = useState('');
  const [children, setChildren] = useState([{ id: Date.now(), dob: '' }]);
  const [username, setUsername] = useState('');

  // ── Email / auth state ──────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [capturedLink, setCapturedLink] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState('');

  // ── Modal mount animation state ─────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  const [active, setActive] = useState(false);

  // ── Polling for test link ───────────────────────────────────────────────────
  const link = useQuery(api.users.getTestLink, testMode && sent ? { email } : "skip");

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
      setCapturedLink('');
      setResendCooldown(0);
      setEmailError('');

      if (isAuthenticated && user) {
        // Hydrate from existing profile data if we are already authenticated
        setRole(user.role || null);
        setDueDate(user.dueDate || '');
        if (user.children) {
          setChildren(user.children.map((c, i) => ({ id: i, dob: c.dob })));
        } else {
          setChildren([{ id: Date.now(), dob: '' }]);
        }
        setStep(1);
      } else {
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

  // ── Capture test link ───────────────────────────────────────────────────────
  useEffect(() => {
    if (link) {
      console.log(`[OnboardingModal] Captured test link for ${email}: ${link}`);
      setCapturedLink(link);
    }
  }, [link, email]);

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

  // ── Step 3: Journey details submit (Authenticated only) ─────────────────────
  const handleJourneySubmit = async () => {
    setEmailError('');
    setPending(true);

    try {
      const payload = {
        role,
        dueDate: role === 'expecting' ? dueDate : undefined,
        children: role === 'parent' ? children.map(c => ({ dob: c.dob })) : undefined,
        username: username.trim() || undefined,
      };
      console.log(`[OnboardingModal] Calling saveOnboardingJourney:`, payload);
      await saveJourney(payload);

      // Update local profile state in UserContext
      updateProfile({
        role,
        dueDate: payload.dueDate,
        children: payload.children,
        username: payload.username,
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
      setChildren([...children, { id: Date.now(), dob: '' }]);
    }
  };

  const updateChildDob = (id, dob) => {
    setChildren(children.map(c => c.id === id ? { ...c, dob } : c));
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
      console.log(`[OnboardingModal] Initiating signIn for ${email} (testMode: ${testMode})`);
      await signIn(testMode ? "test" : "resend", {
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
      await signIn(testMode ? "test" : "resend", {
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
    setCapturedLink('');
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
          {isAuthenticated && step > 1 ? (
            <button
              className="onboarding-skip"
              onClick={() => setStep(prev => prev - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button className="onboarding-skip" onClick={onClose}>Skip for now</button>
          )}
          <button className="onboarding-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="onboarding-content">

          {/* ── FLOW A: AUTHENTICATED USER WIZARD ── */}
          {isAuthenticated ? (
            <>
              {/* Step 1: Role selection */}
              {step === 1 && (
                <div className="onboarding-step">
                  <h2 className="onboarding-step-title">Where are you in your journey?</h2>
                  <p className="onboarding-step-desc">We'll personalise your experience to show you exactly what you need.</p>
                  <div className="onboarding-cards">
                    <div
                      className={`onboarding-card ${role === 'expecting' ? 'is-active' : ''}`}
                      onClick={() => handleRoleSelect('expecting')}
                    >
                      <div className="onboarding-card-icon">
                        <Heart size={28} strokeWidth={1.2} />
                      </div>
                      <span className="onboarding-card-label">I'm expecting</span>
                      <span className="onboarding-card-sub">Pregnant & preparing</span>
                    </div>
                    <div
                      className={`onboarding-card ${role === 'parent' ? 'is-active' : ''}`}
                      onClick={() => handleRoleSelect('parent')}
                    >
                      <div className="onboarding-card-icon">
                        <Baby size={28} strokeWidth={1.2} />
                      </div>
                      <span className="onboarding-card-label">I'm already a parent</span>
                      <span className="onboarding-card-sub">My child is here</span>
                    </div>
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
                            <label className="date-label">Child {index + 1} Birthday</label>
                            <input
                              type="date"
                              className="onboarding-input"
                              value={child.dob}
                              min={minDobDate}
                              max={maxDobDate}
                              onChange={(e) => updateChildDob(child.id, e.target.value)}
                            />
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

                  {emailError && (
                    <p style={{ color: 'var(--error, #ef4444)', fontSize: '0.8125rem', marginTop: '12px', textAlign: 'center' }}>
                      {emailError}
                    </p>
                  )}

                  <div className="onboarding-actions">
                    <button
                      className="btn-primary-full"
                      onClick={() => setStep(3)}
                      disabled={!isDateStepValid() || pending}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Choose Username */}
              {step === 3 && (
                <div className="onboarding-step">
                  <h2 className="onboarding-step-title">Choose your username</h2>
                  <p className="onboarding-step-desc">
                    This will be your unique identity on Dennan, visible on your registry and shared collections.
                  </p>

                  <div className="onboarding-date-section">
                    <div className="date-input-group">
                      <label className="date-label">Username</label>
                      <input
                        type="text"
                        className="onboarding-input"
                        placeholder="e.g. mommy_care"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {emailError && (
                    <p style={{ color: 'var(--error, #ef4444)', fontSize: '0.8125rem', marginTop: '12px', textAlign: 'center' }}>
                      {emailError}
                    </p>
                  )}

                  <div className="onboarding-actions">
                    <button
                      className="btn-primary-full"
                      onClick={handleJourneySubmit}
                      disabled={!username.trim() || pending}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {pending ? (
                        <>Saving Setup… <Loader2 className="animate-spin" size={18} /></>
                      ) : (
                        <>Complete Setup <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── FLOW B: UNAUTHENTICATED EMAIL ENTRY ── */
            <div className="onboarding-step">
              {!sent ? (
                <>
                  <h2 className="onboarding-step-title">Welcome to Dennan</h2>
                  <p className="onboarding-step-desc">
                    Enter your email to receive a magic sign-in link and start your personal journey guide.
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1rem 0', justifyContent: 'flex-start' }}>
                      <input
                        type="checkbox"
                        id="testModeModal"
                        checked={testMode}
                        onChange={(e) => setTestMode(e.target.checked)}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      <label htmlFor="testModeModal" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        Test Mode: Receive link here
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary-full"
                      disabled={!email || pending}
                      style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {pending ? (
                        <>Sending Link… <Loader2 className="animate-spin" size={18} /></>
                      ) : (
                        <>Send Magic Link <ArrowRight size={18} /></>
                      )}
                    </button>
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
                    <button
                      onClick={handleResend}
                      className="btn-secondary-full"
                      style={{ width: '100%', fontSize: '0.875rem' }}
                      disabled={pending || resendCooldown > 0}
                    >
                      {pending ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : resendCooldown > 0 ? (
                        `Resend email (${resendCooldown}s)`
                      ) : (
                        "Resend email"
                      )}
                    </button>

                    <button
                      onClick={handleBack}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Entered the wrong email? Click here to change it
                    </button>
                  </div>

                  {testMode && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--primary)', background: 'var(--surface-container-low)' }}>
                      {!capturedLink ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)' }}>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Capturing link...</span>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            Test Link Captured:
                          </p>
                          <a
                            href={capturedLink}
                            className="btn-primary-full"
                            style={{ width: '100%', fontSize: '0.875rem', padding: '8px' }}
                          >
                            Login Directly
                          </a>
                        </div>
                      )}
                    </div>
                  )}
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
