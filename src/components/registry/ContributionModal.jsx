import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, UserRound, EyeOff } from 'lucide-react';
import Button from '../ui/Button';
import Text from '../ui/Text';
import './ContributionModal.css';

const MIN_AMOUNT = 5000;
const MAX_AMOUNT = 500000;

const ContributionModal = ({ item, registryId, isOpen, onClose, onSuccess }) => {
  const addContribution = useMutation(api.registry.addContribution);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  // Mobile Money fields
  const [momoPhone, setMomoPhone] = useState('');
  const [isValidPhone, setIsValidPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [loading, setLoading] = useState(false);

  // Modal animation
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const t = setTimeout(() => setIsActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(t);
    } else {
      setIsActive(false);
      const t = setTimeout(() => {
        setIsMounted(false);
        // Reset form
        setName('');
        setAmount('');
        setAmountError('');
        setMomoPhone('');
        setIsValidPhone(false);
        setPhoneError('');
        setIsAnonymous(false);
      }, 300);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Derived values ──────────────────────────────────────────────────────
  const totalContributed = (item?.contributions || []).reduce(
    (acc, c) => acc + c.amount, 0
  );
  const remaining = item ? Math.max(0, item.price - totalContributed) : 0;
  const progressPercent = item ? Math.min(
    Math.round((totalContributed / item.price) * 100) || 0, 100
  ) : 0;

  // ── Validation ──────────────────────────────────────────────────────────
  const validateAmount = (val) => {
    const num = parseFloat(val);
    if (!val || isNaN(num)) return '';
    if (num < MIN_AMOUNT) return `Minimum contribution is UGX ${MIN_AMOUNT.toLocaleString()}`;
    if (num > MAX_AMOUNT) return `Maximum contribution is UGX ${MAX_AMOUNT.toLocaleString()}`;
    if (num > remaining) return `Amount exceeds the remaining UGX ${remaining.toLocaleString()}`;
    return '';
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    setAmountError(validateAmount(e.target.value));
  };

  // Ugandan Mobile Money phone validation
  useEffect(() => {
    const cleanNum = momoPhone.replace(/\s+/g, '');
    if (!cleanNum) {
      setIsValidPhone(false);
      setPhoneError('Please enter your mobile money number.');
      return;
    }

    // RegEx checking for valid MTN/Airtel Uganda mobile ranges
    const isValidUG = /^(77|78|76|70|75|74)\d{7}$/.test(cleanNum);
    if (isValidUG) {
      setIsValidPhone(true);
      setPhoneError('');
    } else {
      setIsValidPhone(false);
      setPhoneError('Must start with 77, 78, 76 (MTN) or 70, 75, 74 (Airtel), followed by 7 digits.');
    }
  }, [momoPhone]);

  if (!isMounted || !item) return null;

  const isFormValid = () => {
    const num = parseFloat(amount);
    const amtOk = !isNaN(num) && num >= MIN_AMOUNT && num <= MAX_AMOUNT && num <= remaining;
    const nameOk = isAnonymous || name.trim().length > 0;
    const paymentOk = isValidPhone;
    return amtOk && nameOk && paymentOk;
  };

  const handleConfirm = async () => {
    if (!isFormValid()) return;
    setLoading(true);
    try {
      await addContribution({
        registryId,
        productId: item.productId,
        contributorName: isAnonymous ? 'Anonymous' : name.trim(),
        amount: parseFloat(amount),
      });
      onSuccess && onSuccess(item, parseFloat(amount));
      onClose();
    } catch (err) {
      console.error('[ContributionModal] addContribution error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`contribution-overlay${isActive ? ' is-open' : ''}`}
      onClick={onClose}
    >
      <div
        className="contribution-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="contribution-inner">

          {/* Header */}
          <div className="contribution-modal-top">
            <div>
              <span className="contribution-eyebrow">Contribute</span>
              <h2 className="contribution-headline">Gift to this registry</h2>
            </div>
            <button className="contribution-close" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Item Summary */}
          <div className="contribution-item-row">
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="contribution-item-thumb"
              />
            )}
            <div className="contribution-item-info">
              <span className="contribution-item-name">{item.name}</span>
              <span className="contribution-item-price">
                UGX {item.price.toLocaleString()}
              </span>
              {item.isGroupGifting && (
                <div className="contribution-mini-progress">
                  <div className="contribution-mini-track">
                    <div
                      className="contribution-mini-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="contribution-mini-label">
                    UGX {totalContributed.toLocaleString()} raised of UGX {item.price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div className="anon-toggle">
            <button
              type="button"
              className={`anon-pill${!isAnonymous ? ' is-active' : ''}`}
              onClick={() => setIsAnonymous(false)}
            >
              <UserRound size={14} strokeWidth={1.8} />
              Enter my name
            </button>
            <button
              type="button"
              className={`anon-pill${isAnonymous ? ' is-active' : ''}`}
              onClick={() => setIsAnonymous(true)}
            >
              <EyeOff size={14} strokeWidth={1.8} />
              Stay anonymous
            </button>
          </div>

          {/* Name field */}
          {!isAnonymous && (
            <div className="contribution-field">
              <label className="contribution-label">Your Name</label>
              <input
                className="contribution-input"
                type="text"
                placeholder="e.g. Grandma Betty"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          {/* Amount field */}
          <div className="contribution-field">
            <label className="contribution-label">
              Amount (UGX) — Min 5,000 / Max 500,000
            </label>
            <input
              className="contribution-input"
              type="number"
              placeholder="Enter amount"
              min={MIN_AMOUNT}
              max={Math.min(MAX_AMOUNT, remaining)}
              value={amount}
              onChange={handleAmountChange}
            />
            {amountError && (
              <span className="contribution-input-error">{amountError}</span>
            )}
          </div>

          {/* Payment Details */}
          <div className="payment-section">
            <Text role="title-sm" as="p" color="primary" className="payment-section-title">
              Payment Method
            </Text>

            <div className="momo-payment-card is-active">
              {/* Option Panel Header */}
              <div className="momo-card-header">
                <div className="option-radio checked">
                  <div className="radio-inner"></div>
                </div>
                <div className="momo-card-info">
                  <Text role="title-sm" as="span" color="primary" className="option-name">
                    Ugandan Mobile Money
                  </Text>
                  <Text role="body-sm" as="span" color="secondary" className="option-desc">
                    Pay instantly using MTN MoMo or Airtel Money.
                  </Text>
                </div>
                <div className="option-brand-icons">
                  <Text role="label-sm" as="span" className="brand-badge brand-badge--mtn">
                    MTN
                  </Text>
                  <Text role="label-sm" as="span" className="brand-badge brand-badge--airtel">
                    Airtel
                  </Text>
                </div>
              </div>

              {/* Phone Number Field */}
              <div className="momo-input-wrapper-card">
                <Text role="label-md" as="label" color="secondary" className="momo-label">
                  Phone Number
                </Text>
                <div className="momo-input-wrapper">
                  <div className="momo-prefix">
                    <Text role="body-lg" as="span" className="ug-flag">🇺🇬</Text>
                    <Text role="body-lg" as="span" color="primary">+256</Text>
                  </div>
                  <input
                    type="tel"
                    className={`momo-input ${momoPhone ? (isValidPhone ? 'is-valid' : 'is-invalid') : ''}`}
                    placeholder="772 123456"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value.replace(/[^0-9\s]/g, ''))}
                  />
                </div>
                {phoneError && (
                  <Text role="label-md" as="p" color="support-red" className="momo-error-text">
                    {phoneError}
                  </Text>
                )}
                <Text role="label-sm" as="p" color="tertiary" className="momo-helper-text">
                  We will push a secure PIN prompt to this number to approve the transaction.
                </Text>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="contribution-cta">
            <Button
              variant="primary"
              fullWidth
              disabled={!isFormValid() || loading}
              loading={loading}
              onClick={handleConfirm}
            >
              Confirm Contribution
            </Button>
          </div>

          <p className="contribution-disclaimer">
            Contributions are non-refundable and go directly toward this gift item.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ContributionModal;
