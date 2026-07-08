import React, { useState } from "react";
import { X, Clock, ArrowRight, User, MapPin } from "lucide-react";

export default function HandoverModal({ orderId, customerName, customerPhone, deliveryAddress, onClose, onSubmit }) {
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!riderName.trim()) {
      setError("Rider name is required.");
      return;
    }
    if (!riderPhone.trim()) {
      setError("Rider phone is required.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    const expectedTimeMs = Date.now() + delayMinutes * 60 * 1000;
    const success = await onSubmit({
      orderId,
      deliveryPersonName: riderName.trim(),
      riderPhone: riderPhone.trim(),
      expectedDeliveryTime: expectedTimeMs,
    });

    setIsSubmitting(false);
    if (!success) {
      setError("Failed to dispatch order. Please try again.");
    }
  };

  return (
    <div className="modal-overlay is-open">
      <div className="modal" style={{ maxWidth: "420px" }}>
        <div className="modal-header">
          <h2 className="modal-title">Handover to Delivery</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error is-visible">
              <span>{error}</span>
            </div>
          )}

          {(customerName || deliveryAddress) && (
            <div className="customer-info-box">
              <h4><User size={15} /> Customer</h4>
              <p>{customerName || "Unknown customer"} — {customerPhone || "No phone on file"}</p>
              {deliveryAddress && (
                <p><MapPin size={13} /> {deliveryAddress.name}{deliveryAddress.zone ? `, Zone: ${deliveryAddress.zone}` : ""}</p>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="riderName">Rider / Driver Name</label>
            <input
              className="form-input"
              id="riderName"
              type="text"
              placeholder="e.g. John Mukasa"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="riderPhone">Rider Phone Number</label>
            <input
              className="form-input"
              id="riderPhone"
              type="tel"
              placeholder="e.g. +256 701 234567"
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <div className="flex-space">
              <label className="form-label" htmlFor="delay">Expected Delivery Time</label>
              <span className="slider-value">{delayMinutes} mins</span>
            </div>
            <div className="slider-wrapper">
              <Clock className="slider-icon" size={18} />
              <input
                id="delay"
                type="range"
                min="10"
                max="180"
                step="5"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
                disabled={isSubmitting}
              />
            </div>
            <p className="momo-hint">
              Rider will be expected to deliver around: {new Date(Date.now() + delayMinutes * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--secondary btn--md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn--primary btn--md${isSubmitting ? " is-loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting && <span className="btn-spinner" />}
              Confirm Dispatch
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
