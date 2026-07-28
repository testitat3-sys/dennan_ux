import React, { useState } from "react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  DollarSign,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
} from "lucide-react";

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getNDaysAgoStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BusinessHealthPanel({ token, user }) {
  const [preset, setPreset] = useState("30"); // "today", "7", "30", "custom"
  const [startDate, setStartDate] = useState(getNDaysAgoStr(30));
  const [endDate, setEndDate] = useState(getTodayStr());

  const isAdmin = user?.accountRole === "admin";

  const metrics = useTrackedQuery(
    api.businessHealth.getBusinessHealthMetrics,
    isAdmin && token ? { token, startDate, endDate } : "skip"
  );

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    if (newPreset === "today") {
      const today = getTodayStr();
      setStartDate(today);
      setEndDate(today);
    } else if (newPreset === "7") {
      setStartDate(getNDaysAgoStr(7));
      setEndDate(getTodayStr());
    } else if (newPreset === "30") {
      setStartDate(getNDaysAgoStr(30));
      setEndDate(getTodayStr());
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-tab-panel is-active">
        <div className="empty-state">
          <AlertTriangle size={36} style={{ color: "var(--color-support-amber, #f59e0b)", marginBottom: "var(--space-2)" }} />
          <h2 className="empty-title">Restricted Admin View</h2>
          <div className="empty-sub">
            The Business Health Dashboard is only accessible to Executive Administrators.
          </div>
        </div>
      </div>
    );
  }

  const grossRev = metrics?.grossRevenue || 0;
  const dailyExp = metrics?.totalDailyExpenses || 0;
  const majorExp = metrics?.totalMajorExpenses || 0;
  const totalExp = metrics?.totalExpenses || 0;
  const netRev = metrics?.netRevenue || 0;
  const netCash = metrics?.netCashInDrawer || 0;
  const marginPct = metrics?.netMarginPercent || 0;

  const isNetPositive = netRev >= 0;

  return (
    <div className="admin-tab-panel is-active">
      {/* ── Header ── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div>
          <h1 className="admin-page-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Activity size={24} style={{ color: "var(--color-brand-primary)" }} />
            Business Health
          </h1>
        </div>

        {/* ── Date Presets ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            className={`btn btn--sm ${preset === "today" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => handlePresetChange("today")}
          >
            Today
          </button>
          <button
            className={`btn btn--sm ${preset === "7" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => handlePresetChange("7")}
          >
            7 Days
          </button>
          <button
            className={`btn btn--sm ${preset === "30" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => handlePresetChange("30")}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* ── Date range bar ── */}
      <div
        className="date-filter-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          marginBottom: "var(--space-5)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--body-sm)", color: "var(--text-secondary)" }}>
          <Calendar size={16} />
          <strong>Period:</strong>
        </div>
        <label className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
          From
          <input
            type="date"
            className="form-input"
            value={startDate}
            max={endDate}
            onChange={(e) => {
              setPreset("custom");
              setStartDate(e.target.value);
            }}
            style={{ padding: "4px 8px", fontSize: "var(--body-sm)" }}
          />
        </label>
        <label className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
          To
          <input
            type="date"
            className="form-input"
            value={endDate}
            min={startDate}
            onChange={(e) => {
              setPreset("custom");
              setEndDate(e.target.value);
            }}
            style={{ padding: "4px 8px", fontSize: "var(--body-sm)" }}
          />
        </label>
      </div>

      {metrics === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Calculating business metrics...</div>
        </div>
      ) : (
        <>
          {/* ── Only 3 Stat Cards: Revenue, Expenses, Net Revenue ── */}
          <div className="stats-row">
            {/* Revenue Card */}
            <div className="stat-card">
              <div className="stat-icon stat-icon--orchid">
                <DollarSign size={20} />
              </div>
              <span className="stat-value">UGX {grossRev.toLocaleString()}</span>
              <span className="stat-label">Revenue</span>
            </div>

            {/* Total Expenses Card */}
            <div className="stat-card">
              <div className="stat-icon stat-icon--saffron">
                <Receipt size={20} />
              </div>
              <span className="stat-value">UGX {totalExp.toLocaleString()}</span>
              <span className="stat-label">Expenses</span>
            </div>

            {/* Net Revenue Card */}
            <div className="stat-card">
              <div className={`stat-icon ${isNetPositive ? "stat-icon--green" : "stat-icon--orchid"}`}>
                {isNetPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <span className="stat-value">UGX {netRev.toLocaleString()}</span>
              <span className="stat-label">Net Revenue</span>
            </div>
          </div>

          {/* ── Revenue Breakdown & Deductions Breakdown Tables ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", marginTop: "var(--space-4)" }}>
            {/* Sales Channel Tenders */}
            <div>
              <div className="section-header" style={{ marginBottom: "var(--space-2)" }}>
                <h2 className="section-title">Gross Revenue Tenders</h2>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment Channel</th>
                      <th>Gross Amount (UGX)</th>
                      <th>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Physical Cash</strong></td>
                      <td>UGX {metrics.cashGrossRevenue.toLocaleString()}</td>
                      <td>{grossRev > 0 ? ((metrics.cashGrossRevenue / grossRev) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td><strong>Mobile Money (MTN / Airtel)</strong></td>
                      <td>UGX {metrics.momoRevenue.toLocaleString()}</td>
                      <td>{grossRev > 0 ? ((metrics.momoRevenue / grossRev) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td><strong>Card Payment</strong></td>
                      <td>UGX {metrics.cardRevenue.toLocaleString()}</td>
                      <td>{grossRev > 0 ? ((metrics.cardRevenue / grossRev) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td><strong>Gift Voucher Tenders</strong></td>
                      <td>UGX {metrics.voucherRevenue.toLocaleString()}</td>
                      <td>{grossRev > 0 ? ((metrics.voucherRevenue / grossRev) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td>Gross Total Revenue</td>
                      <td>UGX {grossRev.toLocaleString()}</td>
                      <td>100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div>
              <div className="section-header" style={{ marginBottom: "var(--space-2)" }}>
                <h2 className="section-title">Expense Deductions Ledger</h2>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Expense Category</th>
                      <th>Subtotal (UGX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Daily Out-of-Pocket Expenses</strong></td>
                      <td style={{ color: "var(--color-support-red, #ef4444)", fontWeight: 600 }}>- UGX {dailyExp.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Major Business Expenses</strong></td>
                      <td style={{ color: "var(--color-support-red, #ef4444)", fontWeight: 600 }}>- UGX {majorExp.toLocaleString()}</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td>Total Deductions</td>
                      <td style={{ color: "var(--color-support-red, #ef4444)" }}>- UGX {totalExp.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
