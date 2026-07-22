import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import JsBarcode from "jsbarcode";

// No branch field exists on products/staff yet — hardcoded to this dashboard's
// single branch. Update if/when the app tracks branch per stock manager.
const BRANCH_CODE = "NB";

export default function BulkBarcodePrintModal({ products, onClose }) {
  const svgRefs = useRef([]);
  const [orientation, setOrientation] = useState("portrait");

  useEffect(() => {
    (products || []).forEach((p, i) => {
      const el = svgRefs.current[i];
      if (!el || !p.barcode) return;
      JsBarcode(el, p.barcode, {
        format: "CODE128",
        displayValue: false,
        width: 2,
        height: 32,
        margin: 2,
      });
    });
  }, [products]);

  // Rendered via portal onto document.body (outside #root), reusing the same
  // print rules as BarcodeLabelModal (see StaffPortal.css) so each product
  // prints on its own 40mm x 30mm label.
  useEffect(() => {
    document.body.classList.add("printing-barcode-label");
    return () => document.body.classList.remove("printing-barcode-label");
  }, []);

  if (!products || products.length === 0) return null;

  return createPortal(
    <div className="printable-receipt-modal" onClick={onClose}>
      <div className="barcode-label-card barcode-label-card--bulk" onClick={(e) => e.stopPropagation()}>
        {products.map((p, i) => (
          <div
            className={`barcode-label-print-wrapper barcode-label-print-wrapper--bulk barcode-label-print-wrapper--${orientation}`}
            key={p.barcode || i}
          >
            <div className="barcode-label-code-text">{p.barcode}</div>
            <div className="barcode-label-name">{p.name}</div>
            <svg ref={(el) => (svgRefs.current[i] = el)} className="barcode-label-svg" />
            <div className="barcode-label-price">
              {BRANCH_CODE} UGX {(p.price ?? 0).toLocaleString()}
            </div>
          </div>
        ))}

        <div className="barcode-orientation-toggle">
          <button
            type="button"
            className={`btn btn--sm ${orientation === "portrait" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => setOrientation("portrait")}
          >
            Portrait
          </button>
          <button
            type="button"
            className={`btn btn--sm ${orientation === "landscape" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => setOrientation("landscape")}
          >
            Landscape
          </button>
        </div>

        <div className="receipt-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            <X size={14} />
            Close
          </button>
          <button type="button" className="btn btn--primary" onClick={() => window.print()}>
            <Printer size={14} />
            Print All ({products.length})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
