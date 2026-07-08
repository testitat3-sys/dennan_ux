import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { CheckCircle, XCircle } from "lucide-react";

export default function ReturnsPanel({ token }) {
  const pendingReturns = useQuery(api.returns.getPendingReturns, { token });
  const approveReturnItem = useMutation(api.returns.approveReturnItem);
  const rejectReturnItem = useMutation(api.returns.rejectReturnItem);

  const handleApprove = async (returnItemId) => {
    try {
      await approveReturnItem({ token, returnItemId });
    } catch (err) {
      alert("Failed to approve return item: " + err.message);
    }
  };

  const handleReject = async (returnItemId) => {
    const rejectedReason = window.prompt("Reason for rejecting this item (optional):") || undefined;
    try {
      await rejectReturnItem({ token, returnItemId, rejectedReason });
    } catch (err) {
      alert("Failed to reject return item: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">Pending Returns</h1>

      {pendingReturns === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading pending returns...</div>
        </div>
      ) : pendingReturns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No returns awaiting approval.</div>
          <div className="empty-sub">Delivery-failure and customer returns will appear here for per-item approval.</div>
        </div>
      ) : (
        <div className="returns-panel-list">
          {pendingReturns.map((ret) => (
            <div key={ret.returnId} className="returns-panel-card">
              <div className="returns-panel-card-header">
                <div>
                  <strong>{ret.customerName}</strong>
                  <div className="returns-panel-meta">
                    Submitted by {ret.staffName} on {new Date(ret.createdAt).toLocaleString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </div>
                  {ret.note && <div className="returns-panel-note">Note: {ret.note}</div>}
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Reason</th>
                      <th>Source</th>
                      <th style={{ width: "160px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ret.items.map((item) => (
                      <tr key={item._id}>
                        <td className="item-name">{item.productName}</td>
                        <td className="item-qty">{item.quantity}</td>
                        <td>UGX {item.unitPrice.toLocaleString()}</td>
                        <td>{item.reason || "—"}</td>
                        <td>{item.source === "delivery_failure" ? "Delivery Failure" : "Manual Return"}</td>
                        <td className="td-action">
                          <div style={{ display: "flex", gap: "5px" }}>
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => handleApprove(item._id)}
                              title="Approve and restock"
                            >
                              <CheckCircle size={13} />
                            </button>
                            <button
                              className="btn btn--ghost btn--danger btn--sm"
                              onClick={() => handleReject(item._id)}
                              title="Reject"
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
