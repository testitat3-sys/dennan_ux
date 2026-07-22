import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import JsBarcode from "jsbarcode";

// No branch field exists on products/staff yet — hardcoded to this dashboard's
// single branch. Update if/when the app tracks branch per stock manager.
const BRANCH_CODE = "NB";

export default function BarcodeLabelModal({ product, displayName, onClose }) {
  const svgRef = useRef(null);
  const [orientation, setOrientation] = useState("portrait");

  useEffect(() => {
    if (!product?.barcode || !svgRef.current) return;
    JsBarcode(svgRef.current, product.barcode, {
      format: "CODE128",
      displayValue: false,
      width: 2,
      height: 32,
      margin: 2,
    });
  }, [product?.barcode]);

  // Rendered via portal onto document.body (outside #root) so printing can
  // hide the entire app (#root) without removing this modal along with it —
  // otherwise the hidden-but-still-in-flow dashboard pads print pagination
  // out to dozens of pages.
  useEffect(() => {
    document.body.classList.add("printing-barcode-label");
    return () => document.body.classList.remove("printing-barcode-label");
  }, []);

  if (!product) return null;

  return createPortal(
    <div className="printable-receipt-modal" onClick={onClose}>
      <div className="barcode-label-card" onClick={(e) => e.stopPropagation()}>

        <div className={`barcode-label-print-wrapper barcode-label-print-wrapper--${orientation}`}>
          <div className="barcode-label-code-text">{product.barcode}</div>
          <div className="barcode-label-name">{displayName ?? product.name}</div>
          <svg ref={svgRef} className="barcode-label-svg" />
          <div className="barcode-label-price">
            {BRANCH_CODE} UGX {(product.price ?? 0).toLocaleString()}
          </div>
        </div>

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
            Print
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
