import React from "react";
import { X, ShoppingBag, Bell, Megaphone, UserPlus, Calendar, PhoneCall, AlertTriangle } from "lucide-react";

const KIND_LABEL = {
  storeRequest: "Order Reminder",
  restockNotify: "Restock Notify",
  notifySignup: "Launch Signup",
  preLaunchSignup: "Pre-Launch",
};

const KIND_ICON = {
  storeRequest: ShoppingBag,
  restockNotify: Bell,
  notifySignup: Megaphone,
  preLaunchSignup: UserPlus,
};

const EVENT_STATUS_CONFIG = {
  upcoming: { label: "Upcoming", badgeClass: "active-badge--off", icon: Calendar },
  overdue: { label: "Overdue - Not Contacted", badgeClass: "active-badge--red", icon: AlertTriangle },
  contacted: { label: "Contacted", badgeClass: "active-badge--on", icon: PhoneCall },
};

export default function LeadDetailModal({ lead, onClose, onResolve, onOpenNotes }) {
  if (!lead) return null;

  const KindIcon = KIND_ICON[lead.kind];

  return (
    <div className="modal-overlay is-open" onClick={onClose}>
      <div className="modal customer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Lead: {lead.name}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="customer-info-box">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="avatar avatar--lg">{(lead.name || "?")[0]}</div>
            <div>
              <h3 className="customer-info-title">{lead.name}</h3>
              <span>
                <span className={`active-badge ${lead.kind === "storeRequest" ? "active-badge--on" : lead.kind === "preLaunchSignup" ? "active-badge--purple" : "active-badge--off"}`}>
                  {KindIcon && <KindIcon size={12} />}
                  {KIND_LABEL[lead.kind]}
                </span>
              </span>
            </div>
          </div>

          <table className="customer-meta-table">
            <tbody>
              <tr>
                <td>Email</td>
                <td>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} style={{ color: "var(--accent-primary, #3b82f6)", textDecoration: "none" }}>
                      {lead.email}
                    </a>
                  ) : (
                    "No email"
                  )}
                </td>
              </tr>
              <tr>
                <td>Phone</td>
                <td>
                  {lead.phone ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span>{lead.phone}</span>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "12px", color: "#16a34a", textDecoration: "none", fontWeight: 600 }}
                        title="Chat on WhatsApp"
                      >
                        WhatsApp 💬
                      </a>
                    </span>
                  ) : (
                    "No phone"
                  )}
                </td>
              </tr>
              {lead.kind === "storeRequest" && (
                <>
                  <tr>
                    <td>Requested Item</td>
                    <td style={{ fontWeight: 600 }}>{lead.itemDescription || "No item description provided"}</td>
                  </tr>
                  <tr>
                    <td>Journey Stage</td>
                    <td>
                      {lead.stageLabel ? (
                        <span className="active-badge active-badge--off">{lead.stageLabel}</span>
                      ) : (
                        "Not specified"
                      )}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td>Submitted</td>
                <td>{new Date(lead.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>
                  <span className={`active-badge ${lead.status === "resolved" ? "active-badge--on" : "active-badge--off"}`}>
                    <span className="active-dot" />
                    {lead.status === "resolved" ? "Resolved" : "New"}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Details</td>
                <td>{lead.detail || "—"}</td>
              </tr>
              {lead.eventStatus && lead.eventStatus !== "none" && lead.eventDate && (
                <tr>
                  <td>Scheduled Event</td>
                  <td>
                    {(() => {
                      const cfg = EVENT_STATUS_CONFIG[lead.eventStatus];
                      const EventIcon = cfg?.icon;
                      return (
                        <span className={`active-badge ${cfg?.badgeClass || "active-badge--off"}`}>
                          {EventIcon && <EventIcon size={12} />}
                          {cfg?.label} · {new Date(lead.eventDate).toLocaleDateString()}
                        </span>
                      );
                    })()}
                    {lead.eventNote && (
                      <div style={{ marginTop: "6px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        Plan: {lead.eventNote}
                      </div>
                    )}
                    {lead.eventStatus === "contacted" && (
                      <div style={{ marginTop: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        Outcome: {lead.eventCompletionNote || "No outcome notes recorded."}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle, #e5e7eb)" }}>
            {onOpenNotes && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onOpenNotes(lead)}
              >
                Activity & Notes
              </button>
            )}
            {onResolve && (
              <button
                type="button"
                className={`btn btn--sm ${lead.status === "resolved" ? "btn--ghost" : "btn--primary"}`}
                onClick={() => onResolve(lead)}
              >
                {lead.status === "resolved" ? "Re-open Lead" : "Mark Resolved"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
