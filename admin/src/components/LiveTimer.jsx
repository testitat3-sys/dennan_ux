import React from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useElapsedSeconds } from "../hooks/useLiveTimer";

// `label` prefixes the ticking mm:ss readout, e.g. "Waiting" / "Packing".
export default function LiveTimer({ sinceTimestamp, label, warningThresholdSeconds }) {
  const { formatted, isWarning } = useElapsedSeconds(sinceTimestamp, warningThresholdSeconds);
  if (!sinceTimestamp) return null;

  const Icon = isWarning ? AlertCircle : Clock;

  return (
    <span className={`live-timer${isWarning ? " live-timer--warning" : ""}`}>
      <Icon size={12} />
      {label}: {formatted}
    </span>
  );
}
