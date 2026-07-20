export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const STAGE_OPTIONS = [
  { value: 'expectant', label: 'Expectant Mother' },
  { value: 'newborn', label: 'Newborn Parent' },
  { value: 'toddler', label: 'Toddler Parent' },
  { value: 'not_a_mother', label: 'Not a Parent Yet' },
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
export const isValidPhone = (v) => !!v.trim();
export const isValidStage = (v) => !!v;

export const validateNotifySignup = ({ firstName, lastName, email, phone, stage }) => {
  const next = {};
  if (!firstName.trim()) next.firstName = 'First name is required.';
  if (!lastName.trim()) next.lastName = 'Last name is required.';
  if (!email.trim()) next.email = 'Email is required.';
  else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
  if (!phone.trim()) next.phone = 'Phone number is required.';
  if (!stage) next.stage = 'Please select your stage.';
  return next;
};
