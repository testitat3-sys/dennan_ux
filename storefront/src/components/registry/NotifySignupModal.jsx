import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import { STAGE_OPTIONS, splitName, mapUserStage, validateNotifySignup } from '../../utils/notifySignup';
import './NotifySignupModal.css';

const NotifySignupModal = ({
  isOpen,
  onClose,
  onSuccess,
  convexUser,
  source = 'registry_coming_soon',
  specifications,
  title = 'Get notified at launch',
  subtext = "Leave your details and we'll email you the moment the Registry is ready.",
  buttonLabel = 'Notify Me',
}) => {
  const submitNotifySignup = useMutation(api.registry.submitNotifySignup);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const t = setTimeout(() => setIsActive(true), 10);
      document.body.style.overflow = 'hidden';

      // Pre-fill from known user details when available
      if (convexUser && !hasPrefilled) {
        const { firstName: fn, lastName: ln } = splitName(convexUser.name);
        setEmail(prev => prev || convexUser.email || '');
        setFirstName(prev => prev || fn);
        setLastName(prev => prev || ln);
        setPhone(prev => prev || convexUser.phone || convexUser.momoPhone || '');
        setStage(prev => prev || mapUserStage(convexUser.stage));
        setErrors({});
        setHasPrefilled(true);
      }

      return () => clearTimeout(t);
    } else {
      setIsActive(false);
      const t = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      document.body.style.overflow = '';
      setHasPrefilled(false); // reset on close
      return () => clearTimeout(t);
    }
  }, [isOpen, convexUser, hasPrefilled]);

  if (!isMounted) return null;

  const validate = () => {
    const next = validateNotifySignup({ firstName, lastName, email, phone, stage });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await submitNotifySignup({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        stage,
        source,
        specifications,
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('[NotifySignupModal] submitNotifySignup error:', err);
      setToastMsg('Failed to save your details. Please try again.');
      setToastOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`notify-signup-overlay${isActive ? ' is-open' : ''}`}
      onClick={onClose}
    >
      <div
        className={`notify-signup-modal notify-signup-modal--${source}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notify-signup-inner">

          {/* Header */}
          <div className="notify-signup-top">
            <div className="notify-signup-titles">
              <span className="notify-signup-eyebrow">Registry</span>
              <h2 className="notify-signup-headline">{title}</h2>
              <p className="notify-signup-subtext">
                {subtext}
              </p>
            </div>
            <button
              className="notify-signup-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form fields */}
          <div className="notify-signup-field">
            <label className="notify-signup-label">First Name</label>
            <input
              className="notify-signup-input"
              type="text"
              placeholder="e.g. Sarah"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            {errors.firstName && (
              <span className="notify-signup-input-error">{errors.firstName}</span>
            )}
          </div>

          <div className="notify-signup-field">
            <label className="notify-signup-label">Last Name</label>
            <input
              className="notify-signup-input"
              type="text"
              placeholder="e.g. Nakato"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
            {errors.lastName && (
              <span className="notify-signup-input-error">{errors.lastName}</span>
            )}
          </div>

          <div className="notify-signup-field">
            <label className="notify-signup-label">Email</label>
            <input
              className="notify-signup-input"
              type="email"
              placeholder="e.g. sarah@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {errors.email && (
              <span className="notify-signup-input-error">{errors.email}</span>
            )}
          </div>

          <div className="notify-signup-field">
            <label className="notify-signup-label">Phone Number</label>
            <input
              className="notify-signup-input"
              type="tel"
              placeholder="e.g. 0772 123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            {errors.phone && (
              <span className="notify-signup-input-error">{errors.phone}</span>
            )}
          </div>

          <div className="notify-signup-field">
            <label className="notify-signup-label">Stage</label>
            <select
              className="notify-signup-input"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="" disabled>Select your stage</option>
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.stage && (
              <span className="notify-signup-input-error">{errors.stage}</span>
            )}
          </div>

          {/* CTA */}
          <div className="notify-signup-actions">
            <Button
              variant="primary"
              fullWidth
              disabled={loading}
              loading={loading}
              onClick={handleConfirm}
            >
              {buttonLabel}
            </Button>
          </div>

          <Toast
            isOpen={toastOpen}
            message={toastMsg}
            variant="danger"
            onClose={() => setToastOpen(false)}
          />

        </div>
      </div>
    </div>
  );
};

export default NotifySignupModal;
