import React from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";

export default function ErrorLogSettingsPanel({ token }) {
  const errorLogs = useTrackedQuery(api.errorLogs.getErrorLogs, { token });
  const clearErrorLogsMutation = useMutation(api.errorLogs.clearErrorLogs);

  const handleClearAll = async () => {
    if (!window.confirm("Clear the entire error log history? This cannot be undone.")) return;
    try {
      await clearErrorLogsMutation({ token });
    } catch (err) {
      alert("Failed to clear error logs: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Error Log</h1>
        {errorLogs && errorLogs.length > 0 && (
          <button className="btn btn--secondary btn--sm" onClick={handleClearAll} type="button">
            Clear All
          </button>
        )}
      </div>

      {errorLogs === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading error history...</div>
        </div>
      ) : errorLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No errors reported.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Source</th>
                <th>Reported By</th>
                <th>Occurrences</th>
                <th>First Seen</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {errorLogs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <strong>{log.message}</strong>
                    {log.suggestion && <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>{log.suggestion}</div>}
                    {log.details && (
                      <details style={{ marginTop: "6px" }}>
                        <summary style={{ fontSize: "11px", cursor: "pointer", color: "var(--text-tertiary)" }}>Details</summary>
                        <pre style={{ fontSize: "11px", whiteSpace: "pre-wrap", marginTop: "4px" }}>{log.details}</pre>
                      </details>
                    )}
                  </td>
                  <td>{log.source || "—"}</td>
                  <td>{log.userName ? `${log.userName} (${log.accountRole || "?"})` : "—"}</td>
                  <td>{log.occurrenceCount}</td>
                  <td>{new Date(log.firstSeenAt).toLocaleString()}</td>
                  <td>{new Date(log.lastSeenAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
