import React, { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { Receipt, AlertTriangle, FileText, CheckCircle, Ban, History, X } from "lucide-react";
import ExpenseNameCombobox from "./ExpenseNameCombobox";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

const EMPTY_FORM = { voucherNumber: "", name: "", amount: "", note: "" };

const VOID_REASONS = [
  "Duplicate Entry / Double Logged",
  "Voucher Cancelled / Unpaid",
  "Vendor Refunded / Returned",
  "Data Entry Amount Error",
  "Unauthorized Entry",
  "Other Reason",
];

export default function BusinessExpensesPanel({ token }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Status Filter: "active" | "voided" | "all"
  const [statusTab, setStatusTab] = useState("active");

  // Modal State for Soft Voiding
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState(VOID_REASONS[0]);
  const [voidNote, setVoidNote] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  // Expanded Audit History drawer row ID
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  const rawExpenses = useTrackedQuery(api.businessExpenses.listBusinessExpenses, { token });
  const createExpense = useMutation(api.businessExpenses.createBusinessExpense);
  const voidExpense = useMutation(api.businessExpenses.voidBusinessExpense);

  const filteredRawExpenses = useMemo(() => {
    if (!rawExpenses) return [];
    if (statusTab === "active") {
      return rawExpenses.filter((ex) => !ex.isVoided);
    }
    if (statusTab === "voided") {
      return rawExpenses.filter((ex) => ex.isVoided);
    }
    return rawExpenses;
  }, [rawExpenses, statusTab]);

  const activeCount = useMemo(() => rawExpenses?.filter((ex) => !ex.isVoided).length || 0, [rawExpenses]);
  const voidedCount = useMemo(() => rawExpenses?.filter((ex) => ex.isVoided).length || 0, [rawExpenses]);
  const totalRawCount = rawExpenses?.length || 0;

  const {
    processedData: expenses,
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
  } = useTableSortAndFilter(filteredRawExpenses, {
    searchFields: ["voucherNumber", "name", "note", "staffName", "amount", "voidReason", "voidedByName"],
    initialSort: { key: "createdAt", direction: "desc" },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const voucherNumber = form.voucherNumber.trim();
    const name = form.name.trim();
    const amount = Number(form.amount);

    if (!voucherNumber) {
      setError("Voucher number is required.");
      return;
    }
    if (!name) {
      setError("Please select or add an expense name.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setIsSaving(true);
    try {
      await createExpense({
        token,
        voucherNumber,
        name,
        amount,
        note: form.note.trim() || undefined,
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || "Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenVoidModal = (expense) => {
    setVoidTarget(expense);
    setVoidReason(VOID_REASONS[0]);
    setVoidNote("");
    setVoidError("");
  };

  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    setVoidError("");
    setIsVoiding(true);

    try {
      await voidExpense({
        token,
        expenseId: voidTarget._id,
        voidReason,
        voidNote: voidNote.trim() || undefined,
      });
      setVoidTarget(null);
    } catch (err) {
      setVoidError(err.message || "Failed to void expense voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  const toggleAudit = (expenseId) => {
    setExpandedAuditId((prev) => (prev === expenseId ? null : expenseId));
  };

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">
        <Receipt size={20} style={{ marginRight: "8px", verticalAlign: "middle" }} />
        Business Expenses & Financial Audit
      </h1>

      <form onSubmit={handleSubmit} className="table-wrap" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Voucher Number *</label>
            <input
              type="text"
              className="form-input"
              value={form.voucherNumber}
              onChange={(e) => setForm((f) => ({ ...f, voucherNumber: e.target.value }))}
              placeholder="e.g. VCH-0042"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Expense Name *</label>
            <ExpenseNameCombobox
              token={token}
              value={form.name}
              onChange={(name) => setForm((f) => ({ ...f, name }))}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Amount (UGX) *</label>
            <input
              type="number"
              className="form-input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "var(--space-3)" }}>
          <label className="form-label">Note (optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Any additional detail about this expense..."
          />
        </div>

        {error && (
          <div className="form-error" style={{ marginTop: "var(--space-2)" }}>{error}</div>
        )}

        <button
          type="submit"
          className={`btn btn--primary btn--md ${isSaving ? "is-loading" : ""}`}
          style={{ marginTop: "var(--space-3)" }}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Record Expense"}
        </button>
      </form>

      {/* ── Status Filter Tabs (Active / Voided / All) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>
        <h2 className="section-title" style={{ margin: 0 }}>Expense History</h2>

        <div style={{ display: "flex", gap: "4px", background: "var(--surface-container)", padding: "4px", borderRadius: "var(--radius-md)" }}>
          <button
            type="button"
            className={`btn btn--sm ${statusTab === "active" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => setStatusTab("active")}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${statusTab === "voided" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => setStatusTab("voided")}
          >
            Voided ({voidedCount})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${statusTab === "all" ? "btn--primary" : "btn--secondary"}`}
            onClick={() => setStatusTab("all")}
          >
            All Records ({totalRawCount})
          </button>
        </div>
      </div>

      <TableFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search expenses by voucher, name, note, staff, void reason..."
        filterValues={filterValues}
        onFilterChange={(key, val) => setFilterValue(key, val)}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {rawExpenses === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading expenses...</div>
        </div>
      ) : rawExpenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No business expenses recorded yet.</div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No expenses match filter criteria ({statusTab}).</div>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: "12px" }} onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader sortKey="voucherNumber" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Voucher #
                </SortableHeader>
                <SortableHeader sortKey="name" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Expense Name
                </SortableHeader>
                <SortableHeader sortKey="amount" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Amount (UGX)
                </SortableHeader>
                <th>Status</th>
                <SortableHeader sortKey="staffName" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Recorded By
                </SortableHeader>
                <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Date
                </SortableHeader>
                <th style={{ textAlignment: "right", textAlign: "right" }}>Action / Audit</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => {
                const isVoided = !!ex.isVoided;
                const isExpanded = expandedAuditId === ex._id;

                return (
                  <React.Fragment key={ex._id}>
                    <tr style={{ background: isVoided ? "color-mix(in srgb, var(--surface-container) 40%, var(--surface))" : undefined }}>
                      <td style={{ textDecoration: isVoided ? "line-through" : "none", opacity: isVoided ? 0.7 : 1 }}>
                        <strong>{ex.voucherNumber}</strong>
                      </td>
                      <td style={{ textDecoration: isVoided ? "line-through" : "none", opacity: isVoided ? 0.7 : 1 }}>
                        {ex.name}
                      </td>
                      <td style={{ textDecoration: isVoided ? "line-through" : "none", opacity: isVoided ? 0.7 : 1 }}>
                        {ex.amount.toLocaleString()}
                      </td>
                      <td>
                        {isVoided ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700, background: "var(--color-support-amber-bg, #fffbeb)", color: "var(--color-support-amber, #d97706)" }}>
                            <Ban size={12} /> VOIDED
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700, background: "var(--color-support-green-bg, #e8f5e9)", color: "var(--color-support-green, #2e7d32)" }}>
                            <CheckCircle size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td>{ex.staffName}</td>
                      <td>{new Date(ex.createdAt).toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>
                        {isVoided ? (
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => toggleAudit(ex._id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <History size={13} /> {isExpanded ? "Hide Audit" : "Audit Log"}
                          </button>
                        ) : (
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => handleOpenVoidModal(ex)}
                            style={{ color: "var(--color-support-amber, #d97706)", borderColor: "color-mix(in srgb, var(--color-support-amber) 30%, transparent)" }}
                          >
                            <Ban size={13} style={{ marginRight: "4px" }} /> Void Voucher
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Inline Expanded Financial Audit Log Drawer */}
                    {isExpanded && isVoided && (
                      <tr style={{ background: "var(--surface-container)" }}>
                        <td colSpan={7} style={{ padding: "var(--space-3) var(--space-4)" }}>
                          <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--color-support-amber, #d97706)", marginBottom: "8px" }}>
                              <History size={16} /> Immutable Audit History — Voucher {ex.voucherNumber}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", fontSize: "13px" }}>
                              <div>
                                <strong>1. Recorded Event:</strong>
                                <div>Date: {new Date(ex.createdAt).toLocaleString()}</div>
                                <div>Staff: {ex.staffName} (ID: {ex.staffId})</div>
                                <div>Amount: UGX {ex.amount.toLocaleString()} ({ex.name})</div>
                                {ex.note && <div>Note: <em>"{ex.note}"</em></div>}
                              </div>

                              <div>
                                <strong>2. Soft-Voided Event:</strong>
                                <div>Date: {ex.voidedAt ? new Date(ex.voidedAt).toLocaleString() : "Unknown"}</div>
                                <div>Voided By: {ex.voidedByName || "Unknown Staff"} ({ex.voidedBy || "System"})</div>
                                <div style={{ color: "var(--color-support-amber, #d97706)", fontWeight: 700 }}>
                                  Reason: {ex.voidReason || "Unspecified"}
                                </div>
                                {ex.voidNote && <div>Audit Notes: <em>"{ex.voidNote}"</em></div>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Soft Void Confirmation Modal ── */}
      {voidTarget && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "var(--shadow-deep)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--color-support-red)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Ban size={20} /> Void Business Expense Voucher
              </h3>
              <button className="btn btn--sm btn--secondary" onClick={() => setVoidTarget(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "var(--surface-container)", padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: "16px", fontSize: "13px" }}>
              <div><strong>Voucher #:</strong> {voidTarget.voucherNumber}</div>
              <div><strong>Expense Name:</strong> {voidTarget.name}</div>
              <div><strong>Amount:</strong> UGX {voidTarget.amount.toLocaleString()}</div>
              <div><strong>Originally Recorded By:</strong> {voidTarget.staffName}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Void Reason (Required for Audit Compliance) *</label>
              <select
                className="form-input"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              >
                {VOID_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Audit Notes & Justification (Optional)</label>
              <textarea
                className="form-input"
                rows={3}
                value={voidNote}
                onChange={(e) => setVoidNote(e.target.value)}
                placeholder="Provide audit context for why this expense is being voided..."
              />
            </div>

            {voidError && (
              <div className="form-error" style={{ marginTop: "12px" }}>{voidError}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button className="btn btn--secondary btn--md" onClick={() => setVoidTarget(null)} disabled={isVoiding}>
                Cancel
              </button>
              <button className="btn btn--danger btn--md" onClick={handleConfirmVoid} disabled={isVoiding}>
                {isVoiding ? "Voiding..." : "Confirm Soft Void"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

