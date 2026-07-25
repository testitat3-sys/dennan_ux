import Clarity from '@microsoft/clarity';

const PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || 'x6gplhstk6';
const IS_DEV = import.meta.env.DEV;

let isInitialized = false;

/**
 * Initialize Microsoft Clarity tracking script.
 * In development mode, network calls are suppressed and replaced with console logs.
 */
export function initClarity() {
  if (isInitialized) return;

  if (IS_DEV) {
    console.log(`[Clarity] Development mode active - Tracking disabled. (Project ID: ${PROJECT_ID})`);
    isInitialized = true;
    return;
  }

  if (PROJECT_ID) {
    try {
      Clarity.init(PROJECT_ID);
      isInitialized = true;
      console.log(`[Clarity] Initialized with Project ID: ${PROJECT_ID}`);
    } catch (err) {
      console.error('[Clarity] Initialization error:', err);
    }
  } else {
    console.warn('[Clarity] Missing VITE_CLARITY_PROJECT_ID configuration.');
  }
}

/**
 * Identify user session in Microsoft Clarity.
 * @param {string} customId Unique user ID or phone number
 * @param {string} [friendlyName] Human-readable user name
 */
export function identifyUser(customId, friendlyName = '') {
  if (!customId) return;

  if (IS_DEV) {
    console.log('[Clarity] (DEV) identifyUser:', { customId, friendlyName });
    return;
  }

  try {
    Clarity.identify(String(customId), undefined, undefined, friendlyName);
  } catch (err) {
    console.error('[Clarity] identifyUser error:', err);
  }
}

/**
 * Set custom tag in Microsoft Clarity.
 * @param {string} key
 * @param {string|number|boolean} value
 */
export function trackTag(key, value) {
  if (!key) return;

  if (IS_DEV) {
    console.log('[Clarity] (DEV) trackTag:', { key, value });
    return;
  }

  try {
    Clarity.setTag(key, String(value));
  } catch (err) {
    console.error('[Clarity] trackTag error:', err);
  }
}

/**
 * Track custom event in Microsoft Clarity.
 * @param {string} eventName
 */
export function trackEvent(eventName) {
  if (!eventName) return;

  if (IS_DEV) {
    console.log('[Clarity] (DEV) trackEvent:', eventName);
    return;
  }

  try {
    Clarity.event(eventName);
  } catch (err) {
    console.error('[Clarity] trackEvent error:', err);
  }
}

export default {
  initClarity,
  identifyUser,
  trackTag,
  trackEvent,
};
