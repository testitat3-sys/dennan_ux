# Pesapal In-Modal Iframe Payment

How Dennan Kids runs Pesapal checkout inside an in-page modal (iframe) instead of
redirecting the whole browser tab to Pesapal's hosted payment page. Use this as
the reference implementation for any other payment flow that needs the same
"stay on our site" behavior.

## Why this works at all

Pesapal's `SubmitOrderRequest` API returns a `redirect_url` (their hosted
payment page). Normally you'd `window.location.href = redirect_url`. Instead we:

1. Load that URL inside an `<iframe>` in our own modal component.
2. Give Pesapal a `callback_url` that points at **our own backend** (not the
   frontend) — a GET route that Pesapal's page redirects/navigates to inside
   the iframe when payment finishes.
3. That backend route detects it's running inside an iframe
   (`window.self !== window.top`) and, instead of navigating anywhere, does a
   `window.parent.postMessage(...)` to hand the result back to the parent page.
4. The React modal listens for that `message` event (plus a polling fallback)
   and reacts — shows success/fail UI, then calls `onSuccess`.

No redirect, no full-page navigation, no leaving the SPA.

## Frontend pieces

### 1. `src/pages/Checkout/Checkout.jsx`
- Calls `POST /api/pesapal/initiate-order` (or `/api/pesapal/initiate` for the
  dev-test FAB) with the order id and `frontendUrl: window.location.origin`.
- Backend responds with `{ paymentUrl, orderId }`.
- Sets state and renders `<PesapalModal>` with those props — this is what
  opens the modal (`pesapalOpen = true`).
- `onSuccess(realOrderId)` clears the cart and navigates to `/track?orderId=...`.

### 2. `src/components/PesapalModal/PesapalModal.jsx`
- Renders `<iframe src={paymentUrl} allow="payment" onLoad={...} />` inside a
  custom modal shell (backdrop, header, carrier hint banner, footer).
- **Two independent completion signals**, either can resolve the payment:
  - **`postMessage` listener** — listens for `window.addEventListener('message', ...)`,
    checks `event.origin === CONVEX_SITE_URL` (origin check is required — do not
    relax this), and reacts to `event.data.type === 'PESAPAL_COMPLETED'`.
  - **Polling fallback** — every 3s calls `GET /api/pesapal/status?orderId=...`
    in case the postMessage was missed (e.g. user closed/reopened, iframe
    unload timing, some carrier-page navigation edge case).
  - Whichever fires first wins (`successShownRef` guard prevents double-fire).
- UI states: `pending` (iframe visible + loading skeleton until `onLoad`),
  `completed` (success overlay, then `onSuccess` after 2.2s), `failed` (retry/close).
- Detects MTN vs Airtel from the phone prefix purely to show a hint telling the
  user which tab to pick on Pesapal's page (77/78/76/39 → MTN, 70/75/74 → Airtel).

## Backend pieces (`convex/pesapal.ts` + `convex/http.ts`)

### Order submission (`convex/pesapal.ts`)
- `submitPesapalOrder()` calls Pesapal's `SubmitOrderRequest` with a
  `callback_url` — this is the critical part enabling the iframe flow. It's
  built as:
  ```
  callbackUrl = args.frontendUrl
    ? `${CONVEX_SITE_URL}/api/pesapal/ipn?frontendUrl=${encodeURIComponent(args.frontendUrl)}`
    : `${CONVEX_SITE_URL}/api/pesapal/ipn`
  ```
  i.e. the callback always points at our Convex site, never directly at the
  frontend — the frontend origin is just passed through as a query param for
  the non-iframe fallback case.
- Two actions build/submit an order and return `paymentUrl` to the frontend:
  - `initiatePesapalPayment` — dev-test flow (`/api/pesapal/initiate`), creates
    a throwaway `orders` doc directly.
  - `initiateOrderPayment` — real checkout flow (`/api/pesapal/initiate-order`),
    reads an existing `draftOrders` doc and submits using its details.

### Two callback routes on the *same* path, different HTTP methods (`convex/http.ts`)

- **`POST /api/pesapal/ipn`** — server-to-server IPN Pesapal calls directly
  (not via the user's browser/iframe at all). Fetches transaction status and
  patches the draft/real order in the DB. This is the source of truth for
  payment status; it's what `patchDraftOrderPaymentResult` uses to convert a
  draft order into a real order and decrement stock.
- **`GET /api/pesapal/ipn`** — this is the one the **iframe navigates to**.
  Pesapal's hosted payment page redirects the browser (inside the iframe) here
  after the user completes/cancels payment. This handler:
  1. Re-fetches the transaction status from Pesapal (belt-and-braces, in case
     the POST IPN hasn't landed yet) and patches the order.
  2. Returns a small self-contained HTML page (not JSON) with inline
     `<script>` that runs in the iframe's context:
     ```js
     const inIframe = window.self !== window.top;
     if (inIframe) {
       window.parent.postMessage({ type: 'PESAPAL_COMPLETED', orderId, status, realOrderId }, '*');
     } else {
       // full-page fallback: redirect the whole tab to /track
       window.location.href = frontendUrl + '/track?orderId=' + trackingId + '&new=true';
     }
     ```
  This dual-mode script is what makes the *same* callback URL work whether
  Pesapal's page happens to load inside our iframe (typical) or, for whatever
  reason, ends up loading in a full top-level tab (defensive fallback).

- **`GET /api/pesapal/status?orderId=...`** — polling endpoint used by
  `PesapalModal`'s 3s interval. Backed by
  `internal.pesapal.getAnyOrderPesapalStatus`, which tries both `draftOrders`
  and `orders` tables since `orderId` may be either depending on flow.

### CORS
All Pesapal routes (`initiate`, `initiate-order`, `ipn`, `status`) share
`pesapalHeaders` with `Access-Control-Allow-Origin: *` and have an `OPTIONS`
preflight handler registered in a loop — required because the iframe's inner
page and the polling `fetch` calls are cross-origin from the Convex site.

## Replicating this pattern elsewhere

To embed any third-party hosted payment/redirect flow in a modal instead of
navigating away:

1. Your backend must control (or proxy) the "return URL" the third party
   redirects to after completion — you can't post a message from a page you
   don't control.
2. That return-URL handler must serve HTML/JS (not just JSON), check
   `window.self !== window.top`, and `postMessage` the result to `window.parent`.
3. The parent page's `message` listener **must check `event.origin`** against
   the known backend origin before trusting `event.data`.
4. Always keep a polling fallback — `postMessage` can be missed (iframe
   torn down, user navigates away and back, etc.).
5. Keep a non-iframe fallback in the returned script too, in case the embed
   gets popped out to a full tab (some banking/mobile-money redirect chains do
   this outside your control).
