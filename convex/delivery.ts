import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

// ─── Fulfillment Hub & Boundary ─────────────────────────────────────────────
export const HUB = { lat: 0.358253, lng: 32.618251 }; // Ntinda Complex, Kampala
export const MAX_RADIUS_KM = 35;

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Zone Table (12 zones from delivery_calculation_guide.md) ──────────────
type ZoneRow = {
  name: string;
  keywords: string[];
  baseDistanceKm: number;
  baseFee: number;
  minFee: number;
  maxFee: number;
};

export const DEFAULT_ZONE_TABLE: ZoneRow[] = [
  { name: "Ntinda", keywords: ["ntinda"], baseDistanceKm: 1.5, baseFee: 5000, minFee: 5000, maxFee: 5000 },
  { name: "Kisasi", keywords: ["kisasi", "kisaasi"], baseDistanceKm: 3.5, baseFee: 5000, minFee: 5000, maxFee: 5000 },
  { name: "Kololo", keywords: ["kololo"], baseDistanceKm: 4.5, baseFee: 5000, minFee: 5000, maxFee: 5000 },
  { name: "Bus terminal", keywords: ["bus terminal", "taxi park"], baseDistanceKm: 6.5, baseFee: 7000, minFee: 7000, maxFee: 7000 },
  { name: "Luzira", keywords: ["luzira"], baseDistanceKm: 9.5, baseFee: 10000, minFee: 10000, maxFee: 10000 },
  { name: "Kyanja", keywords: ["kyanja"], baseDistanceKm: 5.5, baseFee: 6000, minFee: 5000, maxFee: 7000 },
  { name: "Kampala town", keywords: ["kampala town", "nakasero", "kampala central", "central"], baseDistanceKm: 6.0, baseFee: 8500, minFee: 7000, maxFee: 10000 },
  { name: "Bunga", keywords: ["bunga", "gaba", "munyonyo"], baseDistanceKm: 11.5, baseFee: 9000, minFee: 8000, maxFee: 10000 },
  { name: "Nsambya", keywords: ["nsambya", "kabalagala"], baseDistanceKm: 8.5, baseFee: 8500, minFee: 7000, maxFee: 10000 },
  { name: "Ntebe", keywords: ["entebbe", "ntebe", "kajjansi"], baseDistanceKm: 37.0, baseFee: 17500, minFee: 15000, maxFee: 20000 },
  { name: "Mengo-Nsabya", keywords: ["mengo", "nsabya", "rubaga"], baseDistanceKm: 9.0, baseFee: 8500, minFee: 7000, maxFee: 10000 },
  { name: "Gayaza", keywords: ["gayaza", "kasangati"], baseDistanceKm: 13.5, baseFee: 12500, minFee: 10000, maxFee: 15000 },
];

const DEFAULT_ZONE_NAME = "Kampala town";

async function loadZoneTable(ctx: QueryCtx | MutationCtx): Promise<ZoneRow[]> {
  const rows = await ctx.db.query("deliveryZones").collect();
  const seeded = rows.filter(
    (r): r is typeof r & { keywords: string[]; baseDistanceKm: number; baseFee: number; minFee: number; maxFee: number } =>
      !!r.keywords && r.baseDistanceKm !== undefined && r.baseFee !== undefined && r.minFee !== undefined && r.maxFee !== undefined
  );
  if (seeded.length === 0) return DEFAULT_ZONE_TABLE;
  return seeded.map((r) => ({
    name: r.name,
    keywords: r.keywords,
    baseDistanceKm: r.baseDistanceKm,
    baseFee: r.baseFee,
    minFee: r.minFee,
    maxFee: r.maxFee,
  }));
}

function matchZoneByKeyword(zones: ZoneRow[], addressText: string): ZoneRow | null {
  const lc = addressText.toLowerCase();
  return zones.find((z) => z.keywords.some((k) => lc.includes(k))) ?? null;
}

function matchZoneByProximity(zones: ZoneRow[], distanceKm: number): ZoneRow {
  return zones.reduce((best, z) =>
    Math.abs(distanceKm - z.baseDistanceKm) < Math.abs(distanceKm - best.baseDistanceKm) ? z : best
  );
}

function resolveZone(zones: ZoneRow[], distanceKm: number, addressText?: string): ZoneRow {
  if (zones.length === 0) {
    throw new Error("Delivery zone table is empty");
  }
  // 1. Keyword match, 2. proximity fallback (nearest baseDistanceKm always resolves to
  // something), 3. Kampala town as the ultimate safety net if proximity is ever unusable.
  const byKeyword = addressText ? matchZoneByKeyword(zones, addressText) : null;
  if (byKeyword) return byKeyword;
  return matchZoneByProximity(zones, distanceKm) ?? zones.find((z) => z.name === DEFAULT_ZONE_NAME) ?? zones[0];
}

export function computeSurcharge(zone: ZoneRow, distanceKm: number): number {
  const deltaD = distanceKm - zone.baseDistanceKm;
  const adjFee = zone.baseFee + deltaD * 500;
  const roundedFee = Math.ceil(adjFee / 500) * 500;
  return Math.max(zone.minFee, Math.min(zone.maxFee, roundedFee));
}

// Accepts a client-reported road distance only if it plausibly derives from the
// straight-line distance; otherwise substitutes a fixed winding-road estimate.
export function verifyDistance(straightLineKm: number, clientDistanceKm?: number): number {
  if (
    clientDistanceKm !== undefined &&
    clientDistanceKm >= straightLineKm &&
    clientDistanceKm <= straightLineKm * 2.5
  ) {
    return clientDistanceKm;
  }
  return straightLineKm * 1.25;
}

// ─── Rush-hour ETA (Uganda local time, UTC+3) ──────────────────────────────
function rushMultiplier(hour: number, minute: number): number {
  const t = hour + minute / 60;
  if (t >= 8 && t < 10) return 1.5;
  if (t >= 12.5 && t < 14) return 1.3;
  if (t >= 17 && t < 19.5) return 1.7;
  return 1.0;
}

export function computeEtaMinutes(distanceKm: number, itemCount = 0): number {
  const base = 20 + Math.round(distanceKm * 1.5);
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000); // shift to UTC+3
  let eta = Math.round(base * rushMultiplier(now.getUTCHours(), now.getUTCMinutes()));
  if (itemCount > 5) eta += 5;
  return eta;
}

// ─── The authoritative quote (single source of truth) ──────────────────────
export type DeliveryQuote = {
  outOfBounds: boolean;
  zone: string | null;
  distanceKm: number;
  deliveryFee: number;
  etaMinutes: number | null;
};

export async function computeDeliveryQuote(
  ctx: QueryCtx | MutationCtx,
  args: { lat: number; lng: number; addressText?: string; clientDistanceKm?: number; itemCount?: number }
): Promise<DeliveryQuote> {
  const straightLineKm = haversineDistance(HUB.lat, HUB.lng, args.lat, args.lng);

  if (straightLineKm > MAX_RADIUS_KM) {
    return { outOfBounds: true, zone: null, distanceKm: straightLineKm, deliveryFee: 0, etaMinutes: null };
  }

  const distanceKm = verifyDistance(straightLineKm, args.clientDistanceKm);
  const zones = await loadZoneTable(ctx);
  const zone = resolveZone(zones, distanceKm, args.addressText);
  const deliveryFee = computeSurcharge(zone, distanceKm);
  const etaMinutes = computeEtaMinutes(distanceKm, args.itemCount);

  return { outOfBounds: false, zone: zone.name, distanceKm, deliveryFee, etaMinutes };
}

// Legacy path for callers with no coordinates (e.g. staff/admin manual order entry that
// only picks a zone/landmark name): matches the zone directly by name/keyword and prices
// off its base distance. No 35km gate applies since there's no coordinate to test.
export async function computeDeliveryQuoteByName(
  ctx: QueryCtx | MutationCtx,
  nameOrKeyword: string,
  itemCount?: number
): Promise<DeliveryQuote> {
  const zones = await loadZoneTable(ctx);
  const zone =
    zones.find((z) => z.name.toLowerCase() === nameOrKeyword.toLowerCase()) ??
    matchZoneByKeyword(zones, nameOrKeyword) ??
    zones.find((z) => z.name === DEFAULT_ZONE_NAME) ??
    zones[0];
  const distanceKm = zone.baseDistanceKm;
  const deliveryFee = computeSurcharge(zone, distanceKm);
  const etaMinutes = computeEtaMinutes(distanceKm, itemCount);
  return { outOfBounds: false, zone: zone.name, distanceKm, deliveryFee, etaMinutes };
}

// ─── Public API ─────────────────────────────────────────────────────────────

// Safe to call from guest (unauthenticated) checkout: read-only, no side effects.
export const getDeliveryQuote = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    addressText: v.optional(v.string()),
    clientDistanceKm: v.optional(v.number()),
    itemCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => computeDeliveryQuote(ctx, args),
});

// Legacy path for saved addresses with no lat/lng on file (pre-dating this feature).
// Prices off the matched zone's base distance directly; no 35km gate applies.
export const getDeliveryQuoteByName = query({
  args: {
    zoneOrLandmarkName: v.string(),
    itemCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => computeDeliveryQuoteByName(ctx, args.zoneOrLandmarkName, args.itemCount),
});

export const getExpectedTransitTime = query({
  args: {
    distanceKm: v.number(),
    itemCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => ({ etaMinutes: computeEtaMinutes(args.distanceKm, args.itemCount) }),
});

// One-time seed/backfill of the zone fee table onto the existing `deliveryZones` rows.
// Run via: npx convex run delivery:seedDeliveryZoneFees
export const seedDeliveryZoneFees = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const zone of DEFAULT_ZONE_TABLE) {
      const existing = await ctx.db
        .query("deliveryZones")
        .withIndex("by_name", (q) => q.eq("name", zone.name))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          keywords: zone.keywords,
          baseDistanceKm: zone.baseDistanceKm,
          baseFee: zone.baseFee,
          minFee: zone.minFee,
          maxFee: zone.maxFee,
        });
      } else {
        await ctx.db.insert("deliveryZones", {
          name: zone.name,
          timeMinutes: computeEtaMinutes(zone.baseDistanceKm),
          keywords: zone.keywords,
          baseDistanceKm: zone.baseDistanceKm,
          baseFee: zone.baseFee,
          minFee: zone.minFee,
          maxFee: zone.maxFee,
        });
      }
    }
    return { seeded: DEFAULT_ZONE_TABLE.length };
  },
});
