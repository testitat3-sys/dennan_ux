/**
 * Estimated data-volume figures for the DB I/O Baseline dashboard.
 *
 * Convex's `ctx.db` only exposes a document *count* to app code, never the
 * actual bytes transferred - so these are rough estimates, not measurements.
 * Each table's average bytes-per-document is eyeballed from its field count
 * and shape in convex/schema.ts (arrays/nested objects push the estimate up,
 * small singleton/lookup tables push it down). Tracked functions that read
 * more than one table use a blended figure reflecting their typical mix.
 * Treat these as order-of-magnitude, not exact bandwidth accounting.
 */

const TABLE_AVG_BYTES = {
  products: 1500,
  orders: 900,
  orderItems: 150,
  orderPayments: 150,
  returns: 350,
  returnItems: 300,
  returnExchangeItems: 250,
  customerActivities: 300,
  users: 600,
  brands: 700,
  productBrandNames: 80,
  stockCounters: 100,
  errorLogs: 500,
  storeRequests: 300,
  registryNotifySignups: 350,
  giftVouchers: 300,
};

const DEFAULT_AVG_BYTES =
  Object.values(TABLE_AVG_BYTES).reduce((sum, n) => sum + n, 0) /
  Object.values(TABLE_AVG_BYTES).length;

// functionName (as passed to trackedQuery/trackedMutation) -> avg bytes/read
const FUNCTION_AVG_BYTES = {
  "brands.getBrandBySlug": TABLE_AVG_BYTES.brands,
  "data.getProducts": TABLE_AVG_BYTES.products,
  "data.getHomeFeaturedProducts": TABLE_AVG_BYTES.products,

  "returns.submitReturn": TABLE_AVG_BYTES.returnItems,
  "returns.submitExchange": TABLE_AVG_BYTES.returnItems,
  "returns.approveReturnItem": TABLE_AVG_BYTES.returnItems,
  "returns.rejectReturn": TABLE_AVG_BYTES.returnItems,
  "returns.getPendingReturns": TABLE_AVG_BYTES.returns,
  "returns.getReturnItemsForOrder": TABLE_AVG_BYTES.returnItems,
  "returns.getReturnById": TABLE_AVG_BYTES.returns,

  "customerActivities.getCustomerList": TABLE_AVG_BYTES.users,
  "customerActivities.getActivitiesByCustomer": TABLE_AVG_BYTES.customerActivities,
  "customerActivities.getDueActivities": TABLE_AVG_BYTES.customerActivities,
  "customerActivities.getActivitiesByOrder": TABLE_AVG_BYTES.customerActivities,
  "customerActivities.getAllActivities": TABLE_AVG_BYTES.customerActivities,

  "stockCounters.getStockSummary": TABLE_AVG_BYTES.stockCounters,

  // Fans out into each staff member's full order history - weighted
  // toward orders rather than the (smaller) users row it starts from.
  "staffAuth.getStaffList": 800,
  "staffAuth.getStaffRoster": TABLE_AVG_BYTES.users,

  "products.getDiscountList": TABLE_AVG_BYTES.products,

  "productBrandNames.listProductBrandNames": TABLE_AVG_BYTES.productBrandNames,
  "productBrandNames.createProductBrandName": TABLE_AVG_BYTES.productBrandNames,

  "orders.adminExportOrdersByDateRange": 700,
  "orders.getOrderDetailById": 700,
  "orders.reportDeliveryFailure": 500,
  "orders.adminCreateOrder": 600,
  "orders.adminGetSalesMetrics": 700,

  "leads.getLeads": 325,

  "errorLogs.getErrorLogs": TABLE_AVG_BYTES.errorLogs,
  "errorLogs.clearErrorLogs": TABLE_AVG_BYTES.errorLogs,
};

/** Estimated bytes transferred for `reads` documents read by `functionName`. */
export function estimateBytes(functionName, reads) {
  const avg = FUNCTION_AVG_BYTES[functionName] ?? DEFAULT_AVG_BYTES;
  return reads * avg;
}

/** Formats a byte count as a human string, e.g. "842 B", "12.3 KB", "4.5 MB". */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const precision = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
