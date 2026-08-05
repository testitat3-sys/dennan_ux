import React, { useState } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useTableSortAndFilter } from "../hooks/useTableSortAndFilter";
import { SortableHeader, TableFilterBar } from "./DataTableControls";
import { useSessionState } from "../hooks/useSessionDateRange";

const SOURCE_LABELS = {
  manual_adjust: "Manual adjustment",
  stock_request_approval: "Approved stock request",
  bulk_upload: "Bulk upload",
  customer_sale: "Customer sale",
  customer_return: "Customer return",
  exchange_in: "Exchange (In)",
  exchange_out: "Exchange (Out)",
  delivery_failure_restock: "Delivery failure restock",
  physical_audit: "Physical audit",
  direct_admin_edit: "Direct admin edit",
  order_cancellation: "Order cancellation",
  vendor_receipt: "Vendor receipt",
};

const SOURCE_FILTERS = [
  { value: "all", label: "All Sources" },
  { value: "manual_adjust", label: "Manual adjustments" },
  { value: "stock_request_approval", label: "Approved stock requests" },
  { value: "bulk_upload", label: "Bulk uploads" },
  { value: "customer_sale", label: "Customer sales" },
  { value: "customer_return", label: "Customer returns" },
  { value: "exchange_in", label: "Exchanges (In)" },
  { value: "exchange_out", label: "Exchanges (Out)" },
  { value: "delivery_failure_restock", label: "Delivery failure restocks" },
  { value: "physical_audit", label: "Physical audits" },
  { value: "direct_admin_edit", label: "Direct admin edits" },
  { value: "order_cancellation", label: "Order cancellations" },
  { value: "vendor_receipt", label: "Vendor receipts" },
];

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days = [];
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    days.push({ day: dayNum, dateStr, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, dateStr, isCurrentMonth: true });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, dateStr, isCurrentMonth: false });
  }

  return days;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function StockHistoryPanel({ token }) {
  const todayStr = getTodayDateStr();
  const todayDate = new Date();
  
  const [viewMode, setViewMode] = useSessionState("admin_stock_hist_view", "calendar");
  const [selectedDay, setSelectedDay] = useSessionState("admin_stock_hist_day", todayStr);
  const [calYear, setCalYear] = useSessionState("admin_stock_hist_year", todayDate.getFullYear());
  const [calMonth, setCalMonth] = useSessionState("admin_stock_hist_month", todayDate.getMonth() + 1);
  const [sourceFilter, setSourceFilter] = useSessionState("admin_stock_hist_source", "");

  // Feed Mode paginated query
  const { results: rawFeedResults, status: feedStatus, loadMore } = usePaginatedQuery(
    api.stockHistory.getStockHistoryFeed,
    viewMode === "feed" ? { token, source: sourceFilter || undefined } : "skip",
    { initialNumItems: 50 }
  );

  // Calendar summary data for the selected month
  const calendarSummary = useQuery(
    api.stockHistory.adminGetStockHistoryCalendarData,
    viewMode === "calendar" ? { token, year: calYear, month: calMonth } : "skip"
  );

  // Day specific stock history query
  const rawDayResults = useQuery(
    api.stockHistory.adminGetStockHistoryByDateRange,
    viewMode === "calendar" && selectedDay
      ? { token, startDate: selectedDay, endDate: selectedDay, source: sourceFilter || undefined }
      : "skip"
  );

  const activeRawData = viewMode === "calendar" ? rawDayResults?.rows : rawFeedResults;
  const dayResultsTruncated = viewMode === "calendar" && rawDayResults?.truncated;
  const calendarTruncated = viewMode === "calendar" && calendarSummary?.truncated;
  const calendarSummaryByDate = calendarSummary?.summary;

  const {
    processedData: stockHistoryData,
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
  } = useTableSortAndFilter(activeRawData || [], {
    searchFields: ["productName", "barcode", "actorName", "note", "source"],
    initialSort: { key: "createdAt", direction: "desc" },
    customSorts: {
      change: (a, b) => a.delta - b.delta,
      inventory: (a, b) => a.afterInventory - b.afterInventory,
    },
  });

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const daysGrid = getMonthDays(calYear, calMonth);
  const daySummary = calendarSummaryByDate?.[selectedDay];

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="admin-page-title">Stock History</h1>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Comprehensive audit log of inventory movements across all products
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: "inline-flex", background: "var(--surface-container-low)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
          <button
            className={`btn btn--sm ${viewMode === "calendar" ? "btn--primary" : "btn--ghost"}`}
            onClick={() => setViewMode("calendar")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
          >
            <CalendarIcon size={14} /> Calendar View
          </button>
          <button
            className={`btn btn--sm ${viewMode === "feed" ? "btn--primary" : "btn--ghost"}`}
            onClick={() => setViewMode("feed")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
          >
            <List size={14} /> All Feed View
          </button>
        </div>


      </div>

      {(calendarTruncated || dayResultsTruncated) && (
        <div
          style={{
            marginBottom: "var(--space-4)",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--color-support-red, #ef4444)",
            fontSize: "12px",
          }}
        >
          {calendarTruncated && dayResultsTruncated
            ? "This month and the selected day both have too many stock events to display in full — counts and the table below may be incomplete. Narrow to a shorter range for accurate figures."
            : calendarTruncated
            ? "This month has too many stock events to summarize in full — daily counts on the calendar may be incomplete."
            : "The selected day has too many stock events to display in full — the table below may be incomplete."}
        </div>
      )}

      {/* Calendar Component */}
      {viewMode === "calendar" && (
        <div style={{ marginBottom: "var(--space-6)", background: "var(--surface-container-low)", borderRadius: "12px", border: "1px solid var(--border-subtle)", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {MONTH_NAMES[calMonth - 1]} {calYear}
              </h2>
              {selectedDay && (
                <span className="status-badge status-badge--done" style={{ fontSize: "12px" }}>
                  Selected: {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button className="btn btn--secondary btn--sm" onClick={handlePrevMonth} title="Previous Month">
                <ChevronLeft size={16} />
              </button>
              <button className="btn btn--secondary btn--sm" onClick={() => { setCalYear(todayDate.getFullYear()); setCalMonth(todayDate.getMonth() + 1); setSelectedDay(todayStr); }}>
                Today
              </button>
              <button className="btn btn--secondary btn--sm" onClick={handleNextMonth} title="Next Month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Month Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "var(--text-tertiary)", paddingBottom: "6px" }}>
                {d}
              </div>
            ))}
            {daysGrid.map(({ day, dateStr, isCurrentMonth }, idx) => {
              const info = calendarSummaryByDate?.[dateStr];
              const isSelected = dateStr === selectedDay;
              const isTodayDay = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(dateStr)}
                  style={{
                    minHeight: "56px",
                    padding: "6px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--surface-container-high, rgba(59, 130, 246, 0.15))"
                      : isTodayDay
                      ? "rgba(59, 130, 246, 0.06)"
                      : isCurrentMonth
                      ? "var(--surface-container-base, rgba(255, 255, 255, 0.02))"
                      : "transparent",
                    border: isSelected
                      ? "2px solid var(--color-brand, #3b82f6)"
                      : isTodayDay
                      ? "1px solid var(--color-brand, #3b82f6)"
                      : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))",
                    opacity: isCurrentMonth ? 1 : 0.4,
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: isSelected || isTodayDay ? 700 : 500, color: isTodayDay ? "var(--color-brand, #3b82f6)" : "var(--text-primary)" }}>
                      {day}
                    </span>
                    {info?.count > 0 && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "10px",
                          background: "var(--color-brand, #3b82f6)",
                          color: "#fff",
                        }}
                      >
                        {info.count}
                      </span>
                    )}
                  </div>
                  {info?.count > 0 && (
                    <div style={{ fontSize: "10px", lineHeight: "1.2", marginTop: "4px" }}>
                      {info.added > 0 && <span style={{ color: "var(--color-support-green, #4ade80)", display: "block" }}>+{info.added}</span>}
                      {info.removed > 0 && <span style={{ color: "var(--color-support-red, #ef4444)", display: "block" }}>-{info.removed}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Day Summary Card */}
          {selectedDay && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                background: "var(--surface-container-base, rgba(0,0,0,0.2))",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                  Stock Events on {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </strong>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  {daySummary ? (
                    <>Total Events: <strong>{daySummary.count}</strong> | Added: <span style={{ color: "var(--color-support-green, #4ade80)" }}>+{daySummary.added} items</span> | Removed: <span style={{ color: "var(--color-support-red, #ef4444)" }}>-{daySummary.removed} items</span></>
                  ) : (
                    "No stock changes recorded on this date."
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Filter & Search Controls */}
      <TableFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search product, barcode, actor, note..."
        filterValues={filterValues}
        onFilterChange={(key, val) => {
          setSourceFilter(val === "all" ? "" : val);
          setFilterValue("source", val);
        }}
        filters={[
          { key: "source", width: "200px", options: SOURCE_FILTERS },
        ]}
        isFiltered={isFiltered}
        onResetFilters={() => {
          setSourceFilter("");
          resetFilters();
        }}
        totalCount={totalCount}
        filteredCount={filteredCount}
      />

      {activeRawData === undefined ? (
        <div className="empty-state">
          <div className="empty-title">Loading stock history...</div>
        </div>
      ) : activeRawData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">
            {viewMode === "calendar" ? `No stock changes on ${selectedDay}` : "No recorded stock changes yet."}
          </div>
        </div>
      ) : stockHistoryData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No stock history items match your search/filter.</div>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: "12px" }} onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader sortKey="createdAt" sortConfig={sortConfig} onRequestSort={requestSort}>
                    Date & Time
                  </SortableHeader>
                  <SortableHeader sortKey="productName" sortConfig={sortConfig} onRequestSort={requestSort}>
                    Product
                  </SortableHeader>
                  <SortableHeader sortKey="barcode" sortConfig={sortConfig} onRequestSort={requestSort}>
                    Barcode
                  </SortableHeader>
                  <SortableHeader sortKey="change" sortConfig={sortConfig} onRequestSort={requestSort}>
                    Change
                  </SortableHeader>
                  <SortableHeader sortKey="inventory" sortConfig={sortConfig} onRequestSort={requestSort}>
                    Before → After
                  </SortableHeader>
                  <SortableHeader sortKey="source" sortConfig={sortConfig} onRequestSort={requestSort}>
                    Source
                  </SortableHeader>
                  <SortableHeader sortKey="actorName" sortConfig={sortConfig} onRequestSort={requestSort}>
                    By
                  </SortableHeader>
                </tr>
              </thead>
              <tbody>
                {stockHistoryData.map((row) => (
                  <tr key={row._id}>
                    <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(row.createdAt).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td><strong>{row.productName}</strong></td>
                    <td>{row.barcode || "—"}</td>
                    <td style={{ color: row.delta > 0 ? "var(--color-support-green, #4ade80)" : "var(--color-support-red, #ef4444)", fontWeight: 600 }}>
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                    <td>{row.beforeInventory} → {row.afterInventory}</td>
                    <td>
                      {SOURCE_LABELS[row.source] || row.source}
                      {row.note && <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{row.note}</div>}
                    </td>
                    <td>{row.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {viewMode === "feed" && feedStatus === "CanLoadMore" && (
            <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
              <button className="btn btn--secondary btn--sm" onClick={() => loadMore(30)}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
