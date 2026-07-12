import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import Page from '../ui/Page';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import { useLeadCapture } from '../../context/LeadCaptureContext';
import { STAGE_OPTIONS, validateNotifySignup } from '../../utils/notifySignup';
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

  const scrollToForm = () => {
    document.getElementById('launch-gate-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validateNotifySignup({ firstName, lastName, email, phone, stage });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await submitNotifySignup({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
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
        <div className="launch-gate__inner">
          <h1 className="launch-gate__headline">
            Save up to <span className="launch-gate__accent">UGX 190,000</span>
          </h1>
          <p className="launch-gate__subtext">
            Create your Dennan account, build your registry, and unlock discounts across every category — before launch.
          </p>
          <div className="launch-gate__cta-row">
            <Button variant="primary" onClick={scrollToForm}>See Offers</Button>
            <Button variant="outline" to="/">Back to home</Button>
          </div>
        </div>
      </Page.Section>

      <Page.Section as="section" fullBleed id="launch-gate-form" className="launch-gate__band launch-gate__band--form">
        <div className="launch-gate__inner">
          <h2 className="launch-gate__headline launch-gate__headline--form">Create your Dennan account</h2>
          <p className="launch-gate__subtext">
            Takes under a minute — we'll email your discount codes the moment offers go live.
          </p>

          <form className="launch-gate__form" onSubmit={handleSubmit} noValidate>
            <div className="launch-gate__field-row">
              <div className="launch-gate__field">
                <label className="launch-gate__label" htmlFor="launch-fn">First Name</label>
                <input
                  id="launch-fn"
                  className="launch-gate__input"
                  type="text"
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
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
                  autoComplete="family-name"
                />
                {errors.lastName && <span className="launch-gate__error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="launch-gate__field">
              <label className="launch-gate__label" htmlFor="launch-em">Email</label>
              <input
                id="launch-em"
                className="launch-gate__input"
                type="email"
                placeholder="e.g. sarah@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {errors.email && <span className="launch-gate__error">{errors.email}</span>}
            </div>

            <div className="launch-gate__field">
              <label className="launch-gate__label" htmlFor="launch-ph">Phone Number</label>
              <input
                id="launch-ph"
                className="launch-gate__input"
                type="tel"
                placeholder="e.g. 0772 123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              {errors.phone && <span className="launch-gate__error">{errors.phone}</span>}
            </div>

            <div className="launch-gate__field">
              <label className="launch-gate__label" htmlFor="launch-st">Stage</label>
              <select
                id="launch-st"
                className="launch-gate__input"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="" disabled>Select your stage</option>
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.stage && <span className="launch-gate__error">{errors.stage}</span>}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              loading={loading}
            >
              Unlock offers
            </Button>
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
