import React from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";

/**
 * Clickable table header that triggers column sorting and shows direction arrows.
 */
export function SortableHeader({
  sortKey,
  sortConfig,
  onRequestSort,
  children,
  align = "left",
  style = {},
  className = "",
  ...props
}) {
  const isSorted = sortConfig && sortConfig.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th
      onClick={() => onRequestSort && onRequestSort(sortKey)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        textAlign: align,
        transition: "color 0.15s, background 0.15s",
        ...style,
      }}
      className={`sortable-th ${isSorted ? "is-sorted" : ""} ${className}`}
      title={`Click to sort by ${typeof children === "string" ? children : sortKey}`}
      {...props}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
          width: "100%",
        }}
      >
        <span>{children}</span>
        <span style={{ display: "inline-flex", opacity: isSorted ? 1 : 0.4, color: isSorted ? "var(--color-brand, #3b82f6)" : "currentColor" }}>
          {direction === "asc" ? (
            <ArrowUp size={13} />
          ) : direction === "desc" ? (
            <ArrowDown size={13} />
          ) : (
            <ArrowUpDown size={12} />
          )}
        </span>
      </div>
    </th>
  );
}

/**
 * Reusable filter and search toolbar for admin tables.
 */
export function TableFilterBar({
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
  filterValues = {},
  onFilterChange,
  isFiltered = false,
  onResetFilters,
  totalCount,
  filteredCount,
  children,
  style = {},
}) {
  return (
    <div
      className="table-filter-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        marginBottom: "14px",
        padding: "8px 12px",
        background: "var(--surface-container-low, rgba(255, 255, 255, 0.03))",
        borderRadius: "8px",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: "260px" }}>
        {onSearchChange && (
          <div style={{ position: "relative", minWidth: "220px", flex: "1 1 220px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary, #94a3b8)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: "32px",
                paddingRight: searchQuery ? "28px" : "10px",
                paddingTop: "0",
                paddingBottom: "0",
                fontSize: "13px",
                height: "34px",
                width: "100%",
              }}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {filters.map((filter) => (
          <select
            key={filter.key}
            className="form-input"
            style={{
              height: "34px",
              paddingTop: "0",
              paddingBottom: "0",
              paddingLeft: "8px",
              fontSize: "13px",
              minWidth: filter.width || "130px",
              maxWidth: "200px",
            }}
            value={filterValues[filter.key] ?? "all"}
            onChange={(e) => onFilterChange && onFilterChange(filter.key, e.target.value)}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {children}

        {isFiltered && onResetFilters && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onResetFilters}
            style={{
              height: "34px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "0 10px",
            }}
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {(totalCount !== undefined || filteredCount !== undefined) && (
        <div style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
          {isFiltered && totalCount !== filteredCount ? (
            <span>
              Showing <strong style={{ color: "var(--text-primary)" }}>{filteredCount}</strong> of {totalCount} records
            </span>
          ) : (
            <span>Total: <strong style={{ color: "var(--text-primary)" }}>{totalCount ?? filteredCount}</strong> records</span>
          )}
        </div>
      )}
    </div>
  );
}
