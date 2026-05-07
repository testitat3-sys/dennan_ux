import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation, useConvexAuth, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Mail, ArrowRight, ArrowLeft, Loader2, Baby, Heart } from 'lucide-react';
import './OnboardingModal.css';

// ─── localStorage helpers ────────────────────────────────────────────────────
const PROFILE_KEY = 'dennan_onboarding_profile';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readLocalProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed._savedAt || Date.now() - parsed._savedAt > MAX_AGE_MS) {
      localStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

function writeLocalProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, _savedAt: Date.now() }));
}

function clearLocalProfile() {
  localStorage.removeItem(PROFILE_KEY);
}
// ─────────────────────────────────────────────────────────────────────────────

const OnboardingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login } = useUser();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const convex = useConvex(); // for imperative query on email submit

  // ── Step state ──────────────────────────────────────────────────────────────
  // Steps: 1 = role, 2 = date, 3 = email (+ "check email" sub-state)
  // If a valid local profile exists on mount, we jump straight to step 3.
  const [step, setStep] = useState(1);
  const [hasLocalProfile, setHasLocalProfile] = useState(false);
  const initialized = useRef(false);

  // ── Profile state ───────────────────────────────────────────────────────────
  const [role, setRole] = useState(null);       // 'expecting' | 'parent'
  const [dueDate, setDueDate] = useState('');
  const [children, setChildren] = useState([{ id: Date.now(), dob: '' }]);

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

  // ── On open: read localStorage to determine starting step ──────────────────
  useEffect(() => {
    if (isOpen && !initialized.current) {
      initialized.current = true;
      const local = readLocalProfile();
      if (local) {
        setHasLocalProfile(true);
        setRole(local.role);
        setDueDate(local.dueDate || '');
        if (local.children) setChildren(local.children.map((c, i) => ({ id: i, dob: c.dob })));
        setStep(3); // skip role + date
      } else {
        setHasLocalProfile(false);
        setStep(1);
      }
    }
    if (!isOpen) {
      initialized.current = false;
    }
  }, [isOpen]);

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
  // If user came with a local profile we only show step 3 (total = 1 "step")
  const totalSteps = hasLocalProfile ? 1 : 3;
  const displayStep = hasLocalProfile ? 1 : step;
  const progress = (displayStep / totalSteps) * 100;

  // ── Step 1: Role selection ──────────────────────────────────────────────────
  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  // ── Step 2: Date details → save to localStorage ─────────────────────────────
  const handleDateNext = () => {
    const profileData = {
      role,
      dueDate: role === 'expecting' ? dueDate : undefined,
      children: role === 'parent' ? children.map(c => ({ dob: c.dob })) : undefined,
    };
    writeLocalProfile(profileData);
    setHasLocalProfile(true);
    setStep(3);
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
    if (role === 'expecting') return !!dueDate;
    return children.length > 0 && children[0].dob !== '';
  };

  // ── Step 3: Email submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setEmailError('');
    setPending(true);

    try {
      // 1. Check if account is already confirmed (cross-device skip)
      const status = await convex.query(api.users.checkOnboardingStatus, { email });
      console.log(`[OnboardingModal] checkOnboardingStatus for ${email}:`, status);

      if (!status.isOnboarded && !hasLocalProfile) {
        // Edge case: no local profile answers and no confirmed account.
        // Can't reconcile later — send them back to collect role/date first.
        setEmailError('Please complete your profile first.');
        clearLocalProfile();
        setHasLocalProfile(false);
        setStep(1);
        setPending(false);
        return;
      }

      // 2. Send magic link (whether account is confirmed or not — AfterSignIn reconciles)
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
          {/* Back button: show on step 2, or on step 3 if user came through steps (not local profile) */}
          {(step === 2 || (step === 3 && !hasLocalProfile)) && !sent ? (
            <button
              className="onboarding-skip"
              onClick={() => setStep(step - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
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

          {/* ── STEP 1: Role selection ── */}
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

          {/* ── STEP 2: Date details ── */}
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
                  onClick={handleDateNext}
                  disabled={!isDateStepValid()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Email ── */}
          {step === 3 && (
            <div className="onboarding-step">
              <h2 className="onboarding-step-title">
                {hasLocalProfile ? 'Save your profile' : 'Almost there'}
              </h2>

              {!sent ? (
                <>
                  <p className="onboarding-step-desc">
                    Enter your email to save your profile and receive your personalised guide.
                  </p>
                  <form onSubmit={handleSubmit} style={{ width: '100%' }}>
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
                        <>Checking… <Loader2 className="animate-spin" size={18} /></>
                      ) : (
                        <>Continue <ArrowRight size={18} /></>
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
      `}</style>
    </div>
  );
};

export default OnboardingModal;
