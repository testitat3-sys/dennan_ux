import React, { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { X, Calendar, Phone, Mail, Users, Bell, FileText, Trash, Pencil, ShoppingBag } from "lucide-react";
import {
  getChurnBand,
  CHURN_BAND_LABELS,
  LOYALTY_TIER_LABELS,
  CHURN_BAND_BADGE_CLASS,
  LOYALTY_TIER_BADGE_CLASS,
} from "../utils/customerScoreHelpers";

export default function CustomerActivityModal({ customer, token, onClose }) {
  if (!customer) return null;

  // Callers pass different shapes: AdminDashboard/StaffDashboard's customer-list
  // rows use `id` (see customerActivities.getCustomerList), but LeadsPanel's
  // "Notes & Reminder" flow builds its object from ensureLeadUser's result,
  // which returns `_id`. Normalize once here instead of assuming one shape.
  const customerId = customer.id || customer._id;

  // Which form tab is active: 'note' or 'schedule'
  const [activeInteractionTab, setActiveInteractionTab] = useState("note");
  const [interactionNote, setInteractionNote] = useState("");
  const [scheduledActivityType, setScheduledActivityType] = useState("call");
  const [scheduledDate, setScheduledDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [completingId, setCompletingId] = useState(null);
  const [completionNoteDraft, setCompletionNoteDraft] = useState("");

  // Edit state for existing timeline notes/activities
  const [editingId, setEditingId] = useState(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [editCompletionNoteDraft, setEditCompletionNoteDraft] = useState("");
  const [editDateDraft, setEditDateDraft] = useState("");

  // Queries and mutations
  const activities = useTrackedQuery(
    api.customerActivities.getActivitiesByCustomer,
    customerId ? { token, customerId } : "skip"
  );

  const customerOrders = useTrackedQuery(
    api.orders.getCustomerOrders,
    token && (customerId || customer.email || customer.phone)
      ? { token, userId: customerId, email: customer.email, phone: customer.phone }
      : "skip"
  );

  const addActivityMutation = useMutation(api.customerActivities.addActivity);
  const updateActivityMutation = useMutation(api.customerActivities.updateActivity);
  const completeActivityMutation = useMutation(api.customerActivities.completeActivity);
  const deleteActivityMutation = useMutation(api.customerActivities.deleteActivity);

  useEffect(() => {
    setInteractionNote("");
    setActivityError("");
    setEditingId(null);
  }, [activeInteractionTab, customerId]);

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
        customerId,
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
        customerId,
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
      await completeActivityMutation({
        token,
        activityId,
        completionNote: completionNoteDraft.trim() || undefined,
      });
      setCompletingId(null);
      setCompletionNoteDraft("");
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

  const handleStartEdit = (act) => {
    setEditingId(act._id);
    setEditNoteDraft(act.note || "");
    setEditCompletionNoteDraft(act.completionNote || "");
    setEditDateDraft(act.scheduledDate || "");
    setCompletingId(null);
  };

  const handleSaveEdit = async (activityId) => {
    if (!editNoteDraft.trim()) {
      setActivityError("Note content cannot be empty.");
      return;
    }
    setActivityError("");
    try {
      await updateActivityMutation({
        token,
        activityId,
        note: editNoteDraft.trim(),
        scheduledDate: editDateDraft || undefined,
        completionNote: editCompletionNoteDraft.trim() || undefined,
      });
      setEditingId(null);
    } catch (err) {
      setActivityError("Failed to update note: " + err.message);
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
                  {customer.createdAt && <span>Registered {new Date(customer.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>

              {(customer.loyaltyTier || customer.churnRisk !== undefined) && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "var(--space-3) 0" }}>
                  {customer.loyaltyTier && (
                    <span className={`active-badge ${LOYALTY_TIER_BADGE_CLASS[customer.loyaltyTier] || "active-badge--off"}`}>
                      {LOYALTY_TIER_LABELS[customer.loyaltyTier] || "Bronze"} tier
                    </span>
                  )}
                  {customer.churnRisk !== undefined && customer.churnRisk !== null && (
                    <span className={`active-badge ${CHURN_BAND_BADGE_CLASS[getChurnBand(customer.churnRisk)]}`}>
                      Churn risk: {CHURN_BAND_LABELS[getChurnBand(customer.churnRisk)]}
                    </span>
                  )}
                </div>
              )}

              {customer.engagementScore !== undefined && customer.engagementScore !== null && (
                <div style={{ margin: "0 0 var(--space-3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--label-sm)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Engagement score</span>
                    <span>{customer.engagementScore}/100</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-container)", marginTop: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${customer.engagementScore}%`, background: "var(--color-brand-primary)" }} />
                  </div>
                </div>
              )}

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
                    <td>
                      {customerOrders === undefined
                        ? (customer.ordersCount !== undefined ? `${customer.ordersCount} orders` : "Loading orders...")
                        : `${customerOrders.length} order${customerOrders.length === 1 ? "" : "s"}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Customer Order History Card */}
            {customerOrders && customerOrders.length > 0 && (
              <div className="customer-info-box">
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShoppingBag size={14} />
                  <span>Order History ({customerOrders.length})</span>
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                  {customerOrders.map((order) => {
                    const orderDateStr = new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const isDeliveredOrCompleted = order.status === "delivered" || order.status === "completed";
                    const isFailed = order.status === "cancelled" || order.status === "failed" || order.status === "returned";
                    const statusBadgeClass = isDeliveredOrCompleted
                      ? "active-badge--on"
                      : isFailed
                      ? "active-badge--red"
                      : "active-badge--yellow";

                    return (
                      <div
                        key={order._id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle, #e5e7eb)",
                          backgroundColor: "var(--surface-card, #ffffff)",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 600 }}>
                            Order #{order._id.slice(-6).toUpperCase()}
                            {order.isWalkIn ? (
                              <span className="active-badge active-badge--off" style={{ marginLeft: "4px", fontSize: "10px" }}>
                                Walk-in
                              </span>
                            ) : (
                              <span className="active-badge active-badge--purple" style={{ marginLeft: "4px", fontSize: "10px" }}>
                                Online
                              </span>
                            )}
                          </span>
                          <span className={`active-badge ${statusBadgeClass}`} style={{ fontSize: "10px" }}>
                            {order.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", marginBottom: "4px" }}>
                          <span>{orderDateStr}</span>
                          <strong style={{ color: "var(--text-primary)" }}>
                            UGX {order.grandTotal?.toLocaleString() ?? 0}
                          </strong>
                        </div>
                        {order.items && order.items.length > 0 && (
                          <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                            {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  const isEditing = editingId === act._id;
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

                      {isEditing ? (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: "11px" }}>Edit Note / Description</label>
                            <textarea
                              className="form-input"
                              rows={3}
                              value={editNoteDraft}
                              onChange={(e) => setEditNoteDraft(e.target.value)}
                              autoFocus
                            />
                          </div>
                          {act.scheduledDate !== undefined && (
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: "11px" }}>Scheduled Date</label>
                              <input
                                type="date"
                                className="form-input"
                                value={editDateDraft}
                                onChange={(e) => setEditDateDraft(e.target.value)}
                              />
                            </div>
                          )}
                          {act.status === "completed" && act.type !== "note" && (
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: "11px" }}>Outcome / Completion Note</label>
                              <textarea
                                className="form-input"
                                rows={2}
                                value={editCompletionNoteDraft}
                                onChange={(e) => setEditCompletionNoteDraft(e.target.value)}
                              />
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                            <button
                              type="button"
                              className="timeline-btn-text"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => handleSaveEdit(act._id)}
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="timeline-card-body">{act.note}</div>

                          {act.status === "completed" && (
                            <div className="timeline-card-body" style={{ marginTop: "6px" }}>
                              <strong style={{ color: "var(--color-support-green, #2e7d32)" }}>
                                Contacted{act.completedAt ? ` · ${formatDate(act.completedAt)}` : ""}
                              </strong>
                              {act.completionNote ? (
                                <div style={{ marginTop: "2px" }}>Outcome: {act.completionNote}</div>
                              ) : (
                                <div style={{ marginTop: "2px", color: "var(--text-tertiary)" }}>No outcome notes recorded.</div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {completingId === act._id && !isEditing && (
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <textarea
                            className="form-input"
                            placeholder="What happened when you contacted them? (optional)"
                            rows={2}
                            value={completionNoteDraft}
                            onChange={(e) => setCompletionNoteDraft(e.target.value)}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="timeline-btn-text"
                              onClick={() => { setCompletingId(null); setCompletionNoteDraft(""); }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => handleCompleteActivity(act._id)}
                            >
                              Save & Mark Completed
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="timeline-card-footer">
                        <span>Logged by {act.staffName}</span>
                        <div className="timeline-actions">
                          {isPending && completingId !== act._id && !isEditing && (
                            <button
                              type="button"
                              className="timeline-btn-text"
                              onClick={() => { setCompletingId(act._id); setCompletionNoteDraft(""); }}
                            >
                              Mark Completed
                            </button>
                          )}
                          {!isEditing && (
                            <>
                              <button
                                type="button"
                                className="timeline-btn-text"
                                onClick={() => handleStartEdit(act)}
                                title="Edit this note"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                className="timeline-btn-text timeline-btn-text--danger"
                                onClick={() => handleDeleteActivity(act._id)}
                                title="Delete this note"
                              >
                                <Trash size={12} /> Delete
                              </button>
                            </>
                          )}
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

