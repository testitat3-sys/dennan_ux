# Issue 3 — Admin App Frontend

This document specifies the admin and staff frontend panels, state management, routes, and modals for `dennan_ux`'s standalone administrative app (`admin/`). These components must be implemented in the future, calling Issue 1 and Issue 2's backend functions.

## 1. Authentication Decoupling

The admin app must be fully decoupled from Convex Auth (magic links). It will use custom token-based session management:
- Remove `ConvexAuthProvider` (or `ConvexProviderWithAuth`) from `admin/src/main.jsx`. Use `ConvexReactClient` and a standard `ConvexProvider` from `convex/react` instead.
- Create a authentication hook/context: `admin/src/hooks/useStaffAuth.jsx` (and `StaffAuthProvider` provider) that:
  - Stores a `staffToken` in `localStorage`.
  - Performs a `verifyToken` query on initial load to fetch the authenticated user profile.
  - Exposes state: `{ user, login, logout, isLoading }`.
  - Handles session rotation automatically or via token validation.

---

## 2. Routes & Role Gating (`admin/src/App.jsx`)

Update routing in the admin app:
- **Public Route**:
  - `/login` -> `StaffLogin.jsx` (redirects to `/` if already authenticated).
- **Protected Routes**:
  - `/` -> Main dashboard gate:
    - If `user.accountRole === "admin"`, render `AdminDashboard.jsx`.
    - If `user.accountRole === "staff"`, render `StaffDashboard.jsx`.
    - If not logged in, redirect to `/login`.
- **Deleted Routes**:
  - Remove storefront redirects or OAuth callbacks (like `AfterSignIn.jsx` callback page and storefront redirect).

---

## 3. Pages to Implement

### `StaffLogin.jsx`
- Sleek, premium centered login card.
- Form inputs for Email and Password.
- Calls `staffAuth.login` on submit.
- On success, saves token to `localStorage` and redirects to `/`.

### `AdminDashboard.jsx` (Admin View)
Tabs/Sub-panels:
1. **Overview**: Metrics (AOV, gross sales, orders completed vs failed, active staff leaderboard).
2. **Stock**: Table of products showing current `inventory`, `costPrice`, `reorderPoint`. Highlights low-stock items. Integrates inline or modal inputs for stock adjustment (calling `adjustStock`).
3. **Discounts**: Form to set a discount (calling `setDiscount`) and list of active discounts.
4. **Staff**: Roster management, showing active sessions, and performance tracking (claimed order counts and sales amounts).
5. **Customers**: CRM client roster (calling `getCustomerList`). Displays customers with order counts and CRM notes.

### `StaffDashboard.jsx` (Staff View)
Tabs/Sub-panels:
1. **Orders Queue**: Columns for:
   - **New/Unclaimed**: Orders in `"preparing"` state. Staff can click **Claim**.
   - **Active (Claimed)**: Orders claimed by the current staff member in `"packing"` or `"dispatched"` state. Actions: **Dispatch** (opens Handover Modal) and **Complete** / **Fail**.
2. **Walk-in POS**:
   - Product catalog search and click-to-add cart.
   - Payment method selection (`"physical"`).
   - Checkout button calling `createPhysicalOrder`.
3. **Customers**: Customer profile log and CRM notes.

---

## 4. Modals & UI Components

### `OrderDetailModal`
- Renders order summary, products, sizes, quantities, and delivery address.
- Displays fulfillment status timeline and activity logs (`order.history`).

### `HandoverModal`
- Triggers when staff dispatches an order.
- Collects `deliveryPersonName` (rider name), `riderPhone`, and `expectedDeliveryTime` (minutes).
- Calls `handoverToDelivery`.

### `ReturnProcessModal`
- Opens from an order detail view.
- Allows staff to select which products and what quantities are being returned.
- Inputs for `refundAmount` and a descriptive `note`.
- Calls `processReturn`.

### `CustomerActivityModal` (CRM notes)
- Lets staff log an interaction (type: note, call, meeting, etc.) or set a scheduled callback.
- Input for notes.
- Calls `addActivity` / `updateCustomerNotes`.

---

## 5. Storefront Cleanup (`storefront/src`)

- Locate [AfterSignIn.jsx](file:///c:/Users/HP/Desktop/dennan/dennan_ux/storefront/src/pages/AfterSignIn.jsx).
- Remove any conditions checking `user.isAdmin` that redirect to port `5174` (the old storefront-admin bridge).
- The storefront auth flow should now strictly handle customer onboarding and storefront redirecting, completely isolated from administrative operations.
