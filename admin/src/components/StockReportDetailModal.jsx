import React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { X, ShoppingBag, Store, MessageCircle, Package, AlertCircle } from "lucide-react";

const CHANNEL_LABEL = {
  online: "Online",
  walk_in: "Walk-in",
  whatsapp: "WhatsApp",
};

const CHANNEL_CLASS = {
  online: "status-badge--dispatched",
  walk_in: "status-badge--done",
  whatsapp: "status-badge--packing",
};

const CHANNEL_ICON = {
  online: ShoppingBag,
  walk_in: Store,
  whatsapp: MessageCircle,
};

const STATUS_CLASS = {
  delivered: "status-badge--done",
  returned: "status-badge--returned",
  partially_returned: "status-badge--partially-returned",
};

function formatDate(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Drill-down modal for a Stock Report row.
 *
 * Props:
 *   product   — the clicked row: { productId, name, sku, barcode, quantitySoldInRange, inventory }
 *   token     — staff auth token
 *   startDate — date range start (YYYY-MM-DD)
 *   endDate   — date range end   (YYYY-MM-DD)
 *   onClose   — callback to clear selection
 *
 * The underlying Convex query is gated with "skip" so it only fires when
 * product !== null. Closing the modal resets the parent state to null, which
 * immediately stops the subscription.
 */
export default function StockReportDetailModal({
  product,
  token,
  startDate,
  endDate,
  onClose,
}) {
  // Only fires when a row is selected — zero cost otherwise.
  const orders = useQuery(
    api.products.getProductOrdersInRange,
    product
      ? { token, productId: product.productId, startDate, endDate }
      : "skip"
  );

  if (!product) return null;

  const isLoading = orders === undefined;
  const isEmpty = !isLoading && orders.length === 0;

  const totalUnits = !isLoading && !isEmpty
    ? orders.reduce((s, r) => s + r.quantityOfProduct, 0)
    : 0;
  const totalValue = !isLoading && !isEmpty
    ? orders.reduce((s, r) => s + r.grandTotal, 0)
    : 0;

  return (
    <div
      className="modal-overlay is-open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal customer-modal"
        style={{ maxWidth: "800px", width: "95vw", display: "flex", flexDirection: "column" }}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          <div>
            <h2
              className="modal-title"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Package size={18} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
              {product.name}
            </h2>
            <span className="modal-subtitle">
              {product.sku && <><strong>SKU:</strong> {product.sku}&nbsp;&nbsp;·&nbsp;&nbsp;</>}
              {product.barcode && <><strong>Barcode:</strong> {product.barcode}&nbsp;&nbsp;·&nbsp;&nbsp;</>}
              <strong>{product.quantitySoldInRange}</strong> units sold in range&nbsp;&nbsp;·&nbsp;&nbsp;
              <strong>{product.inventory}</strong> in stock
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* ── Date-range context strip ── */}
        <div
          style={{
            padding: "8px 20px",
            background: "var(--surface-raised)",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: "12px",
            color: "var(--text-tertiary)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <AlertCircle size={12} />
          Completed orders containing this product from&nbsp;
          <strong style={{ color: "var(--text-secondary)" }}>{startDate}</strong>
          &nbsp;to&nbsp;
          <strong style={{ color: "var(--text-secondary)" }}>{endDate}</strong>
        </div>

        {/* ── Body / table ── */}
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            maxHeight: "55vh",
          }}
        >
          {isLoading ? (
            <div className="empty-state">
              <div className="empty-title">Loading order details…</div>
            </div>
          ) : isEmpty ? (
            <div className="empty-state">
              <div className="empty-title">
                No completed orders found for this product in this date range.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Channel</th>
                    <th style={{ textAlign: "center" }}>Qty Bought</th>
                    <th>Order Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => {
                    const ChannelIcon = CHANNEL_ICON[row.channel] ?? Package;
                    return (
                      <tr key={row.orderId}>
                        <td>
                          <strong>{row.customerName}</strong>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${CHANNEL_CLASS[row.channel] ?? "status-badge--new"}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <ChannelIcon size={11} />
                            {CHANNEL_LABEL[row.channel] ?? row.channel}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <strong style={{ color: "var(--accent-primary)", fontSize: "15px" }}>
                            {row.quantityOfProduct}
                          </strong>
                        </td>
                        <td>UGX {row.grandTotal.toLocaleString()}</td>
                        <td>
                          <span
                            className={`status-badge ${STATUS_CLASS[row.status] ?? "status-badge--new"}`}
                          >
                            <span className="status-dot" />
                            {row.status.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(row.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer summary ── */}
        {!isLoading && !isEmpty && (
          <div
            style={{
              padding: "10px 20px",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--surface-raised)",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              display: "flex",
              gap: "var(--space-5)",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <span>
              <strong style={{ color: "var(--text-primary)" }}>{orders.length}</strong>{" "}
              order{orders.length !== 1 ? "s" : ""}
            </span>
            <span>
              <strong style={{ color: "var(--text-primary)" }}>{totalUnits}</strong>{" "}
              total units across all orders
            </span>
            <span>
              UGX{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {totalValue.toLocaleString()}
              </strong>{" "}
              combined order value
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
