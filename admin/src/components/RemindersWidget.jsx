import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Phone, Mail, Users, Bell, FileText, CheckCircle } from "lucide-react";
import { getTodayStr, getUrgency, formatScheduledDate } from "../utils/reminderHelpers";

const typeIcon = {
  note: <FileText size={13} />,
  call: <Phone size={13} />,
  email: <Mail size={13} />,
  meeting: <Users size={13} />,
  other: <Bell size={13} />
};

const urgencyStyles = {
  overdue: { border: "#ef4444", bg: "rgba(239,68,68,0.08)", label: "Overdue", color: "#ef4444" },
  today: { border: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "Today", color: "#d97706" },
  upcoming: { border: "var(--surface-container-highest)", bg: "var(--surface-container-low)", label: "Upcoming", color: "var(--text-tertiary)" }
};

const priorityLabel = { high: "High Priority", normal: null, low: "Low Priority" };

export default function RemindersWidget({ token, onViewCalendar }) {
  const todayStr = getTodayStr();
  const dueActivities = useQuery(api.customerActivities.getDueActivities, { token, currentDate: todayStr });
  const completeActivityMutation = useMutation(api.customerActivities.completeActivity);

  const handleComplete = async (activityId) => {
    try {
      await completeActivityMutation({ token, activityId });
    } catch (err) {
      alert("Failed to complete reminder: " + err.message);
    }
  };

  if (dueActivities === undefined) return null;
  if (dueActivities.length === 0) return null;

  const visible = dueActivities.slice(0, 3);
  const overflowCount = dueActivities.length - visible.length;

  return (
    <div style={{ marginBottom: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <h2 className="section-title" style={{ margin: 0 }}>Today's Reminders</h2>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-tertiary)" }}>{dueActivities.length} due</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-3)" }}>
        {visible.map((act) => {
          const urgency = getUrgency(act.scheduledDate, todayStr);
          const style = urgencyStyles[urgency];
          return (
            <div
              key={act._id}
              style={{
                borderLeft: `3px solid ${style.border}`,
                background: style.bg,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {typeIcon[act.type] || <FileText size={13} />}
                  {style.label}
                </span>
                {priorityLabel[act.priority] && (
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#ef4444" }}>{priorityLabel[act.priority]}</span>
                )}
              </div>

              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{act.customerName}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{act.note}</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                {formatScheduledDate(act.scheduledDate)}{act.scheduledTime ? ` · ${act.scheduledTime}` : ""}
              </div>

              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                {act.customerPhone && (
                  <a href={`tel:${act.customerPhone}`} className="btn btn--secondary btn--xs" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Phone size={12} /> Call Now
                  </a>
                )}
                <button type="button" className="btn btn--outline btn--xs" onClick={() => handleComplete(act._id)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle size={12} /> Mark Done
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {overflowCount > 0 && (
        <button
          type="button"
          className="text-link-btn"
          onClick={onViewCalendar}
          style={{ marginTop: "var(--space-2)", fontSize: "12px", fontWeight: 700, color: "var(--color-brand-primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          +{overflowCount} more — View calendar
        </button>
      )}
    </div>
  );
}
