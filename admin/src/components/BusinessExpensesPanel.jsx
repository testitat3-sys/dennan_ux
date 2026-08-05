import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { Receipt, Trash2 } from "lucide-react";
import ExpenseNameCombobox from "./ExpenseNameCombobox";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";

const EMPTY_FORM = { voucherNumber: "", name: "", amount: "", note: "" };

export default function BusinessExpensesPanel({ token }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const rawExpenses = useTrackedQuery(api.businessExpenses.listBusinessExpenses, { token });
  const createExpense = useMutation(api.businessExpenses.createBusinessExpense);
  const deleteExpense = useMutation(api.businessExpenses.deleteBusinessExpense);

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
  } = useTableSortAndFilter(rawExpenses || [], {
    searchFields: ["voucherNumber", "name", "note", "staffName", "amount"],
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

  const handleDelete = async (expenseId) => {
    try {
      await deleteExpense({ token, expenseId });
    } catch (err) {
      alert("Failed to delete expense: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <h1 className="admin-page-title">
        <Receipt size={20} style={{ marginRight: "8px", verticalAlign: "middle" }} />
        Business Expenses
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

      <div className="section-header" style={{ marginTop: "var(--space-4)" }}>
        <h2 className="section-title">Expense History</h2>
      </div>

      <TableFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search expenses by voucher, name, note, staff..."
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
          <div className="empty-title">No expenses match filter criteria.</div>
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
                <SortableHeader sortKey="note" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Note
                </SortableHeader>
                <SortableHeader sortKey="staffName" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Recorded By
                </SortableHeader>
                <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onRequestSort={requestSort}>
                  Date
                </SortableHeader>
                <th style={{ width: "60px" }}></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => (
                <tr key={ex._id}>
                  <td>{ex.voucherNumber}</td>
                  <td>{ex.name}</td>
                  <td>{ex.amount.toLocaleString()}</td>
                  <td>{ex.note || "—"}</td>
                  <td>{ex.staffName}</td>
                  <td>{new Date(ex.createdAt).toLocaleString()}</td>
                  <td className="td-action">
                    <button className="btn btn--ghost btn--sm" onClick={() => handleDelete(ex._id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
