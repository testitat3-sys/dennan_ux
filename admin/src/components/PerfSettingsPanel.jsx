import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Gauge, Timer, AlertTriangle } from "lucide-react";

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Metrics whose average, in ms, above this are flagged - a rough
// "this would visibly stutter" threshold, not a hard SLA.
const SLOW_THRESHOLD_MS = 100;

const METRIC_LABELS = {
  pos_grid_render: "POS grid: tab-open to painted",
  pos_search_filter: "POS: catalog search filter",
};

export default function PerfSettingsPanel({ token }) {
  const [day, setDay] = useState(getTodayStr());

  const dayStats = useQuery(api.perfMetrics.getPerfStatsForDay, { token, day });
  const cumulative = useQuery(api.perfMetrics.getCumulativePerfStats, { token });

  const loading = dayStats === undefined || cumulative === undefined;

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">Performance</h1>
      <p className="empty-sub">
        Client-side timing samples reported by staff devices while using the
        POS tab - how long the product grid took to paint after opening the
        tab, and how long each catalog search took to filter. Useful for
        confirming a rendering fix actually helped, on real devices, instead
        of guessing from a dev machine.
      </p>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ fontSize: "11px" }} htmlFor="perf-day">Day</label>
        <input
          id="perf-day"
          type="date"
          className="form-input"
          value={day}
          max={getTodayStr()}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-title">Loading performance stats...</div>
        </div>
      ) : (
        <>
          <div className="stats-row">
            {cumulative.rows.map((row) => (
              <div className="stat-card" key={row.metric}>
                <div className={`stat-icon ${row.avgMs > SLOW_THRESHOLD_MS ? "stat-icon--saffron" : "stat-icon--green"}`}>
                  {row.avgMs > SLOW_THRESHOLD_MS ? <AlertTriangle size={20} /> : <Gauge size={20} />}
                </div>
                <span className="stat-value">{row.avgMs.toFixed(0)} ms</span>
                <span className="stat-label">{METRIC_LABELS[row.metric] || row.metric} — all-time avg</span>
              </div>
            ))}
            {cumulative.rows.length === 0 && (
              <div className="stat-card">
                <div className="stat-icon stat-icon--blue">
                  <Timer size={20} />
                </div>
                <span className="stat-value">—</span>
                <span className="stat-label">No samples reported yet</span>
              </div>
            )}
          </div>

          <div className="section-header">
            <h2 className="section-title">By Metric — {dayStats.day}</h2>
          </div>
          {dayStats.rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No performance samples recorded for this day.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Samples</th>
                    <th>Avg</th>
                    <th>Worst (max)</th>
                  </tr>
                </thead>
                <tbody>
                  {dayStats.rows.map((row) => (
                    <tr key={row.metric}>
                      <td>{METRIC_LABELS[row.metric] || row.metric}</td>
                      <td>{row.count.toLocaleString()}</td>
                      <td style={{ color: row.avgMs > SLOW_THRESHOLD_MS ? "#ef4444" : undefined }}>
                        {row.avgMs.toFixed(0)} ms
                      </td>
                      <td>{row.maxMs.toFixed(0)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-header">
            <h2 className="section-title">All-Time Cumulative</h2>
          </div>
          {cumulative.rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No performance samples recorded yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Samples</th>
                    <th>Avg</th>
                    <th>Worst (max)</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulative.rows.map((row) => (
                    <tr key={row.metric}>
                      <td>{METRIC_LABELS[row.metric] || row.metric}</td>
                      <td>{row.count.toLocaleString()}</td>
                      <td style={{ color: row.avgMs > SLOW_THRESHOLD_MS ? "#ef4444" : undefined }}>
                        {row.avgMs.toFixed(0)} ms
                      </td>
                      <td>{row.maxMs.toFixed(0)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
