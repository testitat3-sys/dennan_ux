export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UG_PHONE_RE = /^(?:\+?2560?|0)?7\d{8}$/;

export const STAGE_OPTIONS = [
  { value: 'expectant', label: 'Expectant Mother' },
  { value: 'newborn', label: 'Newborn Parent' },
  { value: 'toddler', label: 'Toddler Parent' },
  { value: 'not_a_mother', label: 'Not a Mom' },
];

export const splitName = (name) => {
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

// Maps the app-wide user stage (mother/newborn/kid) to this form's options
export const mapUserStage = (userStage) => {
  if (userStage === 'mother') return 'expectant';
  if (userStage === 'newborn') return 'newborn';
  if (userStage === 'kid') return 'toddler';
  return '';
};

export const isValidName = (v) => !!v.trim();
export const isValidEmail = (v) => EMAIL_RE.test(v.trim());
export const isValidPhone = (v) => {
  if (!v) return false;
  const cleaned = v.replace(/[\s\-\(\)]/g, '').trim();
  return UG_PHONE_RE.test(cleaned);
};
export const isValidStage = (v) => !!v;

export const normalizeUgPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
  const match = cleaned.match(/^(?:\+?2560?|0)?(7\d{8})$/);
  if (match) {
    return `+256${match[1]}`;
  }
  return cleaned;
};

export const validateNotifySignup = ({ firstName, lastName, email, phone, stage }) => {
  const next = {};
  if (!firstName.trim()) next.firstName = 'First name is required.';
  if (!lastName.trim()) next.lastName = 'Last name is required.';
  if (!email.trim()) next.email = 'Email is required.';
  else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
  const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '').trim();
  if (!cleanedPhone) next.phone = 'Phone number is required.';
  else if (!UG_PHONE_RE.test(cleanedPhone)) next.phone = 'Enter a valid Ugandan phone number (e.g. 0772123456).';
  if (!stage) next.stage = 'Please select your stage.';
  return next;
};
