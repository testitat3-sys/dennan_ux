import React, { useState, useEffect } from "react";
import { X, AlertTriangle, XCircle } from "lucide-react";

// Reports a failed/undelivered order. All items are checked by default (i.e. assumed
// undelivered/returned) — staff uncheck anything that was actually delivered
// successfully so only the checked items get submitted into the returns-approval
// pipeline via reportDeliveryFailure.
export default function DeliveryFailureModal({ order, onClose, onSubmit }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [quantities, setQuantities] = useState({});
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (order && order.items) {
      const checked = {};
      const qty = {};
      order.items.forEach((item) => {
        checked[item.productId] = true;
        qty[item.productId] = item.quantity;
      });
      setCheckedItems(checked);
      setQuantities(qty);
    }
  }, [order]);

  const handleToggle = (productId) => {
    setCheckedItems((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleQuantityChange = (productId, val, max) => {
    const parsed = parseInt(val) || 0;
    const clamped = Math.max(0, Math.min(max, parsed));
    setQuantities((prev) => ({ ...prev, [productId]: clamped }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const failedItems = (order.items || [])
      .filter((item) => checkedItems[item.productId] && (quantities[item.productId] || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: quantities[item.productId],
      }));

    setError("");
    setIsSubmitting(true);

    const success = await onSubmit({
      orderId: order._id,
      failedItems,
      note: note.trim() || undefined,
    });

    setIsSubmitting(false);
    if (!success) {
      setError("Failed to report delivery failure. Please try again.");
    }
  };

  if (!order) return null;

  return (
    <div className="modal-overlay is-open">
      <div className="modal" style={{ maxWidth: "640px" }}>
        <div className="modal-header">
          <h2 className="modal-title">Report Delivery Failure</h2>
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

          <p className="momo-hint">
            All items are checked by default — uncheck anything that was actually
            delivered. Checked items will be submitted for admin return approval.
          </p>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>Product</th>
                  <th>Ordered Qty</th>
                  <th style={{ width: "120px" }}>Failed Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!checkedItems[item.productId]}
                        onChange={() => handleToggle(item.productId)}
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="item-name">
                      {item.productName}
                      {item.size && <div>Size: {item.size}</div>}
                    </td>
                    <td className="item-qty">{item.quantity}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        className="form-input"
                        style={{ width: "80px" }}
                        value={quantities[item.productId] ?? item.quantity}
                        onChange={(e) => handleQuantityChange(item.productId, e.target.value, item.quantity)}
                        disabled={isSubmitting || !checkedItems[item.productId]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="failureNote">Reason</label>
            <textarea
              id="failureNote"
              className="form-input"
              placeholder="e.g. Customer unreachable, wrong address, refused delivery"
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
              Mark Failed
              {!isSubmitting && <XCircle size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
