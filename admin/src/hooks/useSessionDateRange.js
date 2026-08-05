import { useState, useCallback } from "react";

/**
 * Custom hook that syncs React state with sessionStorage for persistence across tab switches / navigation.
 *
 * @param {string} key - Unique key in sessionStorage
 * @param {any|Function} defaultValue - Default value if key is not found in sessionStorage
 * @returns {[any, Function]} [state, setState]
 */
export function useSessionState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load session state for", key, e);
    }
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  });

  const setSessionState = useCallback(
    (newValue) => {
      setState((prev) => {
        const valToStore = typeof newValue === "function" ? newValue(prev) : newValue;
        try {
          sessionStorage.setItem(key, JSON.stringify(valToStore));
        } catch (e) {
          console.warn("Failed to save session state for", key, e);
        }
        return valToStore;
      });
    },
    [key]
  );

  return [state, setSessionState];
}
