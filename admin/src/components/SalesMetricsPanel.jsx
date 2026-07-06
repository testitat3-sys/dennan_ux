import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import { getTodayStr } from "../utils/reminderHelpers";
import "../styles/SalesMetrics.css";

const METHOD_COLORS = {
  physical: "#7fa93e",
  momo: "#3b7dd8",
  card: "#d35097",
  voucher: "#c9a227",
};

const PAYMENT_FILTERS = [
  { value: "all", label: "All" },
  { value: "physical", label: "Cash" },
  { value: "momo", label: "Mobile Money" },
  { value: "card", label: "Card" },
  { value: "voucher", label: "Gift Voucher" },
];

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom" },
];

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function SalesMetricsPanel({ token }) {
  const todayStr = getTodayStr();
  const [datePreset, setDatePreset] = useState("30d");
  const [customStart, setCustomStart] = useState(addDays(todayStr, -29));
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");

  const { startDate, endDate } = useMemo(() => {
    switch (datePreset) {
      case "today":
        return { startDate: todayStr, endDate: todayStr };
      case "7d":
        return { startDate: addDays(todayStr, -6), endDate: todayStr };
      case "thisMonth": {
        const now = new Date();
        const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        return { startDate: first, endDate: todayStr };
      }
      case "custom":
        return { startDate: customStart, endDate: customEnd };
      case "30d":
      default:
        return { startDate: addDays(todayStr, -29), endDate: todayStr };
    }
  }, [datePreset, customStart, customEnd, todayStr]);

  const metrics = useQuery(api.orders.adminGetSalesMetrics, {
    token,
    startDate,
    endDate,
    paymentMethod: paymentMethodFilter === "all" ? undefined : paymentMethodFilter,
  });

  const pieData = useMemo(() => {
    if (!metrics) return [];
    return metrics.byPaymentMethod.map((m) => ({ name: m.label, value: m.amount, method: m.method }));
  }, [metrics]);

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">Sales Metrics</h1>

      <div className="sales-metrics-filterbar">
        <div className="sales-metrics-segment-group">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              className={`btn btn--segment ${datePreset === p.value ? "btn--segment-active" : ""}`}
              onClick={() => setDatePreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {datePreset === "custom" && (
          <div className="sales-metrics-date-range">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "11px" }}>From</label>
              <input
                type="date"
                className="form-input"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "11px" }}>To</label>
              <input
                type="date"
                className="form-input"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="sales-metrics-segment-group">
          {PAYMENT_FILTERS.map((p) => (
            <button
              key={p.value}
              className={`btn btn--segment ${paymentMethodFilter === p.value ? "btn--segment-active" : ""}`}
              onClick={() => setPaymentMethodFilter(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {metrics === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading sales metrics...</div>
        </div>
      ) : metrics.orderCount === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No completed sales in this range.</div>
          <div className="empty-sub">Try widening the date range or clearing the payment method filter.</div>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon stat-icon--green">
                <TrendingUp size={20} />
              </div>
              <span className="stat-value">UGX {metrics.totalSales.toLocaleString()}</span>
              <span className="stat-label">Total Sales</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon--blue">
                <CheckCircle size={20} />
              </div>
              <span className="stat-value">{metrics.orderCount}</span>
              <span className="stat-label">Orders</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon--orchid">
                <DollarSign size={20} />
              </div>
              <span className="stat-value">UGX {metrics.aov.toLocaleString()}</span>
              <span className="stat-label">Average Order Value</span>
            </div>
          </div>

          <div className="sales-metrics-charts-grid">
            <div className="sales-metrics-chart-card">
              <h3 className="product-edit-card-title">
                Sales Over Time ({metrics.bucketGranularity === "day" ? "Daily" : "Weekly"})
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={metrics.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container-high)" />
                  <XAxis dataKey="date" tickFormatter={formatDisplayDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip
                    formatter={(value) => `UGX ${Number(value).toLocaleString()}`}
                    labelFormatter={formatDisplayDate}
                  />
                  <Line type="monotone" dataKey="total" stroke="var(--color-brand-primary, #d35097)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="sales-metrics-chart-card">
              <h3 className="product-edit-card-title">Sales by Payment Method</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.method} fill={METHOD_COLORS[entry.method] || "#999"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `UGX ${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="section-header">
            <h2 className="section-title">Payment Method Breakdown</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Orders</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byPaymentMethod.map((m) => (
                  <tr key={m.method}>
                    <td><strong>{m.label}</strong></td>
                    <td>UGX {m.amount.toLocaleString()}</td>
                    <td>{m.count}</td>
                    <td>{metrics.totalSales > 0 ? Math.round((m.amount / metrics.totalSales) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
