import React from "react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { X, ShoppingBag, Bell, Megaphone, UserPlus, Calendar, PhoneCall, AlertTriangle, Package } from "lucide-react";

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

export default function LeadDetailModal({ lead, token, onClose, onResolve, onOpenNotes }) {
  if (!lead) return null;

  const KindIcon = KIND_ICON[lead.kind];

  const customerOrders = useTrackedQuery(
    api.orders.getCustomerOrders,
    token && (lead.userId || lead.email || lead.phone)
      ? { token, userId: lead.userId, email: lead.email, phone: lead.phone }
      : "skip"
  );

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
              <tr>
                <td>Orders</td>
                <td>
                  {customerOrders === undefined ? (
                    <span style={{ color: "var(--text-tertiary)" }}>Loading orders...</span>
                  ) : customerOrders.length > 0 ? (
                    <span className="active-badge active-badge--on">
                      {customerOrders.length} order{customerOrders.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }}>No past orders</span>
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

          {/* Customer Orders Section */}
          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle, #e5e7eb)" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <ShoppingBag size={14} />
              <span>Order History {customerOrders ? `(${customerOrders.length})` : ""}</span>
            </h4>

            {customerOrders === undefined ? (
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic", padding: "8px 0" }}>
                Loading customer order history...
              </div>
            ) : customerOrders.length === 0 ? (
              <div style={{ fontSize: "13px", color: "var(--text-tertiary)", padding: "12px", background: "var(--surface-subtle, #f9fafb)", borderRadius: "6px", textAlign: "center" }}>
                No orders placed by this customer yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
                {customerOrders.map((order) => {
                  const orderDateStr = new Date(order.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
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
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle, #e5e7eb)",
                        backgroundColor: "var(--surface-card, #ffffff)",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          Order #{order._id.slice(-6).toUpperCase()}
                          {order.isWalkIn ? (
                            <span className="active-badge active-badge--off" style={{ marginLeft: "6px", fontSize: "11px" }}>
                              Walk-in
                            </span>
                          ) : (
                            <span className="active-badge active-badge--purple" style={{ marginLeft: "6px", fontSize: "11px" }}>
                              Online
                            </span>
                          )}
                        </span>
                        <span className={`active-badge ${statusBadgeClass}`} style={{ fontSize: "11px" }}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "12px", marginBottom: "6px" }}>
                        <span>{orderDateStr}</span>
                        <strong style={{ color: "var(--text-primary)", fontSize: "13px" }}>
                          UGX {order.grandTotal?.toLocaleString() ?? 0}
                        </strong>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div style={{ background: "var(--surface-subtle, #f9fafb)", borderRadius: "6px", padding: "6px 8px", marginTop: "6px" }}>
                          <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-tertiary)", fontWeight: 600, marginBottom: "4px" }}>
                            Items ({order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)}):
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {order.items.map((item, idx) => (
                              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-primary)" }}>
                                <span>
                                  • {item.quantity}x {item.productName} {item.size ? `(${item.size})` : ""}
                                </span>
                                <span style={{ color: "var(--text-secondary)" }}>
                                  UGX {((item.unitPrice || 0) * (item.quantity || 1)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

