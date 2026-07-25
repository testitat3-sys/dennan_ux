import { initClarity, identifyUser as identifyClarityUser, trackTag as trackClarityTag, trackEvent as trackClarityEvent } from './clarity';
import { initGoogleAnalytics, identifyUser as identifyGAUser, trackEvent as trackGAEvent } from './googleAnalytics';

/**
 * Initialize all configured tracking services (Clarity & GA4).
 */
export function initAnalytics() {
  initClarity();
  initGoogleAnalytics();
}

/**
 * Identify user across all tracking integrations simultaneously.
 * @param {string} customId Unique user ID or phone number
 * @param {string} [friendlyName] Optional user display name
 */
export function identifyUser(customId, friendlyName = '') {
  identifyClarityUser(customId, friendlyName);
  identifyGAUser(customId, friendlyName);
}

/**
 * Track custom user event across all tracking integrations simultaneously.
 * @param {string} eventName Event name (e.g., 'added_to_cart', 'checkout_completed', 'whatsapp_click')
 * @param {Object} [params] Optional parameters for GA4
 */
export function trackEvent(eventName, params = {}) {
  trackClarityEvent(eventName);
  trackGAEvent(eventName, params);
}

/**
 * Set custom tag in Microsoft Clarity.
 * @param {string} key
 * @param {string|number|boolean} value
 */
export function trackTag(key, value) {
  trackClarityTag(key, value);
}

export default {
  initAnalytics,
  identifyUser,
  trackEvent,
  trackTag,
};
