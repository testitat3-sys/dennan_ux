import React, { useState, useMemo } from "react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { SortableHeader } from "./DataTableControls";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { useSessionState } from "../hooks/useSessionDateRange";
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
  const [preset, setPreset] = useSessionState("admin_bizhealth_preset", "30");
  const [startDate, setStartDate] = useSessionState("admin_bizhealth_start", () => getNDaysAgoStr(30));
  const [endDate, setEndDate] = useSessionState("admin_bizhealth_end", getTodayStr());

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
  const totalCogs = metrics?.totalCogs || 0;
  const grossProfit = metrics?.grossProfit || (grossRev - totalCogs);
  const grossMarginPct = metrics?.grossMarginPercent || (grossRev > 0 ? (grossProfit / grossRev) * 100 : 0);
  const dailyExp = metrics?.totalDailyExpenses || 0;
  const majorExp = metrics?.totalMajorExpenses || 0;
  const totalExp = metrics?.totalExpenses || 0;
  const netProfit = metrics?.netProfit ?? metrics?.netRevenue ?? 0;
  const netMarginPct = metrics?.netMarginPercent || (grossRev > 0 ? (netProfit / grossRev) * 100 : 0);
  const uncostedCount = metrics?.uncostedItemsCount || 0;

  const isNetPositive = netProfit >= 0;

  const cogsPct = grossRev > 0 ? ((totalCogs / grossRev) * 100).toFixed(1) : "0.0";
  const opexPct = grossRev > 0 ? ((totalExp / grossRev) * 100).toFixed(1) : "0.0";
  const profitPct = grossRev > 0 ? ((netProfit / grossRev) * 100).toFixed(1) : "0.0";

  return (
    <div className="admin-tab-panel is-active">
      {/* ── Header ── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div>
          <h1 className="admin-page-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Activity size={24} style={{ color: "var(--color-brand-primary)" }} />
            Business Health & Financial Profitability
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
          {/* ── 5 Stat Cards: Gross Revenue, COGS, Gross Profit, Expenses, True Net Profit ── */}
          <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-3)" }}>
            {/* 1. Gross Revenue Card */}
            <div className="stat-card">
              <div className="stat-icon stat-icon--orchid">
                <DollarSign size={20} />
              </div>
              <span className="stat-value">UGX {grossRev.toLocaleString()}</span>
              <span className="stat-label">1. Gross Revenue</span>
            </div>

            {/* 2. Product COGS Card */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--color-support-amber-bg, #fffbeb)", color: "var(--color-support-amber, #d97706)" }}>
                <Wallet size={20} />
              </div>
              <span className="stat-value" style={{ color: "var(--color-support-amber, #d97706)" }}>
                UGX {totalCogs.toLocaleString()}
              </span>
              <span className="stat-label">2. Product COGS ({cogsPct}%)</span>
            </div>

            {/* 3. Gross Profit Card */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--color-support-blue-bg, #e3f2fd)", color: "var(--color-support-blue, #1976d2)" }}>
                <TrendingUp size={20} />
              </div>
              <span className="stat-value" style={{ color: "var(--color-support-blue, #1976d2)" }}>
                UGX {grossProfit.toLocaleString()}
              </span>
              <span className="stat-label">3. Gross Profit ({grossMarginPct.toFixed(1)}% Margin)</span>
            </div>

            {/* 4. Operating Expenses Card */}
            <div className="stat-card">
              <div className="stat-icon stat-icon--saffron">
                <Receipt size={20} />
              </div>
              <span className="stat-value">UGX {totalExp.toLocaleString()}</span>
              <span className="stat-label">4. OpEx Expenses ({opexPct}%)</span>
            </div>

            {/* 5. True Net Profit Card */}
            <div className="stat-card" style={{ border: `2px solid ${isNetPositive ? "var(--color-support-green, #2e7d32)" : "var(--color-support-red, #e53e3e)"}` }}>
              <div className={`stat-icon ${isNetPositive ? "stat-icon--green" : "stat-icon--orchid"}`}>
                {isNetPositive ? <CheckCircle size={20} /> : <TrendingDown size={20} />}
              </div>
              <span className="stat-value" style={{ color: isNetPositive ? "var(--color-support-green, #2e7d32)" : "var(--color-support-red, #e53e3e)" }}>
                UGX {netProfit.toLocaleString()}
              </span>
              <span className="stat-label">5. True Net Profit ({netMarginPct.toFixed(1)}% Net Margin)</span>
            </div>
          </div>

          {/* ── Visual Waterfall Proportional Bar ── */}
          <div className="table-wrap" style={{ padding: "var(--space-4)", marginTop: "var(--space-4)", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontWeight: 700, fontSize: "var(--body-sm)" }}>
              <span>Gross Revenue Profitability Waterfall Breakdown</span>
              <span>Gross Total: UGX {grossRev.toLocaleString()} (100.0%)</span>
            </div>

            <div style={{ height: "24px", width: "100%", background: "var(--surface-container-high, #e5e0db)", borderRadius: "var(--radius-pill, 9999px)", overflow: "hidden", display: "flex" }}>
              <div
                style={{ width: `${cogsPct}%`, height: "100%", background: "#e67e22", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "width 0.4s ease" }}
                title={`COGS: UGX ${totalCogs.toLocaleString()} (${cogsPct}%)`}
              >
                {parseFloat(cogsPct) > 8 ? `COGS ${cogsPct}%` : ""}
              </div>
              <div
                style={{ width: `${opexPct}%`, height: "100%", background: "#e74c3c", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "width 0.4s ease" }}
                title={`OpEx Expenses: UGX ${totalExp.toLocaleString()} (${opexPct}%)`}
              >
                {parseFloat(opexPct) > 8 ? `OpEx ${opexPct}%` : ""}
              </div>
              <div
                style={{ width: `${Math.max(0, parseFloat(profitPct))}%`, height: "100%", background: "#27ae60", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "width 0.4s ease" }}
                title={`True Net Profit: UGX ${netProfit.toLocaleString()} (${profitPct}%)`}
              >
                {parseFloat(profitPct) > 8 ? `Net Profit ${profitPct}%` : ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: "var(--text-secondary)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e67e22", display: "inline-block" }}></span>
                <strong>COGS (Product Procurement Cost):</strong> UGX {totalCogs.toLocaleString()} ({cogsPct}%)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e74c3c", display: "inline-block" }}></span>
                <strong>Operating Expenses (OpEx):</strong> UGX {totalExp.toLocaleString()} ({opexPct}%)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27ae60", display: "inline-block" }}></span>
                <strong>True Net Profit:</strong> UGX {netProfit.toLocaleString()} ({profitPct}%)
              </div>
            </div>
          </div>

          {/* ── COGS Data Integrity Banner (if uncosted items exist) ── */}
          {uncostedCount > 0 && (
            <div
              style={{
                background: "var(--color-support-amber-bg, #fffbeb)",
                border: "1px solid color-mix(in srgb, var(--color-support-amber, #d97706) 30%, transparent)",
                borderRadius: "var(--radius-md, 10px)",
                padding: "12px 16px",
                marginTop: "var(--space-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={20} style={{ color: "var(--color-support-amber, #d97706)", flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                    Data Integrity Notice: {uncostedCount} sold product items have unrecorded cost prices
                  </strong>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    COGS calculation excludes uncosted items. Update unit cost prices on products to reach 100% accurate profit margins.
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <h2 className="section-title">Income Statement & Expense Ledger</h2>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Financial Item</th>
                      <th>Subtotal (UGX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Gross Revenue</strong></td>
                      <td style={{ color: "var(--color-support-green, #2e7d32)", fontWeight: 600 }}>+ UGX {grossRev.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Cost of Goods Sold (COGS)</strong></td>
                      <td style={{ color: "var(--color-support-amber, #d97706)", fontWeight: 600 }}>- UGX {totalCogs.toLocaleString()}</td>
                    </tr>
                    <tr style={{ background: "var(--surface-container-low)" }}>
                      <td><strong>Gross Profit ({grossMarginPct.toFixed(1)}% Margin)</strong></td>
                      <td style={{ color: "var(--color-support-blue, #1976d2)", fontWeight: 700 }}>= UGX {grossProfit.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Daily Out-of-Pocket Expenses</td>
                      <td style={{ color: "var(--color-support-red, #ef4444)" }}>- UGX {dailyExp.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td>Major Business Expenses (Active)</td>
                      <td style={{ color: "var(--color-support-red, #ef4444)" }}>- UGX {majorExp.toLocaleString()}</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td>Total Operating Expenses (OpEx)</td>
                      <td style={{ color: "var(--color-support-red, #ef4444)" }}>- UGX {totalExp.toLocaleString()}</td>
                    </tr>
                    <tr style={{ fontWeight: 800, background: "var(--surface-container)" }}>
                      <td>True Net Profit ({netMarginPct.toFixed(1)}% Net Margin)</td>
                      <td style={{ color: isNetPositive ? "var(--color-support-green, #2e7d32)" : "var(--color-support-red, #ef4444)" }}>
                        = UGX {netProfit.toLocaleString()}
                      </td>
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
