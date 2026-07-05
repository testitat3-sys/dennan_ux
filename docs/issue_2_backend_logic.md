# Issue 2 — Backend Business Logic

This document specifies the backend business logic functions needed for staff/admin order fulfillment, CRM, POS, and inventory/merchandising in `dennan_ux`. These functions must be implemented in the future, built on top of Issue 1's standalone password/token authentication system.

## 1. Gated Endpoint Authentication Pattern

All staff-gated and admin-gated functions must import and use `verifyStaffSession` from `convex/staffAuth.ts`.
Example pattern:
```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyStaffSession } from "./staffAuth";

export const getOrdersForStaff = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Verifies the caller is a valid staff member or admin
    const { user } = await verifyStaffSession(ctx, args.token, ["staff", "admin"]);
    
    // Logic goes here...
  },
});
```

---

## 2. Order Fulfillment Functions (`convex/orders.ts`)

These functions should be appended to `convex/orders.ts` or organized cleanly:

### `getOrdersForStaff({ token })`
- **Access**: Staff, Admin.
- **Logic**:
  - Fetch all orders. Since orders table is expected to grow, query orders in reverse chronological order (bounded/paginated).
  - For each order, resolve customer details (join `users` table via `userId`), fetch matching `orderItems` (query `orderItems` table by `by_order` index), and resolve claimant name if `claimedBy` is set.
  - Return the enriched list.

### `claimOrder({ token, orderId })`
- **Access**: Staff, Admin.
- **Logic**:
  - Retrieve order by `orderId`. Verify status is `"preparing"`.
  - Update order:
    - Set `status` to `"packing"`.
    - Set `claimedBy` to current staff user `_id`.
    - Set `claimedAt` to current timestamp.
    - Set `timeToClaim` as `claimedAt - createdAt`.
    - Append entry to `history`: `{ status: "packing", timestamp: Date.now(), note: `Claimed by ${user.name}` }`.

### `handoverToDelivery({ token, orderId, deliveryPersonName, riderPhone, expectedDeliveryTime })`
- **Access**: Staff, Admin (Claimant only).
- **Logic**:
  - Retrieve order. Verify status is `"packing"` and `claimedBy === user._id`.
  - Update order:
    - Set `status` to `"dispatched"`.
    - Set `dispatchedAt` to current timestamp.
    - Set `timeToDispatch` as `dispatchedAt - claimedAt`.
    - Set `deliveryPersonName`, `riderPhone`, and `expectedDeliveryTime`.
    - Append to `history`: `{ status: "dispatched", timestamp: Date.now(), note: `Handed over to rider ${deliveryPersonName}` }`.

### `completeOrder({ token, orderId })`
- **Access**: Staff, Admin (Claimant only).
- **Logic**:
  - Retrieve order. Verify status is `"dispatched"` (or `"packing"`) and `claimedBy === user._id`.
  - Update order:
    - Set `status` to `"delivered"`.
    - Set `completedAt` to current timestamp.
    - Set `timeToDeliver` as `completedAt - dispatchedAt`.
    - Append to `history`: `{ status: "delivered", timestamp: Date.now(), note: "Marked as delivered by staff" }`.

### `markOrderFailed({ token, orderId })`
- **Access**: Staff, Admin (Claimant only).
- **Logic**:
  - Retrieve order. Verify status is `"dispatched"` and `claimedBy === user._id`.
  - Update order:
    - Set `status` to `"failed"`.
    - Set `failedAt` to current timestamp.
    - Append to `history`: `{ status: "failed", timestamp: Date.now(), note: "Marked as failed/undelivered" }`.
  - Restock inventory:
    - Fetch all `orderItems` for this order.
    - For each item, update `products` table incrementing `inventory` by the item's `quantity`.

### `adminCreateOrder({ token, ... })`
- **Access**: Admin only.
- **Logic**: Custom manual orders created by administrator.

### POS / Walk-in Ordering Flow
Implement `createPhysicalOrder` mutation:
- **Access**: Staff, Admin.
- **Arguments**:
  - `customerName`: string
  - `phone`: optional string
  - `email`: optional string
  - `items`: array of `{ productId, quantity }`
  - `paymentMethod`: literal `"physical"`
  - `note`: optional string
- **Logic**:
  - Resolve or create user:
    - If `phone` / `email` provided, check if user exists.
    - If not, insert a bare user document:
      - `name: customerName`, `phone: phone`, `email: email`, `isWalkIn: true`.
  - For each item, check `products.inventory`. Deduct inventory atomically, throw error if insufficient.
  - Insert `orders` record:
    - `userId: user._id`
    - `status: "delivered"`
    - `paymentMethod: "physical"`
    - `deliveryAddress: { name: customerName, zone: "Physical Store" }`
    - `subtotal`, `grandTotal`, `deliveryFee: 0`
    - `claimedBy: staff._id`, `completedAt: Date.now()`, `isOnline: false`, `isWalkIn: true`.
  - Insert `orderItems` records referencing the new `orderId`.

---

## 3. Product & Inventory Management (`convex/products.ts`)

Add the following administrative endpoints to `convex/products.ts`:

### `getProductsForPOS({ token })`
- **Access**: Staff, Admin.
- **Logic**: Returns all active products for the walk-in POS interface.

### `getStockList({ token })`
- **Access**: Admin only.
- **Logic**: Returns all products with their `inventory` levels, `costPrice`, and `reorderPoint` to monitor low stock.

### `adjustStock({ token, productId, delta })`
- **Access**: Admin only.
- **Logic**: Patches a product's `inventory` field by adding/subtracting `delta`.

### `setDiscount({ token, productId, discountPrice, discountExpiry })`
- **Access**: Admin only.
- **Logic**: Sets promotional pricing by patching `discountPrice` and `discountExpiry` (Unix timestamp) on a product.

### `getDiscountList({ token })`
- **Access**: Admin only.
- **Logic**: Returns all products currently having an active or pending discount.

---

## 4. CRM & Customer Activities (`convex/customerActivities.ts`)

Create `convex/customerActivities.ts` to manage notes and interactions with customers:

### CRM Actions:
- `getCustomerList({ token })`: Admin-gated query. Returns customers (users without `accountRole`) alongside order counts and notes counts.
- `updateCustomerNotes({ token, userId, customerNotes })`: Patches a customer's `customerNotes` field.
- `getActivitiesByCustomer({ token, customerId })`: Fetches chronological `customerActivities` for a customer.
- `addActivity({ token, customerId, type, note, scheduledDate })`: Inserts a new action record with `status: "pending"`, setting `staffId` and `staffName`.
- `completeActivity({ token, activityId })`: Marks a pending CRM activity as completed, setting `completedAt`.
- `deleteActivity({ token, activityId })`: Deletes a CRM activity.

---

## 5. Returns Processing

### `processReturn({ token, orderId, returnedItems: [{ productId, quantity }], refundAmount, note })`
- **Access**: Staff, Admin.
- **Logic**:
  - Validate return: check that items exist in `orderItems` for this order, and quantities returned do not exceed original order quantities.
  - Insert a record into the `returns` table.
  - Patch order `status` to either `"returned"` (all items returned) or `"partially_returned"` (some items returned).
  - Restock returned items: increment product inventory.

---

## 6. Zone-based Delivery Fee Calculator

Adapt the Haversine distance calculator and zone delivery fees:
- Helper function reads coordinates (`lat`/`lng`) of delivery zone landmarks from the `deliveryLandmarks` and `deliveryZones` tables.
- Dynamically matches user zones to compute distance and fee, storing them on the order document.
