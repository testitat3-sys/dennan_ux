import React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X, Calendar, MapPin, CreditCard, Clock, RotateCcw, User, Phone, Truck, Bell } from "lucide-react";

export default function OrderDetailModal({ order, onClose, onOpenReturn, token }) {
  const linkedActivities = useQuery(
    api.customerActivities.getActivitiesByOrder,
    order && token ? { token, orderId: order._id } : "skip"
  );

  if (!order) return null;

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusModifier = (status) => {
    switch (status) {
      case "preparing": return "new";
      case "packing": return "packing";
      case "dispatched": return "dispatched";
      case "delivered": return "done";
      case "failed": return "failed";
      case "returned": return "returned";
      case "partially_returned": return "partially-returned";
      default: return "new";
    }
  };

  const timelineDotStatus = (status) => {
    if (status === "delivered" || status === "done") return "done";
    if (status === "dispatched") return "dispatched";
    if (status === "packing" || status === "in_progress") return "packing";
    return "new";
  };

  return (
    <div className="modal-overlay is-open">
      <div className="modal customer-modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Order Details</h2>
            <span className="modal-subtitle">ID: {order._id}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="customer-detail-grid">
          {/* Left panel: Info and items */}
          <div>
            <div className="customer-info-box">
              <div className="section-header">
                <span className="flex-center gap-sm">
                  <Calendar size={16} /> {formatDate(order.createdAt)}
                </span>
                <span className={`status-badge status-badge--${getStatusModifier(order.status)}`}>
                  <span className="status-dot" />
                  {order.status.toUpperCase()}
                </span>
              </div>

              <table className="customer-meta-table">
                <tbody>
                  <tr>
                    <td><User size={14} /> Customer</td>
                    <td><strong>{order.customerName}</strong></td>
                  </tr>
                  {order.customerEmail && (
                    <tr>
                      <td>Email</td>
                      <td>{order.customerEmail}</td>
                    </tr>
                  )}
                  {order.customerPhone && (
                    <tr>
                      <td><Phone size={14} /> Phone</td>
                      <td>{order.customerPhone}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="customer-info-box">
              <h4 className="flex-center gap-sm"><MapPin size={16} /> Delivery Information</h4>
              <p>
                <strong>{order.deliveryAddress?.name}</strong><br />
                Zone: {order.deliveryAddress?.zone}<br />
                {order.deliveryAddress?.lat && (
                  <span>Coordinates: {order.deliveryAddress.lat.toFixed(4)}, {order.deliveryAddress.lng.toFixed(4)}</span>
                )}
              </p>

              {order.deliveryPersonName && (
                <div className="order-detail-row">
                  <span className="order-detail-icon"><Truck size={16} /></span>
                  <div className="order-detail-content">
                    Rider: <strong>{order.deliveryPersonName}</strong>
                    <div>Phone: {order.riderPhone}</div>
                  </div>
                </div>
              )}
            </div>

            {order.note && (
              <div className="customer-info-box">
                <h4 className="flex-center gap-sm">Order Note</h4>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{order.note}</p>
              </div>
            )}

            {linkedActivities && linkedActivities.length > 0 && (
              <div className="customer-info-box">
                <h4 className="flex-center gap-sm"><Bell size={16} /> Follow-up Scheduled</h4>
                {linkedActivities.map((act) => (
                  <p key={act._id} style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {act.type.toUpperCase()} on {act.scheduledDate}{act.scheduledTime ? ` at ${act.scheduledTime}` : ""} — {act.note}
                    {act.status !== "pending" && <em> ({act.status})</em>}
                  </p>
                ))}
              </div>
            )}

            <div className="customer-info-box">
              <h4 className="flex-center gap-sm"><CreditCard size={16} /> Payment ({order.paymentMethod.toUpperCase()})</h4>
              {order.paymentMethod === "card" && order.cardOrderId && (
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Card Order ID: <strong>{order.cardOrderId}</strong></p>
              )}
              {order.paymentMethod === "momo" && order.momoPhone && (
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>MoMo Phone: <strong>{order.momoPhone}</strong></p>
              )}
              <div className="price-preview-row">
                <span>Subtotal</span>
                <span>UGX {order.subtotal.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="price-preview-row font-discount">
                  <span>Discount {order.couponApplied && `(${order.couponApplied})`}</span>
                  <span>- UGX {order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="price-preview-row">
                <span>Delivery Fee</span>
                <span>UGX {order.deliveryFee.toLocaleString()}</span>
              </div>
              <div className="price-preview-divider" />
              <div className="price-preview-row font-final">
                <span>Grand Total</span>
                <strong>UGX {order.grandTotal.toLocaleString()}</strong>
              </div>
            </div>

            <div className="section-header">
              <h3 className="section-title">Items Ordered</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="item-name">{item.productName}</td>
                      <td>{item.size || "—"}</td>
                      <td className="item-qty">{item.quantity}</td>
                      <td>UGX {item.unitPrice.toLocaleString()}</td>
                      <td>UGX {(item.quantity * item.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: Timeline & Actions */}
          <div>
            <div className="customer-info-box">
              <h4 className="flex-center gap-sm"><Clock size={16} /> Order Timeline</h4>
              <div className="sheet-timeline-container">
                <div className="sheet-timeline">
                  {order.history && order.history.length > 0 ? (
                    order.history.map((event, idx) => (
                      <div key={idx} className="timeline-event" data-status={timelineDotStatus(event.status)}>
                        <span className="timeline-event-dot" />
                        <div className="timeline-event-meta">
                          <span className="timeline-event-status">{event.status.toUpperCase()}</span>
                          <span className="timeline-event-time">{formatDate(event.timestamp)}</span>
                          {event.note && <p className="timeline-event-note">{event.note}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="timeline-event" data-status="new">
                      <span className="timeline-event-dot" />
                      <div className="timeline-event-meta">
                        <span className="timeline-event-status">ORDER CREATED</span>
                        <span className="timeline-event-time">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="customer-info-box">
              <h4>Fulfillment Actions</h4>
              {order.status === "delivered" && onOpenReturn && (
                <button
                  className="btn btn--secondary btn--md btn--full-width"
                  onClick={() => onOpenReturn(order)}
                >
                  <span className="btn-icon btn-icon--left"><RotateCcw size={16} /></span>
                  Process Return / Refund
                </button>
              )}
              {order.claimantName && (
                <span className="claimed-chip">
                  <span className="mini-avatar">{order.claimantName[0]}</span>
                  Claimed by {order.claimantName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
