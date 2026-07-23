import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { CheckCircle, XCircle } from "lucide-react";

/** Small inline reason field used for per-item and per-batch rejections. */
function RejectReasonRow({ onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <input
        type="text"
        className="form-input"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ maxWidth: "220px" }}
        autoFocus
      />
      <button className="btn btn--secondary btn--sm" onClick={() => onConfirm(reason)}>
        Confirm Reject
      </button>
      <button className="btn btn--ghost btn--sm" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export default function StockApprovalsPanel({ token, showToast }) {
  const pendingRequests = useTrackedQuery(api.stockRequests.getPendingStockRequests, { token });
  const approveItem = useMutation(api.stockRequests.approveStockRequestItem);
  const rejectItem = useMutation(api.stockRequests.rejectStockRequestItem);
  const approveBatch = useMutation(api.stockRequests.approveStockRequestBatch);
  const rejectBatch = useMutation(api.stockRequests.rejectStockRequestBatch);

  const [rejectingItemId, setRejectingItemId] = useState(null);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);

  const notify = (message, type) => {
    if (showToast) showToast(message, type);
    else if (type === "error") alert(message);
  };

  const handleApproveItem = async (itemId) => {
    try {
      await approveItem({ token, itemId });
      notify("Item approved and inventory updated.", "success");
    } catch (err) {
      notify("Failed to approve item: " + err.message, "error");
    }
  };

  const handleRejectItem = async (itemId, reason) => {
    try {
      await rejectItem({ token, itemId, rejectedReason: reason || undefined });
      notify("Item rejected.", "success");
    } catch (err) {
      notify("Failed to reject item: " + err.message, "error");
    } finally {
      setRejectingItemId(null);
    }
  };

  const handleApproveBatch = async (requestId) => {
    try {
      const result = await approveBatch({ token, requestId });
      if (result.failedItems.length > 0) {
        notify(
          `Approved ${result.approvedCount} item(s); ${result.failedItems.length} failed (inventory may have drifted).`,
          "error"
        );
      } else {
        notify(`Approved ${result.approvedCount} item(s).`, "success");
      }
    } catch (err) {
      notify("Failed to approve batch: " + err.message, "error");
    }
  };

  const handleRejectBatch = async (requestId, reason) => {
    try {
      const result = await rejectBatch({ token, requestId, rejectedReason: reason || undefined });
      notify(`Rejected ${result.rejectedCount} item(s).`, "success");
    } catch (err) {
      notify("Failed to reject batch: " + err.message, "error");
    } finally {
      setRejectingRequestId(null);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Stock Approvals</h1>
      </div>

      {pendingRequests === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading pending stock requests...</div>
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No pending stock decrease requests.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {pendingRequests.map((group) => (
            <div key={group.requestId} className="returns-panel-card" style={{ padding: "var(--space-3) var(--space-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                <div>
                  <strong>{group.staffName}</strong>
                  <div className="returns-panel-meta">
                    Submitted {new Date(group.submittedAt).toLocaleString()}
                  </div>
                </div>
                {rejectingRequestId === group.requestId ? (
                  <RejectReasonRow
                    onConfirm={(reason) => handleRejectBatch(group.requestId, reason)}
                    onCancel={() => setRejectingRequestId(null)}
                  />
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => handleApproveBatch(group.requestId)}
                    >
                      <CheckCircle size={12} /> Approve All
                    </button>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => setRejectingRequestId(group.requestId)}
                    >
                      <XCircle size={12} /> Reject All
                    </button>
                  </div>
                )}
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Inventory</th>
                      <th>Requested Change</th>
                      <th>Resulting Inventory</th>
                      <th style={{ width: "220px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => {
                      const isNameChange = item.kind === "name_change";
                      const isCreateProduct = item.kind === "create_product";
                      const isBulkUpload = item.kind === "bulk_upload";
                      return (
                      <tr key={item._id}>
                        <td>{item.productName}</td>
                        {isNameChange ? (
                          <td colSpan={3}>
                            Rename: <strong>{item.currentName}</strong> → <strong>{item.requestedName}</strong>
                          </td>
                        ) : isCreateProduct ? (
                          <td colSpan={3}>
                            Create New Product — Brand: <strong>{item.productData?.brand || "no-brand"}</strong> | Price: <strong>UGX {item.productData?.price?.toLocaleString() ?? 0}</strong> | Initial Inv: <strong>{item.requestedInventory}</strong>
                          </td>
                        ) : isBulkUpload ? (
                          <td colSpan={3}>
                            Bulk Upload Catalog — <strong>{item.productData?.rows?.length ?? 0} product(s)</strong> in file
                          </td>
                        ) : (
                          <>
                            <td>{item.currentInventoryAtStage}</td>
                            <td>{item.requestedDelta}</td>
                            <td>{item.requestedInventory}</td>
                          </>
                        )}
                        <td>
                          {rejectingItemId === item._id ? (
                            <RejectReasonRow
                              onConfirm={(reason) => handleRejectItem(item._id, reason)}
                              onCancel={() => setRejectingItemId(null)}
                            />
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                className="btn btn--primary btn--sm"
                                onClick={() => handleApproveItem(item._id)}
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                className="btn btn--secondary btn--sm"
                                onClick={() => setRejectingItemId(item._id)}
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
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
