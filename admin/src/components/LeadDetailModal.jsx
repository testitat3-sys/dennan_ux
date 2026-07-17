import React from "react";
import { X, ShoppingBag, Bell, Megaphone, UserPlus } from "lucide-react";

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

export default function LeadDetailModal({ lead, onClose }) {
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
                <td>{lead.email || "No email"}</td>
              </tr>
              <tr>
                <td>Phone</td>
                <td>{lead.phone || "No phone"}</td>
              </tr>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
