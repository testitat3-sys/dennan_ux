import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Copy, Check, X, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function ReceiptModal({ receipt, onClose }) {
  const receiptRef = useRef(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Scopes the receipt @media print rules (StaffPortal.css) to this modal only,
  // so they don't clobber other print flows (e.g. BarcodeLabelModal) that are
  // mounted inside #root at the same time.
  useEffect(() => {
    document.body.classList.add("printing-receipt");
    return () => document.body.classList.remove("printing-receipt");
  }, []);

  if (!receipt) return null;

  const isReturn = receipt.isReturn || receipt.type === "return";

  const formattedDate = new Date(receipt.date).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Use stored receipt number from DB; fall back to returnId/orderId suffix or timestamp
  const receiptNo = receipt.receiptNumber ||
    (receipt.returnId
      ? receipt.returnId.slice(-8).toUpperCase()
      : receipt.orderId
      ? receipt.orderId.slice(-8).toUpperCase()
      : new Date(receipt.date).getTime().toString(36).toUpperCase().slice(-8));

  const hasDiscount = receipt.discountAmount && receipt.discountAmount > 0;
  const hasDeliveryFee = receipt.deliveryFee && receipt.deliveryFee > 0;
  const subtotal = receipt.subtotal ?? receipt.total ?? 0;
  const grandTotal = receipt.total ?? 0;

  // Normalise payments array
  const payments = receipt.payments || [];
  const methodLabels = {
    physical: "Cash",
    momo: "Mobile Money",
    card: "Card / POS",
    voucher: "Gift Voucher",
  };

  const returnedItems = receipt.returnedItems || (isReturn ? receipt.items : []) || [];
  const exchangeItems = receipt.exchangeItems || [];
  const returnedTotal = receipt.returnedTotal ?? returnedItems.reduce((s, i) => s + (i.price || i.unitPrice || 0) * i.quantity, 0);
  const exchangeTotal = receipt.exchangeTotal ?? exchangeItems.reduce((s, i) => s + (i.price || i.unitPrice || 0) * i.quantity, 0);
  const topUpAmount = receipt.topUpAmount || 0;
  const topUpMethod = receipt.topUpMethod;

  const handleCopyImage = async () => {
    if (!receiptRef.current || copying) return;
    setCopying(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          // Fallback: download the image if clipboard write is blocked
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `receipt-${receiptNo}.png`;
          a.click();
          URL.revokeObjectURL(url);
        } finally {
          setCopying(false);
        }
      }, "image/png");
    } catch (err) {
      console.error("Failed to capture receipt:", err);
      setCopying(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const element = receiptRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const namePrefix = (receipt.customerName && receipt.customerName.trim()) || "client";
      const pdfFileName = `${namePrefix} dennan ${isReturn ? "return " : ""}receipt.pdf`;

      const width = element.offsetWidth;
      const height = element.offsetHeight;

      const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "pt",
        format: [width, height],
      });
      pdf.addImage(canvas, "PNG", 0, 0, width, height);
      pdf.save(pdfFileName);
    } catch (err) {
      console.error("Failed to generate PDF receipt:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return createPortal(
    <div className="printable-receipt-modal" onClick={onClose}>
      <div className="printable-receipt-card" onClick={(e) => e.stopPropagation()}>

        <div className="receipt-print-wrapper" ref={receiptRef}>

          {/* ── Header ── */}
          <div className="receipt-header">
            <h2>DENNAN</h2>
            <p className="receipt-location">Ntinda Complex GF-02 · 0784 733314</p>
            <p className="receipt-location">MM Plaza L-01 · 0786 690058</p>
            {isReturn && (
              <p style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", color: "#111111", marginTop: 4 }}>
                {exchangeItems.length > 0 ? "RETURN & EXCHANGE RECEIPT" : "RETURN RECEIPT"}
              </p>
            )}
            {receipt.pendingSync && (
              <p style={{ fontWeight: 700, color: "#b45309", marginTop: 4 }}>
                RECORDED OFFLINE — PENDING SYNC
              </p>
            )}
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
            {receipt.orderReceiptNumber && (
              <div className="receipt-meta-row">
                <span>Original Order:</span>
                <span>#{receipt.orderReceiptNumber}</span>
              </div>
            )}
            {receipt.cashier && (
              <div className="receipt-meta-row">
                <span>Staff:</span>
                <span>{receipt.cashier}</span>
              </div>
            )}
          </div>

          <div className="divider-dots" />

          {/* ── Items Section ── */}
          {isReturn ? (
            <>
              {/* Returned Items */}
              {returnedItems.length > 0 && (
                <div className="receipt-items" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, textTransform: "uppercase" }}>
                    Returned Items
                  </div>
                  <div className="receipt-items-header">
                    <span style={{ flex: 1 }}>Item</span>
                    <span className="receipt-col-qty">Qty</span>
                    <span className="receipt-col-amt">Amount</span>
                  </div>
                  <div className="divider-dots" style={{ marginTop: "4px" }} />
                  {returnedItems.map((item, idx) => (
                    <div key={idx} className="receipt-item-row">
                      <span className="receipt-item-name">{item.name || item.productName}</span>
                      <span className="receipt-col-qty">{item.quantity}</span>
                      <span className="receipt-col-amt">
                        {((item.price || item.unitPrice || 0) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="receipt-total-row" style={{ marginTop: 6, fontWeight: 600 }}>
                    <span>Returned Value</span>
                    <span>UGX {returnedTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Exchange Items */}
              {exchangeItems.length > 0 && (
                <div className="receipt-items" style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, textTransform: "uppercase" }}>
                    Exchange Items
                  </div>
                  <div className="receipt-items-header">
                    <span style={{ flex: 1 }}>Item</span>
                    <span className="receipt-col-qty">Qty</span>
                    <span className="receipt-col-amt">Amount</span>
                  </div>
                  <div className="divider-dots" style={{ marginTop: "4px" }} />
                  {exchangeItems.map((item, idx) => (
                    <div key={idx} className="receipt-item-row">
                      <span className="receipt-item-name">{item.name || item.productName}</span>
                      <span className="receipt-col-qty">{item.quantity}</span>
                      <span className="receipt-col-amt">
                        {((item.price || item.unitPrice || 0) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="receipt-total-row" style={{ marginTop: 6, fontWeight: 600 }}>
                    <span>Exchange Value</span>
                    <span>UGX {exchangeTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
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
          )}

          <div className="divider-dots" />

          {/* ── Totals ── */}
          {isReturn ? (
            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Returned Value</span>
                <span>UGX {returnedTotal.toLocaleString()}</span>
              </div>
              {exchangeItems.length > 0 && (
                <div className="receipt-total-row">
                  <span>Exchange Value</span>
                  <span>UGX {exchangeTotal.toLocaleString()}</span>
                </div>
              )}
              {topUpAmount > 0 && (
                <div className="receipt-total-row receipt-grand-total">
                  <span>TOP-UP PAID</span>
                  <span>UGX {topUpAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
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
          )}

          <div className="divider-dots" />

          {/* ── Payment Mode ── */}
          <div className="receipt-payment">
            {isReturn ? (
              topUpAmount > 0 ? (
                <div className="receipt-meta-row">
                  <span>Top-Up Payment Method:</span>
                  <span>{methodLabels[topUpMethod] || topUpMethod || "Cash"}</span>
                </div>
              ) : (
                <div className="receipt-meta-row">
                  <span>Return Status:</span>
                  <span>Completed (No Top-Up Required)</span>
                </div>
              )
            ) : payments.length > 0 ? (
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
            <X size={14} />
            Close
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={handleCopyImage}
            disabled={copying}
            title="Copy receipt as image"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copying ? "Copying…" : copied ? "Copied!" : "Copy Image"}
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Download receipt as PDF"
          >
            {downloadingPdf ? <Check size={14} /> : <Download size={14} />}
            {downloadingPdf ? "Generating…" : "Download PDF"}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => window.print()}>
            <Printer size={14} />
            Print
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
