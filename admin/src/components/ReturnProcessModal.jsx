import React, { useState, useEffect } from "react";
import { X, RotateCcw, AlertTriangle } from "lucide-react";

export default function ReturnProcessModal({ order, onClose, onSubmit }) {
  // Map of item productId to quantity being returned
  const [returnQuantities, setReturnQuantities] = useState({});
  const [refundAmount, setRefundAmount] = useState(0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize return quantities to 0
  useEffect(() => {
    if (order && order.items) {
      const initial = {};
      order.items.forEach(item => {
        initial[item.productId] = 0;
      });
      setReturnQuantities(initial);
    }
  }, [order]);

  // Recalculate suggested refund amount when quantities change
  useEffect(() => {
    if (!order || !order.items) return;
    let suggested = 0;
    order.items.forEach(item => {
      const qty = returnQuantities[item.productId] || 0;
      suggested += qty * item.unitPrice;
    });
    // Adjust suggested refund proportionally based on overall order discount percentage
    if (order.subtotal > 0 && order.discountAmount > 0) {
      const discountPercentage = order.discountAmount / order.subtotal;
      suggested = Math.round(suggested * (1 - discountPercentage));
    }
    setRefundAmount(suggested);
  }, [returnQuantities, order]);

  const handleQuantityChange = (productId, val, max) => {
    const parsed = parseInt(val) || 0;
    const clamped = Math.max(0, Math.min(max, parsed));
    setReturnQuantities(prev => ({
      ...prev,
      [productId]: clamped
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build array of items with quantities > 0
    const returnedItems = Object.entries(returnQuantities)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .filter(item => item.quantity > 0);

    if (returnedItems.length === 0) {
      setError("Please select at least one item and quantity to return.");
      return;
    }

    if (refundAmount < 0) {
      setError("Refund amount cannot be negative.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const success = await onSubmit({
      orderId: order._id,
      returnedItems,
      refundAmount,
      note: note.trim() || undefined
    });

    setIsSubmitting(false);
    if (!success) {
      setError("Failed to process return. Ensure quantities do not exceed original order.");
    }
  };

  if (!order) return null;

  return (
    <div className="modal-overlay is-open">
      <div className="modal" style={{ maxWidth: "640px" }}>
        <div className="modal-header">
          <h2 className="modal-title">Process Return & Refund</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error is-visible">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="section-header">
            <h3 className="section-title">Select Items to Return</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered Qty</th>
                  <th>Unit Price</th>
                  <th style={{ width: "120px" }}>Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="item-name">
                      {item.productName}
                      {item.size && <div>Size: {item.size}</div>}
                    </td>
                    <td className="item-qty">{item.quantity}</td>
                    <td>UGX {item.unitPrice.toLocaleString()}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        className="form-input"
                        style={{ width: "80px" }}
                        value={returnQuantities[item.productId] ?? 0}
                        onChange={(e) => handleQuantityChange(item.productId, e.target.value, item.quantity)}
                        required
                        disabled={isSubmitting}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="refundAmount">Refund Amount (UGX)</label>
            <input
              id="refundAmount"
              type="number"
              min="0"
              className="form-input"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseInt(e.target.value) || 0)}
              required
              disabled={isSubmitting}
            />
            <p className="momo-hint">
              Suggested refund adjusts proportionally to coupon discounts.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note">Return Reason / Note</label>
            <textarea
              id="note"
              className="form-input"
              placeholder="e.g. Size didn't fit, customer requested swap/refund"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
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
              className={`btn btn--danger btn--md${isSubmitting ? " is-loading" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting && <span className="btn-spinner" />}
              Process Return
              {!isSubmitting && <RotateCcw size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
