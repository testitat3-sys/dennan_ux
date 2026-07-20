import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import Page from '../ui/Page';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import OfferCountdownBanner from './OfferCountdownBanner';
import { useLeadCapture } from '../../context/LeadCaptureContext';
import {
  STAGE_OPTIONS,
  validateNotifySignup,
} from '../../utils/notifySignup';
import './LaunchGate.css';

const LaunchGate = () => {
  const submitNotifySignup = useMutation(api.registry.submitNotifySignup);
  const { markLeadCaptured } = useLeadCapture();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [revealStep, setRevealStep] = useState(0);

  const showName = revealStep >= 1;
  const showEmail = revealStep >= 2;
  const showPhone = revealStep >= 3;
  const showSubmit = revealStep >= 4;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validateNotifySignup({ firstName, lastName, email, phone, stage });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const localPhone = phone.replace(/\s+/g, '').trim().replace(/^0/, '');
      await submitNotifySignup({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `+256${localPhone}`,
        stage,
        source: 'launch',
      });
      markLeadCaptured();
    } catch (err) {
      console.error('[LaunchGate] submitNotifySignup error:', err);
      setToastMsg('Failed to save your details. Please try again.');
      setToastOpen(true);
      setLoading(false);
    }
  };

  return (
    <div className="launch-gate">
      <Page.Section as="section" fullBleed className="launch-gate__band launch-gate__band--hero">
        <img
          className="launch-gate__hero-image"
          src="/assets/launch_offers_2.png"
          alt="Launch Offers"
        />
      </Page.Section>

      <Page.Section as="section" fullBleed id="launch-gate-form" className="launch-gate__band launch-gate__band--form">
        <OfferCountdownBanner />
        <div className="launch-gate__inner">
          <h2 className="launch-gate__headline launch-gate__headline--form">Save up to UGX 190,000</h2>
          <p className="launch-gate__subtext">
            Create your Dennan account to claim your discount.
          </p>

          <form className="launch-gate__form" onSubmit={handleSubmit} noValidate>
            <div className="launch-gate__field">
              <span className="launch-gate__label launch-gate__prompt">Choose where you are in your journey</span>
              <div className="stage-options">
                {STAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`stage-chip ${stage === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setStage(opt.value);
                      setRevealStep((s) => Math.max(s, 1));
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.stage && <span className="launch-gate__error">{errors.stage}</span>}
            </div>

            <div className={`launch-gate__field-row ${showName ? 'is-revealed' : 'is-hidden'}`} aria-hidden={!showName}>
              <div className="launch-gate__field">
                <label className="launch-gate__label" htmlFor="launch-fn">First Name</label>
                <input
                  id="launch-fn"
                  className="launch-gate__input"
                  type="text"
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onFocus={() => setRevealStep((s) => Math.max(s, 2))}
                  autoComplete="given-name"
                  tabIndex={showName ? 0 : -1}
                />
                {errors.firstName && <span className="launch-gate__error">{errors.firstName}</span>}
              </div>
              <div className="launch-gate__field">
                <label className="launch-gate__label" htmlFor="launch-ln">Last Name</label>
                <input
                  id="launch-ln"
                  className="launch-gate__input"
                  type="text"
                  placeholder="e.g. Nakato"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onFocus={() => setRevealStep((s) => Math.max(s, 2))}
                  autoComplete="family-name"
                  tabIndex={showName ? 0 : -1}
                />
                {errors.lastName && <span className="launch-gate__error">{errors.lastName}</span>}
              </div>
            </div>

            <div className={`launch-gate__field ${showEmail ? 'is-revealed' : 'is-hidden'}`} aria-hidden={!showEmail}>
              <label className="launch-gate__label" htmlFor="launch-em">Email</label>
              <input
                id="launch-em"
                className="launch-gate__input"
                type="email"
                placeholder="e.g. sarah@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setRevealStep((s) => Math.max(s, 3))}
                autoComplete="email"
                tabIndex={showEmail ? 0 : -1}
              />
              {errors.email && <span className="launch-gate__error">{errors.email}</span>}
            </div>

            <div className={`launch-gate__field ${showPhone ? 'is-revealed' : 'is-hidden'}`} aria-hidden={!showPhone}>
              <label className="launch-gate__label" htmlFor="launch-ph">WhatsApp / Phone Number</label>
              <div className={`launch-gate__phone-wrap ${errors.phone ? 'has-error' : ''}`}>
                <span className="launch-gate__phone-prefix">+256</span>
                <input
                  id="launch-ph"
                  className="launch-gate__input"
                  type="tel"
                  placeholder="772 123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setRevealStep((s) => Math.max(s, 4))}
                  autoComplete="tel"
                  tabIndex={showPhone ? 0 : -1}
                />
              </div>
              {errors.phone && <span className="launch-gate__error">{errors.phone}</span>}
            </div>

            <div className={showSubmit ? 'is-revealed' : 'is-hidden'} aria-hidden={!showSubmit}>
              <Button
                type="submit"
                variant="white-active"
                fullWidth
                disabled={loading}
                loading={loading}
                tabIndex={showSubmit ? 0 : -1}
              >
                Unlock offers
              </Button>
            </div>
          </form>
        </div>
      </Page.Section>

      <Toast
        isOpen={toastOpen}
        message={toastMsg}
        variant="danger"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
};

export default LaunchGate;
