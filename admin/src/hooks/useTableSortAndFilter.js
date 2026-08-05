import { useState, useMemo, useCallback } from "react";

/**
 * Universal hook for sorting and filtering tabular data in Admin UI.
 *
 * @param {Array} items - Raw data array
 * @param {Object} config - Configuration options
 * @param {Array<string|function>} config.searchFields - Fields or extractors to search against
 * @param {Object} config.initialSort - { key: string|null, direction: 'asc' | 'desc' }
 * @param {Object} config.customSorts - Map of key -> comparator function (a, b, direction) => number
 * @returns {Object} Table sort and filter state and methods
 */
export function useTableSortAndFilter(items = [], config = {}) {
  const {
    searchFields = [],
    initialSort = { key: null, direction: "desc" },
    customSorts = {},
  } = config;

  const [sortConfig, setSortConfig] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState({});

  const setFilterValue = useCallback((key, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setFilterValues({});
    setSortConfig(initialSort);
  }, [initialSort]);

  const requestSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") {
          return { key, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { key: null, direction: "asc" };
        }
      }
      return { key, direction: "asc" };
    });
  }, []);

  const getValueByPath = (obj, path) => {
    if (typeof path === "function") return path(obj);
    if (!path) return obj;
    return path.split(".").reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
  };

  const processedData = useMemo(() => {
    if (!Array.isArray(items)) return [];

    let result = [...items];

    // 1. Apply Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        if (searchFields.length === 0) {
          return Object.values(item).some((val) =>
            String(val ?? "").toLowerCase().includes(q)
          );
        }
        return searchFields.some((field) => {
          const val = getValueByPath(item, field);
          if (Array.isArray(val)) {
            return val.some((subVal) =>
              String(subVal ?? "").toLowerCase().includes(q)
            );
          }
          return String(val ?? "").toLowerCase().includes(q);
        });
      });
    }

    // 2. Apply Filters
    Object.entries(filterValues).forEach(([key, filterVal]) => {
      if (filterVal === undefined || filterVal === null || filterVal === "" || filterVal === "all") {
        return;
      }
      result = result.filter((item) => {
        if (typeof filterVal === "function") {
          return filterVal(item);
        }
        const itemVal = getValueByPath(item, key);
        if (typeof filterVal === "boolean") {
          return Boolean(itemVal) === filterVal;
        }
        return String(itemVal).toLowerCase() === String(filterVal).toLowerCase();
      });
    });

    // 3. Apply Sorting
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      const mult = direction === "asc" ? 1 : -1;

      result.sort((a, b) => {
        if (customSorts[key]) {
          return customSorts[key](a, b, direction) * mult;
        }
        const valA = getValueByPath(a, key);
        const valB = getValueByPath(b, key);

        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return (valA - valB) * mult;
        }
        if (typeof valA === "boolean" && typeof valB === "boolean") {
          return (valA === valB ? 0 : valA ? 1 : -1) * mult;
        }
        if (valA instanceof Date || valB instanceof Date) {
          return (new Date(valA) - new Date(valB)) * mult;
        }
        return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" }) * mult;
      });
    }

    return result;
  }, [items, searchQuery, filterValues, sortConfig, searchFields, customSorts]);

  const isFiltered =
    searchQuery.trim() !== "" ||
    Object.values(filterValues).some((v) => v !== "" && v !== undefined && v !== "all") ||
    sortConfig.key !== initialSort.key ||
    sortConfig.direction !== initialSort.direction;

  return {
    processedData,
    sortConfig,
    requestSort,
    searchQuery,
    setSearchQuery,
    filterValues,
    setFilterValue,
    resetFilters,
    isFiltered,
    totalCount: items ? items.length : 0,
    filteredCount: processedData.length,
  };
}
