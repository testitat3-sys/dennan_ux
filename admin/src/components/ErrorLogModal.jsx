import React from "react";
import { X, Trash2 } from "lucide-react";
import { useErrorLog } from "../hooks/useErrorLog";

export default function ErrorLogModal({ onClose }) {
  const { entries, clearAll, dismissEntry } = useErrorLog();

  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className="modal error-log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Error Log</h2>
            <span className="modal-subtitle">{entries.length} error{entries.length === 1 ? "" : "s"} this session</span>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No errors logged.</div>
          </div>
        ) : (
          <div className="error-log-list">
            {entries.map((entry) => (
              <div key={entry.id} className="error-log-entry">
                <div className="error-log-entry-header">
                  <span className="error-log-entry-time">{new Date(entry.lastSeenAt).toLocaleTimeString()}</span>
                  {entry.occurrenceCount > 1 && (
                    <span className="error-log-entry-count">×{entry.occurrenceCount}</span>
                  )}
                  <button className="error-log-entry-dismiss" onClick={() => dismissEntry(entry.id)} type="button" title="Dismiss">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="error-log-entry-message">{entry.message}</div>
                <div className="error-log-entry-suggestion">{entry.suggestion}</div>
                {entry.details && (
                  <details className="error-log-entry-details">
                    <summary>Details</summary>
                    <pre>{entry.details}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <button className="btn btn--secondary btn--sm" onClick={clearAll} type="button" style={{ marginTop: "var(--space-4)" }}>
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
