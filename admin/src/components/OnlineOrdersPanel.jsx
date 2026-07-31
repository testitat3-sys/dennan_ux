import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import OrderDetailModal from "./OrderDetailModal";
import ReceiptModal from "./ReceiptModal";
import HandoverModal from "./HandoverModal";
import DeliveryFailureModal from "./DeliveryFailureModal";
import LiveTimer from "./LiveTimer";
import {
  Sparkles,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";

function getStatusModifier(status) {
  switch (status) {
    case "pending_cod":
    case "preparing": return "new";
    case "packing": return "packing";
    case "dispatched": return "dispatched";
    case "delivered": return "done";
    case "failed": return "failed";
    case "returned": return "returned";
    case "partially_returned": return "partially-returned";
    default: return "new";
  }
}

function formatDuration(ms) {
  if (!ms || ms < 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function OnlineOrdersPanel({ token }) {
  const navigate = useNavigate();
  const [ordersTab, setOrdersTab] = useState("pending");
  const [viewingOrder, setViewingOrder] = useState(null);
  const [handoverOrderId, setHandoverOrderId] = useState(null);
  const [failureOrder, setFailureOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  const buildReceiptFromOrder = (order) => ({
    orderId: order._id,
    receiptNumber: order.receiptNumber,
    date: new Date(order.createdAt),
    cashier: order.claimantName || "Staff",
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items?.map(i => ({
      name: i.productName,
      quantity: i.quantity,
      price: i.unitPrice,
    })) || [],
    payments: order.payments || [],
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    deliveryFee: order.deliveryFee || 0,
    couponApplied: order.couponApplied,
    total: order.grandTotal,
  });

  const { results: ordersList, status: ordersStatus, loadMore: loadMoreOrders } = usePaginatedQuery(
    api.orders.getOrdersForStaff,
    { token },
    { initialNumItems: 50 }
  );

  const claimOrderMutation = useMutation(api.orders.claimOrder);
  const handoverMutation = useMutation(api.orders.handoverToDelivery);
  const completeOrderMutation = useMutation(api.orders.completeOrder);
  const reportDeliveryFailureMutation = useMutation(api.orders.reportDeliveryFailure);

  const handleClaimOrder = async (orderId) => {
    try {
      await claimOrderMutation({ token, orderId });
    } catch (err) {
      alert("Failed to claim order: " + err.message);
    }
  };

  const handleHandoverSubmit = async (data) => {
    try {
      await handoverMutation({
        token,
        orderId: data.orderId,
        deliveryPersonName: data.deliveryPersonName,
        riderPhone: data.riderPhone,
        expectedDeliveryTime: data.expectedDeliveryTime
      });
      setHandoverOrderId(null);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await completeOrderMutation({ token, orderId });
    } catch (err) {
      alert("Error completing order: " + err.message);
    }
  };

  const handleReportDeliveryFailure = async (data) => {
    try {
      await reportDeliveryFailureMutation({
        token,
        orderId: data.orderId,
        failedItems: data.failedItems,
        note: data.note
      });
      setFailureOrder(null);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const pendingOrders = ordersList?.filter(o => o.status === "preparing" || o.status === "pending_cod") || [];
  const packingOrders = ordersList?.filter(o => o.status === "packing") || [];
  const dispatchedOrders = ordersList?.filter(o => o.status === "dispatched") || [];
  const deliveredOrders = ordersList?.filter(o => o.status === "delivered") || [];
  const failedOrders = ordersList?.filter(o => o.status === "failed") || [];

  const ORDERS_TABS = [
    { key: "pending", label: "Pending", icon: Sparkles, orders: pendingOrders },
    { key: "packing", label: "Packing", icon: Package, orders: packingOrders },
    { key: "dispatched", label: "Dispatched", icon: Truck, orders: dispatchedOrders },
    { key: "delivered", label: "Delivered", icon: CheckCircle, orders: deliveredOrders },
    { key: "failed", label: "Failed", icon: XCircle, orders: failedOrders },
  ];
  const activeTabInfo = ORDERS_TABS.find(t => t.key === ordersTab);
  const activeOrdersList = activeTabInfo.orders;

  const handoverOrder = handoverOrderId ? ordersList?.find(o => o._id === handoverOrderId) : null;

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Online Orders</h1>
      </div>

      <div className="tab-strip">
        {ORDERS_TABS.map(({ key, label, icon: Icon, orders }) => (
          <button
            key={key}
            className={`tab-btn ${ordersTab === key ? "is-active" : ""}`}
            onClick={() => setOrdersTab(key)}
          >
            <Icon size={15} />
            <span>{label}</span>
            {orders.length > 0 && (
              <span className={`tab-count-badge ${key === "pending" ? "tab-count-badge--alert" : ""}`}>
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="order-feed">
        {ordersList === undefined ? (
          <div className="empty-state">
            <div className="empty-title">Syncing queue...</div>
          </div>
        ) : activeOrdersList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No orders in {activeTabInfo.label.toLowerCase()}.</div>
          </div>
        ) : (
          activeOrdersList.map(order => {
            const claimDuration = formatDuration(order.timeToClaim);
            return (
              <article
                key={order._id}
                className={`order-row order-row--${getStatusModifier(order.status)}`}
                onClick={() => setViewingOrder(order)}
              >
                <div className="order-row-main">
                  <h2 className="order-row-name" title={order.customerName}>{order.customerName}</h2>
                  <div className="order-meta-line">
                    <span>UGX {order.grandTotal.toLocaleString()}</span>
                    <span className="meta-separator">·</span>
                    <span>Zone: {order.deliveryAddress?.zone}</span>
                  </div>
                </div>

                {order.claimantName && (
                  <span className="claimed-chip" title={order.claimantName}>
                    <span className="mini-avatar">{order.claimantName[0]}</span>
                    <span className="claimed-chip-name">{order.claimantName}</span>
                  </span>
                )}

                <div className="order-row-timer">
                  {(order.status === "preparing" || order.status === "pending_cod") && (
                    <LiveTimer sinceTimestamp={order.createdAt} label="Waiting" warningThresholdSeconds={300} />
                  )}
                  {order.status === "packing" && (
                    <LiveTimer sinceTimestamp={order.claimedAt} label="Packing" warningThresholdSeconds={900} />
                  )}
                  {["dispatched", "delivered", "failed"].includes(order.status) && claimDuration && (
                    <span className="live-timer">Claimed in {claimDuration}</span>
                  )}
                </div>

                <span className={`status-badge status-badge--${getStatusModifier(order.status)}`}>
                  <span className="status-dot" />
                  {order.status.toUpperCase()}
                </span>

                <ChevronRight size={16} className="order-row-chevron" />
              </article>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onOpenReturn={(order) => navigate(`/admin/orders/${order._id}/exchange`)}
          onClaim={(id) => { handleClaimOrder(id); setViewingOrder(null); }}
          onPrintReceipt={(order) => { setLastReceipt(buildReceiptFromOrder(order)); setShowReceipt(true); }}
          onDispatch={(id) => { setViewingOrder(null); setHandoverOrderId(id); }}
          onComplete={(id) => { handleCompleteOrder(id); setViewingOrder(null); }}
          onMarkFailed={(order) => { setViewingOrder(null); setFailureOrder(order); }}
          token={token}
        />
      )}

      {/* Rider Handover Modal */}
      {handoverOrderId && (
        <HandoverModal
          orderId={handoverOrderId}
          customerName={handoverOrder?.customerName}
          customerPhone={handoverOrder?.customerPhone}
          deliveryAddress={handoverOrder?.deliveryAddress}
          onClose={() => setHandoverOrderId(null)}
          onSubmit={handleHandoverSubmit}
        />
      )}

      {/* Delivery failure / returns-to-approval modal */}
      {failureOrder && (
        <DeliveryFailureModal
          order={failureOrder}
          onClose={() => setFailureOrder(null)}
          onSubmit={handleReportDeliveryFailure}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <ReceiptModal
          receipt={lastReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
