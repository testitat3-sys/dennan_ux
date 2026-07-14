import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Database, Layers, HardDrive, Archive } from "lucide-react";
import { estimateBytes, formatBytes } from "../utils/dbIOEstimate";

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DbIOPanel({ token }) {
  const [day, setDay] = useState(getTodayStr());

  // getIOStatsForDay/getCumulativeIOStats are plain queries, not
  // trackedQuery - the dashboard's own stat reads aren't instrumented
  // (avoids tracking the tracker), so this uses useQuery directly rather
  // than useTrackedQuery.
  const dayStats = useQuery(api.dbIOStats.getIOStatsForDay, { token, day });
  const cumulative = useQuery(api.dbIOStats.getCumulativeIOStats, { token });

  const loading = dayStats === undefined || cumulative === undefined;

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">Database I/O Baseline</h1>
      <p className="empty-sub">
        Read cost per Convex function, so query fixes can be prioritized by
        measured impact instead of guesswork. Public storefront queries
        (getProducts, getHomeFeaturedProducts, getBrandBySlug) are sampled
        1-in-20 and scaled up — treat those rows as estimates, not exact counts.
        Data-size figures are estimated from an average document size per
        function (Convex doesn't expose actual bytes read), not measured —
        treat them as order-of-magnitude, not exact bandwidth.
      </p>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ fontSize: "11px" }} htmlFor="dbio-day">Day</label>
        <input
          id="dbio-day"
          type="date"
          className="form-input"
          value={day}
          max={getTodayStr()}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-title">Loading I/O stats...</div>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon stat-icon--blue">
                <Database size={20} />
              </div>
              <span className="stat-value">{dayStats.totalReads.toLocaleString()}</span>
              <span className="stat-label">Reads on {dayStats.day}</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon--orchid">
                <Layers size={20} />
              </div>
              <span className="stat-value">{cumulative.totalReads.toLocaleString()}</span>
              <span className="stat-label">All-Time Cumulative Reads</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon--green">
                <HardDrive size={20} />
              </div>
              <span className="stat-value">
                {formatBytes(
                  dayStats.rows.reduce((sum, r) => sum + estimateBytes(r.functionName, r.reads), 0)
                )}
              </span>
              <span className="stat-label">Est. Data Read on {dayStats.day}</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon--saffron">
                <Archive size={20} />
              </div>
              <span className="stat-value">
                {formatBytes(
                  cumulative.rows.reduce((sum, r) => sum + estimateBytes(r.functionName, r.reads), 0)
                )}
              </span>
              <span className="stat-label">Est. Cumulative Data Read</span>
            </div>
          </div>

          <div className="section-header">
            <h2 className="section-title">By Function — {dayStats.day}</h2>
          </div>
          {dayStats.rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No tracked function calls recorded for this day.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Function</th>
                    <th>Invocations</th>
                    <th>Reads</th>
                    <th>Avg Reads / Invocation</th>
                    <th>Est. Size</th>
                  </tr>
                </thead>
                <tbody>
                  {dayStats.rows.map((row) => (
                    <tr key={row.functionName}>
                      <td>{row.functionName}</td>
                      <td>{row.invocations.toLocaleString()}</td>
                      <td>{row.reads.toLocaleString()}</td>
                      <td>{row.avgReadsPerInvocation.toFixed(1)}</td>
                      <td>{formatBytes(estimateBytes(row.functionName, row.reads))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-header">
            <h2 className="section-title">All-Time Cumulative By Function</h2>
          </div>
          {cumulative.rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No tracked function calls recorded yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Function</th>
                    <th>Invocations</th>
                    <th>Reads</th>
                    <th>Avg Reads / Invocation</th>
                    <th>Est. Size</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulative.rows.map((row) => (
                    <tr key={row.functionName}>
                      <td>{row.functionName}</td>
                      <td>{row.invocations.toLocaleString()}</td>
                      <td>{row.reads.toLocaleString()}</td>
                      <td>{row.avgReadsPerInvocation.toFixed(1)}</td>
                      <td>{formatBytes(estimateBytes(row.functionName, row.reads))}</td>
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
