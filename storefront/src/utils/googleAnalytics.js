const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || 'G-2DQNB6X3XR';
const IS_DEV = import.meta.env.DEV;

let isInitialized = false;

/**
 * Initialize Google Analytics 4 (GA4) via dynamic script injection.
 * In development mode, network requests are bypassed in favor of console logs.
 */
export function initGoogleAnalytics() {
  if (isInitialized) return;

  if (IS_DEV) {
    console.log(`[GA4] Development mode active - Tracking disabled. (Measurement ID: ${GA_TRACKING_ID})`);
    isInitialized = true;
    return;
  }

  if (!GA_TRACKING_ID) {
    console.warn('[GA4] Missing VITE_GA_TRACKING_ID configuration.');
    return;
  }

  try {
    // 1. Inject google tag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    document.head.appendChild(script);

    // 2. Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_TRACKING_ID);

    isInitialized = true;
    console.log(`[GA4] Initialized with Measurement ID: ${GA_TRACKING_ID}`);
  } catch (err) {
    console.error('[GA4] Initialization error:', err);
  }
}

/**
 * Send user identification and user properties to GA4.
 * @param {string} customId Unique user ID or identifier
 * @param {string} [friendlyName] Optional display name
 */
export function identifyUser(customId, friendlyName = '') {
  if (!customId) return;

  if (IS_DEV) {
    console.log('[GA4] (DEV) identifyUser:', { customId, friendlyName });
    return;
  }

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('set', 'user_properties', {
        user_id: String(customId),
        friendly_name: friendlyName,
      });
      window.gtag('config', GA_TRACKING_ID, {
        user_id: String(customId),
      });
    } catch (err) {
      console.error('[GA4] identifyUser error:', err);
    }
  }
}

/**
 * Track custom events in GA4.
 * @param {string} eventName Name of the event (e.g. 'added_to_cart', 'checkout_completed')
 * @param {Object} [params] Optional event parameters
 */
export function trackEvent(eventName, params = {}) {
  if (!eventName) return;

  if (IS_DEV) {
    console.log('[GA4] (DEV) trackEvent:', eventName, params);
    return;
  }

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch (err) {
      console.error('[GA4] trackEvent error:', err);
    }
  }
}

export default {
  initGoogleAnalytics,
  identifyUser,
  trackEvent,
};
