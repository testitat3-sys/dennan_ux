import React, { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { X, Calendar, Phone, Mail, Users, Bell, FileText, Trash } from "lucide-react";

export default function CustomerActivityModal({ customer, token, onClose }) {
  if (!customer) return null;

  // Which form tab is active: 'note' or 'schedule'
  const [activeInteractionTab, setActiveInteractionTab] = useState("note");
  const [interactionNote, setInteractionNote] = useState("");
  const [scheduledActivityType, setScheduledActivityType] = useState("call");
  const [scheduledDate, setScheduledDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityError, setActivityError] = useState("");

  // Queries and mutations
  const activities = useTrackedQuery(api.customerActivities.getActivitiesByCustomer, {
    token,
    customerId: customer.id
  });

  const addActivityMutation = useMutation(api.customerActivities.addActivity);
  const completeActivityMutation = useMutation(api.customerActivities.completeActivity);
  const deleteActivityMutation = useMutation(api.customerActivities.deleteActivity);

  useEffect(() => {
    setInteractionNote("");
    setActivityError("");
  }, [activeInteractionTab]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!interactionNote.trim()) {
      setActivityError("Please type a note.");
      return;
    }
    setActivityError("");
    setIsSubmitting(true);
    try {
      await addActivityMutation({
        token,
        customerId: customer.id,
        type: "note",
        note: interactionNote.trim()
      });
      setInteractionNote("");
    } catch (err) {
      setActivityError("Failed to save note: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleActivity = async (e) => {
    e.preventDefault();
    if (!interactionNote.trim()) {
      setActivityError("Please describe the planned activity.");
      return;
    }
    if (!scheduledDate) {
      setActivityError("Please choose a date.");
      return;
    }
    setActivityError("");
    setIsSubmitting(true);
    try {
      await addActivityMutation({
        token,
        customerId: customer.id,
        type: scheduledActivityType,
        note: interactionNote.trim(),
        scheduledDate
      });
      setInteractionNote("");
      setScheduledDate("");
    } catch (err) {
      setActivityError("Failed to schedule activity: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteActivity = async (activityId) => {
    try {
      await completeActivityMutation({ token, activityId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (window.confirm("Are you sure you want to delete this activity log?")) {
      try {
        await deleteActivityMutation({ token, activityId });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const typeIcon = {
    note: <FileText size={12} />,
    call: <Phone size={12} />,
    email: <Mail size={12} />,
    meeting: <Users size={12} />,
    other: <Bell size={12} />
  };

  const typeLabel = {
    note: "General Note",
    call: "Phone Call",
    email: "Email Outreach",
    meeting: "In-person Meeting",
    other: "Activity"
  };

  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className="modal customer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Customer CRM: {customer.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="customer-detail-grid">
          {/* Left Column: Profile & Interaction Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="customer-info-box">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="avatar avatar--lg">{(customer.name || "?")[0]}</div>
                <div>
                  <h3 className="customer-info-title">{customer.name}</h3>
                  <span>Registered {new Date(customer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <table className="customer-meta-table">
                <tbody>
                  <tr>
                    <td>Email</td>
                    <td>{customer.email || "No email"}</td>
                  </tr>
                  <tr>
                    <td>Phone</td>
                    <td>{customer.phone || "No phone"}</td>
                  </tr>
                  <tr>
                    <td>Orders</td>
                    <td>{customer.ordersCount} orders</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="interaction-form-box">
              <div className="form-tabs">
                <button
                  type="button"
                  className={`form-tab-btn ${activeInteractionTab === "note" ? "is-active" : ""}`}
                  onClick={() => setActiveInteractionTab("note")}
                >
                  <FileText size={13} /> Add Note
                </button>
                <button
                  type="button"
                  className={`form-tab-btn ${activeInteractionTab === "schedule" ? "is-active" : ""}`}
                  onClick={() => setActiveInteractionTab("schedule")}
                >
                  <Calendar size={13} /> Schedule Activity
                </button>
              </div>

              {activityError && <div className="form-error is-visible">{activityError}</div>}

              {activeInteractionTab === "note" ? (
                <form onSubmit={handleAddNote} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="interact-note">Customer Note</label>
                    <textarea
                      id="interact-note"
                      className="form-input"
                      placeholder="Type notes about customer preferences, calls, or issues..."
                      rows={4}
                      value={interactionNote}
                      onChange={(e) => setInteractionNote(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <button type="submit" className="btn btn--primary btn--sm" style={{ alignSelf: "flex-end" }} disabled={isSubmitting}>
                    Save Note
                  </button>
                </form>
              ) : (
                <form onSubmit={handleScheduleActivity} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "var(--space-3)" }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="interact-type">Type</label>
                      <select
                        id="interact-type"
                        className="form-input"
                        value={scheduledActivityType}
                        onChange={(e) => setScheduledActivityType(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="interact-date">Date</label>
                      <input
                        id="interact-date"
                        type="date"
                        className="form-input"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="interact-sched-desc">Description / Plan</label>
                    <textarea
                      id="interact-sched-desc"
                      className="form-input"
                      placeholder="e.g. Call to check restock or offer promotional discount..."
                      rows={3}
                      value={interactionNote}
                      onChange={(e) => setInteractionNote(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <button type="submit" className="btn btn--primary btn--sm" style={{ alignSelf: "flex-end" }} disabled={isSubmitting}>
                    Schedule Call/Activity
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Interaction Timeline */}
          <div>
            <h3 className="timeline-section-title">Interaction Timeline</h3>

            {activities === undefined ? (
              <div className="empty-state">
                <div className="empty-title">Loading activity logs...</div>
              </div>
            ) : activities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">No interactions logged yet.</div>
              </div>
            ) : (
              <div className="customer-timeline-wrapper">
                {activities.map((act) => {
                  const isPending = act.status === "pending";
                  const isNote = act.type === "note";
                  return (
                    <div key={act._id} className={`timeline-card ${isPending ? "is-pending" : isNote ? "is-note" : ""}`}>
                      <span className="timeline-node" />

                      <div className="timeline-card-header">
                        <span className="timeline-card-title">
                          {typeIcon[act.type] || <FileText size={12} />}
                          <span>{typeLabel[act.type] || "Activity"}</span>
                        </span>
                        <span className="timeline-card-time">{formatDate(act.createdAt)}</span>
                      </div>

                      <div className="timeline-card-body">{act.note}</div>

                      <div className="timeline-card-footer">
                        <span>Logged by {act.staffName}</span>
                        <div className="timeline-actions">
                          {isPending && (
                            <button
                              type="button"
                              className="timeline-btn-text"
                              onClick={() => handleCompleteActivity(act._id)}
                            >
                              Mark Completed
                            </button>
                          )}
                          <button
                            type="button"
                            className="timeline-btn-text timeline-btn-text--danger"
                            onClick={() => handleDeleteActivity(act._id)}
                          >
                            <Trash size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
