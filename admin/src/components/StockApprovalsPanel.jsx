import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { CheckCircle, XCircle } from "lucide-react";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

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

  const {
    processedData: filteredRequests,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    filterValues,
    setFilterValue,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter(pendingRequests || [], {
    searchFields: ["staffName", "reason", (req) => req.items.map((i) => i.productName).join(" ")],
    initialSort: { key: "createdAt", direction: "desc" },
  });

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
      await approveBatch({ token, requestId });
      notify("All items in request approved.", "success");
    } catch (err) {
      notify("Failed to approve request: " + err.message, "error");
    }
  };

  const handleRejectBatch = async (requestId, reason) => {
    try {
      await rejectBatch({ token, requestId, rejectedReason: reason || undefined });
      notify("All items in request rejected.", "success");
    } catch (err) {
      notify("Failed to reject request: " + err.message, "error");
    } finally {
      setRejectingRequestId(null);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Stock Decrease & Transfer Approvals</h1>
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
          Review staff requests for manual stock adjustments and product edits
        </p>
      </div>

      <TableFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter approval requests by staff, reason, product..."
        filterValues={filterValues}
        onFilterChange={(key, val) => setFilterValue(key, val)}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {pendingRequests === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading stock requests...</div>
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No pending stock requests.</div>
          <div className="empty-sub">When staff submit stock decreases or product edits, they will appear here.</div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No requests match search filter.</div>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: "12px" }} onClick={resetFilters}>
            Clear Filter
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {filteredRequests.map((group) => (
            <div key={group.requestId} className="product-edit-card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-3)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "var(--title-sm)", color: "var(--text-primary)" }}>
                    Request by {group.staffName}
                  </strong>
                  <span style={{ marginLeft: "12px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    {new Date(group.createdAt).toLocaleString()}
                  </span>
                  {group.reason && (
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      Reason: <em>{group.reason}</em>
                    </div>
                  )}
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
                      <SortableHeader sortKey="productName" sortConfig={sortConfig} onRequestSort={requestSort}>
                        Product
                      </SortableHeader>
                      <SortableHeader sortKey="beforeInventory" sortConfig={sortConfig} onRequestSort={requestSort}>
                        Current Inventory
                      </SortableHeader>
                      <SortableHeader sortKey="requestedInventory" sortConfig={sortConfig} onRequestSort={requestSort}>
                        Requested Change
                      </SortableHeader>
                      <SortableHeader sortKey="afterInventory" sortConfig={sortConfig} onRequestSort={requestSort}>
                        Resulting Inventory
                      </SortableHeader>
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
                              <td>{item.beforeInventory}</td>
                              <td style={{ color: "var(--color-support-red, #ef4444)", fontWeight: 600 }}>
                                {item.requestedInventory - item.beforeInventory}
                              </td>
                              <td><strong>{item.requestedInventory}</strong></td>
                            </>
                          )}
                          <td className="td-action">
                            {rejectingItemId === item._id ? (
                              <RejectReasonRow
                                onConfirm={(reason) => handleRejectItem(item._id, reason)}
                                onCancel={() => setRejectingItemId(null)}
                              />
                            ) : (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => handleApproveItem(item._id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => setRejectingItemId(item._id)}
                                >
                                  Reject
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
