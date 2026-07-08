import { useEffect, useState } from "react";

function formatMmSs(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Client-side ticking elapsed-time hook. Purely presentational — no Convex calls.
// `warningThresholdSeconds` flips `isWarning` once elapsed time exceeds it.
export function useElapsedSeconds(sinceTimestamp, warningThresholdSeconds) {
  const [seconds, setSeconds] = useState(() =>
    sinceTimestamp ? Math.max(0, Math.floor((Date.now() - sinceTimestamp) / 1000)) : 0
  );

  useEffect(() => {
    if (!sinceTimestamp) return;
    setSeconds(Math.max(0, Math.floor((Date.now() - sinceTimestamp) / 1000)));
    const interval = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - sinceTimestamp) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [sinceTimestamp]);

  return {
    seconds,
    formatted: formatMmSs(seconds),
    isWarning: warningThresholdSeconds != null && seconds > warningThresholdSeconds,
  };
}
