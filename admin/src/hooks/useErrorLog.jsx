import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStaffAuth } from "./useStaffAuth";
import { useToast } from "./useToast";
import Toast from "../components/Toast";
import { getSuggestion } from "../utils/errorSuggestions";

const ErrorLogContext = createContext(null);

const MAX_LOCAL_ENTRIES = 50;
const MUTATION_THROTTLE_MS = 10000;

// Simple, deterministic string hash — good enough to de-dupe error fingerprints,
// no cryptographic properties needed here.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function ErrorLogProvider({ children }) {
  const { token } = useStaffAuth();
  const { toasts, showToast, dismissToast } = useToast();
  const logErrorMutation = useMutation(api.errorLogs.logError);

  const [entries, setEntries] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const lastSentAtRef = useRef({});

  const logError = useCallback((error, options = {}) => {
    const message = (error && error.message) || String(error) || "Unknown error";
    const source = options.source || "unknown";
    const fingerprint = hashString(`${source}:${message}`);
    const suggestion = options.suggestion || getSuggestion(message);
    const details = (error && error.stack) || undefined;

    setEntries((prev) => {
      const existingIdx = prev.findIndex((e) => e.fingerprint === fingerprint);
      const now = Date.now();
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], occurrenceCount: next[existingIdx].occurrenceCount + 1, lastSeenAt: now };
        return next;
      }
      const entry = {
        id: `${fingerprint}-${now}`,
        fingerprint,
        message,
        details,
        suggestion,
        source,
        occurrenceCount: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      };
      return [entry, ...prev].slice(0, MAX_LOCAL_ENTRIES);
    });
    setUnseenCount((prev) => prev + 1);
    showToast(message.length > 120 ? message.slice(0, 120) + "…" : message, "error");

    const now = Date.now();
    const lastSent = lastSentAtRef.current[fingerprint] || 0;
    if (now - lastSent > MUTATION_THROTTLE_MS) {
      lastSentAtRef.current[fingerprint] = now;
      logErrorMutation({
        token: token || undefined,
        fingerprint,
        message,
        details,
        suggestion,
        source,
      }).catch(() => {
        // Best-effort — never let logging itself surface a new error.
      });
    }
  }, [token, logErrorMutation, showToast]);

  useEffect(() => {
    const handleRejection = (event) => {
      logError(event.reason, { source: "unhandledrejection" });
    };
    const handleError = (event) => {
      logError(event.error || event.message, { source: "window.onerror" });
    };
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, [logError]);

  const markSeen = useCallback(() => setUnseenCount(0), []);
  const clearAll = useCallback(() => {
    setEntries([]);
    setUnseenCount(0);
  }, []);
  const dismissEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <ErrorLogContext.Provider value={{ entries, unseenCount, logError, markSeen, clearAll, dismissEntry }}>
      {children}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </ErrorLogContext.Provider>
  );
}

export function useErrorLog() {
  const context = useContext(ErrorLogContext);
  if (!context) {
    throw new Error("useErrorLog must be used within an ErrorLogProvider");
  }
  return context;
}
