# Delivery Calculation System Implementation Guide

This guide describes the design, database schema, algorithm, and implementation of the delivery calculation system in the Dennan storefront application. It outlines both the frontend React client flow and the backend Convex server validation.

---

## 1. System Constants & Reference Coordinates

All delivery calculations are based on road distance starting from the central fulfillment hub:
* **Fulfillment Hub**: Ntinda Complex, Kampala, Uganda
* **Coordinates**: Latitude `0.358253`, Longitude `32.618251`
* **Maximum Delivery Radius**: 35 km straight-line distance (approx. 42 km road distance)

### Predefined Delivery Zones
The system maintains a list of key zones (`DELIVERY_ZONES`). Each zone defines its baseline boundaries, fees, and fallback rules:

| Zone Name | Match Keywords | Base Distance (km) | Base Fee (UGX) | Min Fee (UGX) | Max Fee (UGX) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Ntinda** | `ntinda` | 1.5 | 5,000 | 5,000 | 5,000 |
| **Kisasi** | `kisasi`, `kisaasi` | 3.5 | 5,000 | 5,000 | 5,000 |
| **Kololo** | `kololo` | 4.5 | 5,000 | 5,000 | 5,000 |
| **Bus terminal** | `bus terminal`, `taxi park`, etc. | 6.5 | 7,000 | 7,000 | 7,000 |
| **Luzira** | `luzira` | 9.5 | 10,000 | 10,000 | 10,000 |
| **Kyanja** | `kyanja` | 5.5 | 6,000 | 5,000 | 7,000 |
| **Kampala town**| `kampala town`, `nakasero`, etc. | 6.0 | 8,500 | 7,000 | 10,000 |
| **Bunga** | `bunga`, `gaba`, `munyonyo`, etc. | 11.5 | 9,000 | 8,000 | 10,000 |
| **Nsambya** | `nsambya`, `kabalagala`, etc. | 8.5 | 8,500 | 7,000 | 10,000 |
| **Ntebe** | `entebbe`, `ntebe`, `kajjansi`, etc. | 37.0 | 17,500 | 15,000 | 20,000 |
| **Mengo-Nsabya**| `mengo`, `nsabya`, `rubaga`, etc. | 9.0 | 8,500 | 7,000 | 10,000 |
| **Gayaza** | `gayaza`, `kasangati`, etc. | 13.5 | 12,500 | 10,000 | 15,000 |

---

## 2. Limits and Restrictions on Delivery Locations

To ensure operational viability and control delivery logistics, the application enforces two levels of limits on delivery locations:

### A. Country Restriction (Uganda)
All location inputs are geofenced to Uganda to prevent users from selecting international addresses:
* **Modern Places API**: Configured with `includedRegionCodes: ['ug']`.
* **Legacy AutocompleteService**: Configured with `componentRestrictions: { country: 'ug' }`.
* Both implementations bias suggestions within a $50\text{ km}$ radius of the Kampala hub coordinates (`0.358253, 32.618251`).

### B. Maximum Distance Gate (35 km Radius Limit)
A strict **$35\text{ km}$ straight-line (Haversine) distance limit** is enforced from the Ntinda Complex fulfillment hub:
1. **Client-Side Enforcement**:
   - The frontend calculates the straight-line Haversine distance from the hub coordinates to the selected address.
   - If the distance exceeds $35\text{ km}$, a warning banner is shown: 
     > *"Sorry, this location is too far away for delivery. We only deliver up to Entebbe/Gayaza outskirts (approx 42km road distance)."*
   - The user is blocked from confirming the location.
2. **Server-Side Enforcement**:
   - During order placement, the [placeOrder](file:///c:/Users/HP/Desktop/dennan/dennan_landing_page_react/convex/orders.ts#L241) mutation recalculates the straight-line Haversine distance securely on the backend.
   - If it exceeds $35\text{ km}$, the server throws a `ConvexError("Delivery location is out of bounds (too far)")` to reject the order, preventing any API request spoofing or tampering.

---

## 3. Database Schema (`convex/schema.ts`)

Delivery addresses and calculated fees are persisted in three main tables:

### A. Users Table (`users`)
Saves user-specific locations and structured addresses for future checkout pre-filling:
```typescript
deliveryLocations: v.optional(v.array(v.string())), // Array of matched zone names (e.g., ["Ntinda", "Kololo"])
deliveryAddresses: v.optional(
  v.array(
    v.object({
      street: v.string(),     // Fully formatted address string from Google Places
      zone: v.string(),       // The matched zone name
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      distance: v.optional(v.number()), // Calculated road distance in km
    })
  )
)
```

### B. Orders Table (`orders` & `draftOrders`)
Persists the final authorized delivery parameters used for order tracking and fulfillment:
```typescript
deliveryAddress: v.object({
  street: v.string(),
  zone: v.string(),
  deliveryFee: v.number(),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  distance: v.optional(v.number()),
}),
deliveryFee: v.number(),
grandTotal: v.number(),
```

---

## 4. Frontend Implementation (`src/pages/Checkout/Checkout.jsx`)

The frontend manages location autocomplete, calculates distance/fee fallbacks, and handles UI updates.

### A. Script Loading & Autocomplete Flow
1. **Google Maps Javascript API**: Loaded dynamically inside a `useEffect` hook using the library parameter `libraries=places` and API Key `VITE_GOOGLE_MAPS_API_KEY`.
2. **Hybrid Suggestions Search**: 
   * **Modern Places API**: Attempts to fetch autocomplete suggestions via `placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions` restricted to Uganda (`ug`) and biased around Ntinda Complex.
   * **Legacy Fallback**: If the modern API is not enabled or fails, it falls back to the legacy `window.google.maps.places.AutocompleteService.getPlacePredictions`.

### B. Distance Calculations
When a user selects a location, coordinates (`lat`, `lng`) are obtained, and the client calculates driving road distance using:
1. **Google Routes Matrix API**: Calls `computeRouteMatrix` with the `DRIVING` travel mode to obtain the exact road distance in meters.
2. **Haversine Straight-line Fallback**: If the Routes API fails, the straight-line distance is calculated and scaled by a **$1.25$ winding multiplier** to estimate road distance:
   $$d_{\text{road}} = d_{\text{straight}} \times 1.25$$

The straight-line Haversine implementation:
```javascript
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
```

### C. Client Out-of-Bounds Enforcement
If the computed straight-line distance exceeds **$35\text{ km}$**, the client blocks confirmation and renders an out-of-bounds error banner.

### D. Zone Matching & Dynamic Fee Calculations
If the location is within bounds:
1. **Keyword Match**: Checks if the address string includes any zone-specific keywords.
2. **Proximity Fallback**: If no keyword matches, the system selects the zone whose `baseDistance` is closest to the calculated road distance:
   $$\text{Select zone with min } |d_{\text{road}} - \text{zone.baseDistance}|$$
3. **Kampala Town Fallback**: If all else fails, defaults to "Kampala town".
4. **Dynamic Surcharge Equation**:
   * Calculate distance difference: $\Delta d = d_{\text{road}} - \text{matchedZone.baseDistance}$
   * Calculate adjusted fee: $\text{Fee}_{\text{adj}} = \text{matchedZone.baseFee} + (\Delta d \times 500\text{ UGX})$
   * Round up to the nearest $500\text{ UGX}$: $\text{Fee}_{\text{rounded}} = \lceil\text{Fee}_{\text{adj}} / 500\rceil \times 500$
   * Clamp within the zone's boundaries: $\text{Fee}_{\text{final}} = \max\left(\text{minFee}, \min\left(\text{maxFee}, \text{Fee}_{\text{rounded}}\right)\right)$
5. **ETA Estimation**:
   $$\text{ETA (mins)} = 20 + \text{round}(d_{\text{road}} \times 1.5)$$

---

## 5. Backend Implementation & Security (`convex/orders.ts`)

To prevent tampering or price manipulation on the client, the `placeOrder` mutation recalculates all values securely on the server.

### A. Spoofing Prevention & Fallback Distance
When the `placeOrder` mutation is invoked:
1. The server computes the straight-line distance (`straightLine`) from Ntinda Complex to the target coordinates using a server-side Haversine helper.
2. **Boundary Gate**: Throws a `ConvexError("Delivery location is out of bounds (too far)")` if `straightLine > 35 km`.
3. **Distance Verification**: Verifies the client-reported road distance (`clientDistance`):
   $$\text{straightLine} \le \text{clientDistance} \le \text{straightLine} \times 2.5$$
   * If `clientDistance` is within this logical range, the backend accepts it.
   * If it falls outside the range, the backend enforces a secure fallback:
     $$d_{\text{verified}} = \text{straightLine} \times 1.25$$

### B. Secure Server-Side Calculations
The backend duplicates the keyword matching, proximity calculations, dynamic surcharge formulas, rounding, and clamping rules using the validated distance:
```typescript
const deltaD = verifiedDistance - matchedZone.baseDistance;
const adjFee = matchedZone.baseFee + deltaD * 500;
const roundedFee = Math.ceil(adjFee / 500) * 500;
calculatedDeliveryFee = Math.max(matchedZone.minFee, Math.min(matchedZone.maxFee, roundedFee));
```
* **Free Delivery Waiver**: If the cart contains only promotional/free-delivery items (item code `xmn-xmn`), the calculated delivery fee is overridden to `0`.

### C. Expected Transit Time Query (`orders.getExpectedTransitTime`)
Provides real-time ETAs for user transparency. It evaluates Ugandan local time (UTC+3) to apply dynamic traffic multipliers:
* **Morning Rush Hour (08:00 - 10:00)**: $1.5\times$ base ETA
* **Lunch Rush Hour (12:30 - 14:00)**: $1.3\times$ base ETA
* **Evening Rush Hour (17:00 - 19:30)**: $1.7\times$ base ETA
* **Bulk Order Buffer**: If the total item count exceeds 5 units, a 5-minute processing buffer is added.

---

## 6. UI Integration & Interaction Flow

The checkout interface coordinates these flows to provide feedback:
1. **Real-time Totals Breakdown**:
   * Displays `Select location` under the Delivery row until an address is chosen.
   * Renders `FREE` if the cart qualifies for promotional free delivery.
   * Updates the grand total instantly whenever a location is confirmed or changed.
2. **Call-To-Action (CTA) Lock**:
   * The checkout action button is disabled unless:
     * Full Name and Phone Number are entered and validated.
     * Delivery location is set and confirmed.
     * Mobile Money (MoMo) number is entered (if MoMo payment is selected).
3. **Error Auto-Scroll**:
   * If the user attempts to submit the form without a confirmed location, the window smooth-scrolls and focuses the viewport on the "Set Delivery Location" button.
