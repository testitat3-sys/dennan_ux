import React, { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";
import { Wallet, Trash2 } from "lucide-react";
import { getTodayStr } from "../utils/reminderHelpers";

import { useSessionState } from "../hooks/useSessionDateRange";

const METHODS = [
  { key: "physical", label: "Cash" },
  { key: "momo", label: "Mobile Money" },
  { key: "card", label: "Card" },
  { key: "voucher", label: "Gift Voucher" },
];

const EMPTY_COUNTS = { physical: 0, momo: 0, card: 0, voucher: 0 };

export default function CashUpPanel({ token }) {
  const [date, setDate] = useSessionState("admin_cashup_date", getTodayStr());
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [notes, setNotes] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const cashUp = useTrackedQuery(api.cashUp.getCashUpForDate, { token, date });

  const saveEntryMutation = useMutation(api.cashUp.saveCashUpEntry);
  const addExpenseMutation = useMutation(api.cashUp.addCashUpExpense);
  const deleteExpenseMutation = useMutation(api.cashUp.deleteCashUpExpense);

  // Reseed the form whenever the selected date's saved entry or expected totals change.
  // Automatically pre-fill Mobile Money and Card with system expected totals if no custom saved count exists,
  // while keeping all fields fully editable.
  useEffect(() => {
    if (cashUp === undefined) return;
    const exp = cashUp.expected || EMPTY_COUNTS;
    if (cashUp.entry) {
      setCounts({
        physical: cashUp.entry.physicalCounts.physical ?? 0,
        momo: cashUp.entry.physicalCounts.momo ?? exp.momo ?? 0,
        card: cashUp.entry.physicalCounts.card ?? exp.card ?? 0,
        voucher: cashUp.entry.physicalCounts.voucher ?? exp.voucher ?? 0,
      });
      setNotes(cashUp.entry.notes || "");
    } else {
      setCounts({
        physical: 0,
        momo: exp.momo || 0,
        card: exp.card || 0,
        voucher: exp.voucher || 0,
      });
      setNotes("");
    }
  }, [cashUp]);

  const handleCountChange = (methodKey, value) => {
    setCounts((prev) => ({ ...prev, [methodKey]: value === "" ? 0 : Number(value) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveEntryMutation({ token, date, physicalCounts: counts, notes });
    } catch (err) {
      alert("Failed to save cash-up entry: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = Number(expenseAmount);
    if (!expenseDesc.trim() || !amount) return;
    try {
      await addExpenseMutation({ token, date, description: expenseDesc.trim(), amount });
      setExpenseDesc("");
      setExpenseAmount("");
    } catch (err) {
      alert("Failed to add expense: " + err.message);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await deleteExpenseMutation({ token, expenseId });
    } catch (err) {
      alert("Failed to delete expense: " + err.message);
    }
  };

  const expected = cashUp?.expected || EMPTY_COUNTS;
  const refunds = cashUp?.refunds || EMPTY_COUNTS;
  const expenses = cashUp?.expenses || [];
  const totalExpenses = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const totalRefunds = Object.values(refunds).reduce((sum, val) => sum + (val || 0), 0);

  // Daily expenses deduction from cash at end of day
  const netExpectedCash = Math.max(0, expected.physical - totalExpenses);

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">
          <Wallet size={20} style={{ marginRight: "8px", verticalAlign: "middle" }} />
          Balance Books
        </h1>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: "11px" }} htmlFor="cashup-date">Day</label>
          <input
            id="cashup-date"
            type="date"
            className="form-input"
            value={date}
            max={getTodayStr()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {cashUp === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading balance sheet...</div>
        </div>
      ) : (
        <>
          <div className="section-header">
            <h2 className="section-title">Payment Reconciliation — {date}</h2>
          </div>

          {/* Callout Notice for Expenses and Refunds */}
          {(totalExpenses > 0 || totalRefunds > 0) && (
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                marginBottom: "var(--space-3)",
                background: "var(--bg-secondary, #f8fafc)",
                borderLeft: "4px solid var(--color-support-amber, #f59e0b)",
                borderRadius: "var(--radius-sm, 4px)",
                fontSize: "var(--body-sm, 14px)",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              {totalExpenses > 0 && (
                <div>
                  <strong>Daily Expenses Deducted from Cash:</strong> UGX {totalExpenses.toLocaleString()} (Expected Cash in Drawer: <strong>UGX {netExpectedCash.toLocaleString()}</strong>).
                </div>
              )}
              {totalRefunds > 0 && (
                <div>
                  <strong>Refunds Issued Today:</strong> UGX {totalRefunds.toLocaleString()} (Net system expected totals automatically reflect refunded transactions).
                </div>
              )}
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Refunds Issued (UGX)</th>
                  <th>System Expected (UGX)</th>
                  <th>Physical Count (UGX)</th>
                  <th>Discrepancy (UGX)</th>
                </tr>
              </thead>
              <tbody>
                {METHODS.map((m) => {
                  // For Cash (physical), deduct daily expenses from expected cash at end of day
                  const expectedAmount = m.key === "physical" ? netExpectedCash : (expected[m.key] || 0);
                  const countedAmount = counts[m.key] ?? 0;
                  const discrepancy = countedAmount - expectedAmount;
                  const methodRefund = refunds[m.key] || 0;
                  return (
                    <tr key={m.key}>
                      <td>
                        <strong>{m.label}</strong>
                        {m.key === "physical" && totalExpenses > 0 && (
                          <div style={{ fontSize: "var(--label-md, 12px)", color: "var(--text-tertiary)", fontWeight: 400 }}>
                            (Net of UGX {totalExpenses.toLocaleString()} daily expenses)
                          </div>
                        )}
                        {(m.key === "momo" || m.key === "card") && (
                          <div style={{ fontSize: "var(--label-md, 12px)", color: "var(--color-support-green, #10b981)", fontWeight: 400 }}>
                            Auto-filled from system
                          </div>
                        )}
                      </td>
                      <td>
                        {methodRefund > 0 ? (
                          <span style={{ color: "var(--color-support-red, #ef4444)", fontWeight: 600 }}>
                            − UGX {methodRefund.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-tertiary)" }}>UGX 0</span>
                        )}
                      </td>
                      <td>
                        {m.key === "physical" && totalExpenses > 0 ? (
                          <div>
                            <div><strong>UGX {netExpectedCash.toLocaleString()}</strong></div>
                            <div style={{ fontSize: "var(--label-md, 11px)", color: "var(--text-tertiary)" }}>
                              Gross UGX {(expected.physical + methodRefund).toLocaleString()} − UGX {methodRefund.toLocaleString()} refund − UGX {totalExpenses.toLocaleString()} exp
                            </div>
                          </div>
                        ) : (
                          `UGX ${expectedAmount.toLocaleString()}`
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          value={counts[m.key] ?? 0}
                          onChange={(e) => handleCountChange(m.key, e.target.value)}
                        />
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${discrepancy === 0 ? "delivered" : "failed"}`}>
                          <span className="status-dot" />
                          {discrepancy > 0 ? "+" : ""}{discrepancy.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cashup-notes">Notes</label>
            <textarea
              id="cashup-notes"
              className="form-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything relevant to today's balance, e.g. reasons for a discrepancy..."
            />
          </div>

          <button
            className={`btn btn--primary btn--md ${isSaving ? "is-loading" : ""}`}
            style={{ marginTop: "var(--space-4)" }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : cashUp.entry ? "Update Balance" : "Save Balance"}
          </button>

          <div className="section-header" style={{ marginTop: "var(--space-4)" }}>
            <h2 className="section-title">Expenses — {date}</h2>
          </div>

          <form onSubmit={handleAddExpense} className="stock-search-wrap" style={{ gap: "var(--space-2)", display: "flex", alignItems: "flex-end" }}>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="e.g. Fuel for delivery rider"
              />
            </div>
            <div className="form-group" style={{ margin: 0, width: "160px" }}>
              <label className="form-label">Amount (UGX)</label>
              <input
                type="number"
                className="form-input"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--secondary btn--sm">Add Expense</button>
          </form>

          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No expenses logged for this day.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount (UGX)</th>
                    <th>Added By</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((ex) => (
                    <tr key={ex._id}>
                      <td>{ex.description}</td>
                      <td>{ex.amount.toLocaleString()}</td>
                      <td>{ex.staffName}</td>
                      <td>{new Date(ex.createdAt).toLocaleTimeString()}</td>
                      <td className="td-action">
                        <button className="btn btn--ghost btn--sm" onClick={() => handleDeleteExpense(ex._id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>{totalExpenses.toLocaleString()}</strong></td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
