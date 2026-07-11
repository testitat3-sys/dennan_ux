import React from "react";
import { AlertTriangle } from "lucide-react";
import { useErrorLog } from "../hooks/useErrorLog";

// Class component required for componentDidCatch — no hooks equivalent exists.
// logError is passed in as a prop by the function-component wrapper below so
// this can still reach the ErrorLogProvider's context.
class AppErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    this.props.logError(error, { source: `render:${this.props.name || "unknown"}` });
    if (info && info.componentStack && error && !error.stack) {
      error.stack = info.componentStack;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-3)" }}>
          <AlertTriangle size={32} style={{ color: "#ef4444" }} />
          <div className="empty-title">Something went wrong loading this page.</div>
          <div className="empty-sub">The error has been logged. Try reloading the page.</div>
          <button className="btn btn--secondary btn--sm" onClick={() => window.location.reload()} type="button">
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppErrorBoundary({ children, name }) {
  const { logError } = useErrorLog();
  return (
    <AppErrorBoundaryInner logError={logError} name={name}>
      {children}
    </AppErrorBoundaryInner>
  );
}
