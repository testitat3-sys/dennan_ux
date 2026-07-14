import React, { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { ChevronLeft, ChevronRight, Calendar, Phone, Mail, Users, Bell, FileText, ChevronRight as ChevronRightIcon } from "lucide-react";
import { getTodayStr, getLocalDateString, formatScheduledDate, getUrgency, priorityRank } from "../utils/reminderHelpers";

const typeIcon = {
  note: <FileText size={13} />,
  call: <Phone size={13} />,
  email: <Mail size={13} />,
  meeting: <Users size={13} />,
  other: <Bell size={13} />
};

const typeLabel = {
  note: "General Note",
  call: "Phone Call",
  email: "Email Outreach",
  meeting: "In-person Meeting",
  other: "Activity"
};

export default function CalendarPanel({ token, onOpenOrder }) {
  const todayStr = getTodayStr();
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [completingId, setCompletingId] = useState(null);

  const allActivities = useTrackedQuery(api.customerActivities.getAllActivities, { token });
  const completeActivityMutation = useMutation(api.customerActivities.completeActivity);
  const deleteActivityMutation = useMutation(api.customerActivities.deleteActivity);

  const calendarDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startOfWeekDay = firstDay.getDay();

    const prevMonthLastDate = new Date(calendarYear, calendarMonth, 0).getDate();
    for (let i = startOfWeekDay - 1; i >= 0; i--) {
      days.push({ date: new Date(calendarYear, calendarMonth - 1, prevMonthLastDate - i), isCurrentMonth: false });
    }
    const currentMonthLastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    for (let i = 1; i <= currentMonthLastDate; i++) {
      days.push({ date: new Date(calendarYear, calendarMonth, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(calendarYear, calendarMonth + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const activitiesByDate = useMemo(() => {
    if (!allActivities) return {};
    const groups = {};
    allActivities.forEach((act) => {
      const dateStr = act.status === "pending" && act.scheduledDate ? act.scheduledDate : getLocalDateString(new Date(act.createdAt));
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(act);
    });
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => {
        const timeCompare = (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "");
        if (timeCompare !== 0) return timeCompare;
        return priorityRank[a.priority ?? "normal"] - priorityRank[b.priority ?? "normal"];
      })
    );
    return groups;
  }, [allActivities]);

  const handleComplete = async (activityId) => {
    try {
      await completeActivityMutation({ token, activityId });
      setCompletingId(null);
    } catch (err) {
      alert("Failed to complete: " + err.message);
    }
  };

  const handleDelete = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      await deleteActivityMutation({ token, activityId });
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const selectedActivities = activitiesByDate[selectedDateStr] || [];

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Reminders & Calendar</h1>
      </div>

      <div className="calendar-layout">
        <div className="calendar-container">
          <div className="calendar-header-nav">
            <div className="calendar-nav-title">
              {new Date(calendarYear, calendarMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <div className="calendar-nav-buttons">
              <button
                type="button"
                className="btn btn--secondary btn--xs"
                onClick={() => {
                  if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
                  else setCalendarMonth((m) => m - 1);
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--xs"
                onClick={() => {
                  const d = new Date();
                  setCalendarMonth(d.getMonth());
                  setCalendarYear(d.getFullYear());
                  setSelectedDateStr(todayStr);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--xs"
                onClick={() => {
                  if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
                  else setCalendarMonth((m) => m + 1);
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}

            {calendarDays.map((day, idx) => {
              const dStr = getLocalDateString(day.date);
              const isSelected = dStr === selectedDateStr;
              const isToday = dStr === todayStr;
              const dayActs = activitiesByDate[dStr] || [];

              return (
                <button
                  key={idx}
                  type="button"
                  className={`calendar-day-cell ${day.isCurrentMonth ? "" : "is-different-month"} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                  onClick={() => setSelectedDateStr(dStr)}
                >
                  <span className="calendar-day-number">{day.date.getDate()}</span>
                  <div className="calendar-day-activities">
                    {dayActs.slice(0, 3).map((act, actIdx) => {
                      const urgency = getUrgency(act.scheduledDate, todayStr);
                      const colorClass = act.status !== "pending" ? "is-completed" : urgency === "overdue" ? "is-overdue" : urgency === "today" ? "is-pending" : "is-note";
                      return <span key={actIdx} className={`calendar-activity-dot ${colorClass}`} title={`${act.type}: ${act.customerName}`} />;
                    })}
                    {dayActs.length > 3 && <span className="calendar-activity-more">+{dayActs.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="calendar-detail-pane">
          <div className="calendar-detail-header">
            <h3>Activities on {formatScheduledDate(selectedDateStr)}</h3>
            <span className="calendar-detail-badge">{selectedActivities.length} logged</span>
          </div>

          <div className="calendar-detail-list">
            {selectedActivities.length === 0 ? (
              <div className="calendar-empty-state">
                <Calendar size={24} style={{ color: "var(--text-tertiary)", marginBottom: "8px" }} />
                <p>No notes or activities logged for this date.</p>
              </div>
            ) : (
              selectedActivities.map((act) => {
                const isPending = act.status === "pending";
                const urgency = getUrgency(act.scheduledDate, todayStr);
                const cardClass = !isPending ? "is-completed" : urgency === "overdue" ? "is-overdue" : act.type === "note" ? "is-note" : "is-pending";

                return (
                  <div key={act._id} className={`calendar-detail-card ${cardClass}`}>
                    <div className="calendar-detail-card-header">
                      <span className="calendar-detail-card-title">
                        {typeIcon[act.type] || <FileText size={13} />}
                        <span>{typeLabel[act.type] || "Activity"}</span>
                      </span>
                      {act.priority && act.priority !== "normal" && (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: act.priority === "high" ? "#ef4444" : "var(--text-tertiary)", textTransform: "uppercase" }}>
                          {act.priority} priority
                        </span>
                      )}
                    </div>

                    <div className="calendar-detail-card-customer">
                      Customer: <strong>{act.customerName}</strong>
                      {act.customerPhone && <span style={{ color: "var(--text-tertiary)", fontSize: "11px", marginLeft: "6px" }}>({act.customerPhone})</span>}
                    </div>

                    {act.orderId && (
                      <button
                        type="button"
                        className="text-link-btn"
                        style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-brand-primary)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: "2px" }}
                        onClick={() => onOpenOrder && onOpenOrder(act.orderId)}
                      >
                        Order #{act.orderId.slice(-6).toUpperCase()} <ChevronRightIcon size={11} />
                      </button>
                    )}

                    <div className="calendar-detail-card-body">{act.note}</div>
                    {act.scheduledTime && (
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Time: {act.scheduledTime}</div>
                    )}

                    {isPending && completingId === act._id ? (
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "8px" }}>
                        <button type="button" className="btn btn--secondary btn--xs" onClick={() => setCompletingId(null)}>Cancel</button>
                        <button type="button" className="btn btn--primary btn--xs" onClick={() => handleComplete(act._id)}>Confirm</button>
                      </div>
                    ) : (
                      <div className="calendar-detail-card-footer">
                        <span>Logged by {act.staffName}</span>
                        <div className="calendar-detail-card-actions">
                          {act.customerPhone && (
                            <a href={`tel:${act.customerPhone}`} className="timeline-btn-text">Call Now</a>
                          )}
                          {isPending && (
                            <button type="button" className="timeline-btn-text" onClick={() => setCompletingId(act._id)}>Mark Completed</button>
                          )}
                          <button type="button" className="timeline-btn-text timeline-btn-text--danger" onClick={() => handleDelete(act._id)}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
