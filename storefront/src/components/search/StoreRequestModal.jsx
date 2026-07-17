import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import Button from '../ui/Button';
import Text from '../ui/Text';
import Toast from '../ui/Toast';
import './StoreRequestModal.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UG_PHONE_RE = /^0?7\d{8}$/;

// 'not_a_mum' is a local-only sentinel (never sent to the backend) so the
// chip can be selected/highlighted distinctly from "nothing chosen yet".
const STAGE_OPTIONS = [
  { value: 'mother', label: 'Pregnant' },
  { value: 'newborn', label: 'Newborn' },
  { value: 'kid', label: 'Toddler+' },
  { value: 'not_a_mum', label: 'Not a Mum' },
];

const splitName = (name) => {
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

const StoreRequestModal = ({ isOpen, onClose, initialItemDescription = '' }) => {
  const submitStoreRequest = useMutation(api.storeRequests.submitStoreRequest);
  const user = useQuery(api.users.viewer);

  const [active, setActive] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState(null);
  const [itemDescription, setItemDescription] = useState(initialItemDescription);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Bottom slide-in animation transition states
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setActive(false);
    }
  }, [isOpen]);

  // Pre-fill from the logged-in user's profile; guests get a blank form.
  useEffect(() => {
    if (isOpen && user && !hasPrefilled) {
      const { firstName: fn, lastName: ln } = splitName(user.name);
      setFirstName(prev => prev || fn);
      setLastName(prev => prev || ln);
      setEmail(prev => prev || user.email || '');
      setPhone(prev => prev || (user.phone || user.momoPhone || '').replace(/^\+?256\s*/, ''));
      setStage(prev => prev || user.stage || null);
      setHasPrefilled(true);
    }
  }, [isOpen, user, hasPrefilled]);

  // Pre-fill item description when modal opens
  useEffect(() => {
    if (isOpen && initialItemDescription) {
      setItemDescription(initialItemDescription);
    }
  }, [isOpen, initialItemDescription]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setStage(null);
      setItemDescription('');
      setErrors({});
      setShowSuccess(false);
      setHasPrefilled(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const next = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    const cleanedPhone = phone.replace(/\s+/g, '').trim();
    if (!cleanedPhone) next.phone = 'Phone number is required.';
    else if (!UG_PHONE_RE.test(cleanedPhone)) next.phone = 'Enter a valid Ugandan phone number (e.g. 0772123456).';
    if (!stage) next.stage = 'Please select where you are in the journey.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const localPhone = phone.replace(/\s+/g, '').trim().replace(/^0/, '');
      await submitStoreRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: `+256${localPhone}`,
        stage: (stage && stage !== 'not_a_mum') ? stage : undefined,
        itemDescription: itemDescription.trim() || undefined,
      });
      setShowSuccess(true);
    } catch (err) {
      console.error('Failed to submit store request:', err);
      setToastMsg(err instanceof Error ? err.message : 'Failed to submit your request. Please try again.');
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={`store-request-overlay ${active ? 'is-active' : ''}`} onClick={onClose}>
        <div
          className={`store-request-modal ${active ? 'is-active' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="store-request-modal__header">
            {showSuccess ? (
              <Text role="headline-md" as="h3" className="store-request-modal__title">Request Sent</Text>
            ) : (
              <img
                src="/assets/coming%20soon.png"
                alt="Can't find what you're looking for?"
                className="store-request-banner"
              />
            )}
            <Button
              variant="ghost"
              className="store-request-modal__close"
              onClick={onClose}
              aria-label="Close modal"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12" /></svg>}
            />
          </div>

          <div className="store-request-modal__content">
            {showSuccess ? (
              <div className="store-request-modal__success animate-fadeIn">
                <div className="success-icon-wrap">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <Text role="title-lg" as="h4" color="primary">We're on it!</Text>
                <Text role="body-md" as="p" color="secondary" className="success-desc">
                  Our team will check availability at the physical store and reach out to you shortly.
                </Text>
                <div className="success-actions">
                  <Button variant="primary" fullWidth onClick={onClose}>Done</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="store-request-form animate-fadeIn">
                <Text role="body-md" as="p" color="secondary" className="store-request-subtitle">
                  We might have what you're looking for at our physical shops. Add your details below
                  and we'll talk to you.
                </Text>

                <div className="store-request-field">
                  <span className="store-request-label store-request-prompt">Where are you in the journey?</span>
                  <div className="stage-options">
                    {STAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`stage-chip ${stage === opt.value ? 'active' : ''}`}
                        onClick={() => setStage(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {errors.stage && <Text role="label-sm" color="support-red" className="form-error-hint">{errors.stage}</Text>}
                </div>

                <div className="store-request-row">
                  <div className="store-request-field">
                    <label htmlFor="storeRequestFirstName" className="store-request-label">First Name</label>
                    <input
                      id="storeRequestFirstName"
                      type="text"
                      placeholder="e.g. Sarah"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="store-request-input"
                      autoComplete="given-name"
                    />
                    {errors.firstName && <Text role="label-sm" color="support-red" className="form-error-hint">{errors.firstName}</Text>}
                  </div>
                  <div className="store-request-field">
                    <label htmlFor="storeRequestLastName" className="store-request-label">Last Name</label>
                    <input
                      id="storeRequestLastName"
                      type="text"
                      placeholder="e.g. Nakato"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="store-request-input"
                      autoComplete="family-name"
                    />
                    {errors.lastName && <Text role="label-sm" color="support-red" className="form-error-hint">{errors.lastName}</Text>}
                  </div>
                </div>

                <div className="store-request-field">
                  <label htmlFor="storeRequestEmail" className="store-request-label">Email Address</label>
                  <input
                    id="storeRequestEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="store-request-input"
                    autoComplete="email"
                  />
                  {errors.email && <Text role="label-sm" color="support-red" className="form-error-hint">{errors.email}</Text>}
                </div>

                <div className="store-request-field">
                  <label htmlFor="storeRequestPhone" className="store-request-label">WhatsApp / Phone Number</label>
                  <div className={`store-request-phone-wrap ${errors.phone ? 'has-error' : ''}`}>
                    <span className="store-request-phone-prefix">+256</span>
                    <input
                      id="storeRequestPhone"
                      type="tel"
                      placeholder="772 123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="store-request-input"
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone && <Text role="label-sm" color="support-red" className="form-error-hint">{errors.phone}</Text>}
                </div>

                <div className="store-request-field">
                  <label htmlFor="storeRequestItem" className="store-request-label">Item You're Looking For (Optional)</label>
                  <textarea
                    id="storeRequestItem"
                    placeholder="e.g. Closer to Nature baby bottles, size 3-6 months swaddles..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="store-request-textarea"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="store-request-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send  Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Toast
        isOpen={toastOpen}
        message={toastMsg}
        variant="danger"
        onClose={() => setToastOpen(false)}
      />
    </>
  );
};

export default StoreRequestModal;
