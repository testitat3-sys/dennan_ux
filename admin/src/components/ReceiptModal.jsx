import React from "react";

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const formattedDate = new Date(receipt.date).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Use stored receipt number from DB; fall back to orderId suffix or timestamp
  const receiptNo = receipt.receiptNumber ||
    (receipt.orderId
      ? receipt.orderId.slice(-8).toUpperCase()
      : new Date(receipt.date).getTime().toString(36).toUpperCase().slice(-8));

  const hasDiscount = receipt.discountAmount && receipt.discountAmount > 0;
  const hasDeliveryFee = receipt.deliveryFee && receipt.deliveryFee > 0;
  const subtotal = receipt.subtotal ?? receipt.total;
  const grandTotal = receipt.total;

  // Normalise payments array
  const payments = receipt.payments || [];
  const methodLabels = {
    physical: "Cash",
    momo: "Mobile Money",
    card: "Card / POS",
    voucher: "Gift Voucher",
  };

  return (
    <div className="printable-receipt-modal" onClick={onClose}>
      <div className="printable-receipt-card" onClick={(e) => e.stopPropagation()}>

        <div className="receipt-print-wrapper">

          {/* ── Header ── */}
          <div className="receipt-header">
            <h2>DENNAN</h2>
            <p className="receipt-location">Shop L-1, MM Plaza, Luwum Street</p>
            <p className="receipt-contact">Tel: 0784 733314</p>
          </div>

          <div className="divider-dots" />

          {/* ── Meta ── */}
          <div className="receipt-meta">
            <div className="receipt-meta-row">
              <span>Date:</span>
              <span>{formattedDate}</span>
            </div>
            {receipt.customerName && (
              <div className="receipt-meta-row">
                <span>Name:</span>
                <span>{receipt.customerName}</span>
              </div>
            )}
            {receipt.customerPhone && (
              <div className="receipt-meta-row">
                <span>Phone:</span>
                <span>{receipt.customerPhone}</span>
              </div>
            )}
            <div className="receipt-meta-row">
              <span>Receipt No:</span>
              <span className="receipt-no">#{receiptNo}</span>
            </div>
            {receipt.cashier && (
              <div className="receipt-meta-row">
                <span>Cashier:</span>
                <span>{receipt.cashier}</span>
              </div>
            )}
          </div>

          <div className="divider-dots" />

          {/* ── Items ── */}
          <div className="receipt-items">
            <div className="receipt-items-header">
              <span style={{ flex: 1 }}>Item</span>
              <span className="receipt-col-qty">Qty</span>
              <span className="receipt-col-amt">Amount</span>
            </div>
            <div className="divider-dots" style={{ marginTop: "6px" }} />
            {receipt.items.map((item, idx) => (
              <div key={idx} className="receipt-item-row">
                <span className="receipt-item-name">{item.name}</span>
                <span className="receipt-col-qty">{item.quantity}</span>
                <span className="receipt-col-amt">
                  {(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="divider-dots" />

          {/* ── Totals ── */}
          <div className="receipt-totals">
            {(hasDiscount || hasDeliveryFee) && (
              <div className="receipt-total-row">
                <span>Subtotal</span>
                <span>UGX {subtotal.toLocaleString()}</span>
              </div>
            )}
            {hasDiscount && (
              <div className="receipt-total-row receipt-discount">
                <span>
                  Discount
                  {receipt.couponApplied ? ` (${receipt.couponApplied})` : ""}
                </span>
                <span>- UGX {receipt.discountAmount.toLocaleString()}</span>
              </div>
            )}
            {hasDeliveryFee && (
              <div className="receipt-total-row">
                <span>Delivery Fee</span>
                <span>UGX {receipt.deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="receipt-total-row receipt-grand-total">
              <span>AMOUNT DUE</span>
              <span>UGX {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="divider-dots" />

          {/* ── Payment Mode ── */}
          <div className="receipt-payment">
            {payments.length > 0 ? (
              payments.map((p, idx) => (
                <div key={idx} className="receipt-meta-row">
                  <span>{methodLabels[p.method] || p.method}:</span>
                  <span>UGX {p.amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="receipt-meta-row">
                <span>Payment Mode:</span>
                <span>{receipt.paymentMethod ? (methodLabels[receipt.paymentMethod] || receipt.paymentMethod) : "—"}</span>
              </div>
            )}
          </div>

          <div className="divider-dots" />

          {/* ── Footer ── */}
          <div className="receipt-footer">
            <p>Next time, order at <strong>dennan.ug</strong></p>
            <p>Thanks for shopping with us!</p>
          </div>

        </div>

        {/* ── Screen-only buttons ── */}
        <div className="receipt-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn--primary" onClick={() => window.print()}>
            Print
          </button>
        </div>

      </div>
    </div>
  );
}
