import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Pre-launch user shape (as exported from the old Convex project)
// ---------------------------------------------------------------------------
interface RawUser {
  _id: string;
  _creationTime: number;
  createdAt: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  stage?: string;
  customerNotes?: string | null;
  isWalkIn?: boolean;
  isDevMode?: boolean;
  password?: string;
  orderIds?: string[];
}

// Pre-launch activity shape
interface RawActivity {
  _id: string;
  _creationTime: number;
  createdAt: number;
  customerId: string;
  staffId: string;
  staffName: string;
  type: string;
  note: string;
  status: string;
  completedAt?: number;
  scheduledDate?: string;
  isDevMode?: boolean;
}

// ---------------------------------------------------------------------------
// Stage normalisation: pre-launch strings → current users.role values
// ---------------------------------------------------------------------------
function normaliseRole(
  stage: string | undefined | null
): "expecting" | "parent" | undefined {
  if (!stage) return undefined;
  if (stage === "Pregnant") return "expecting";
  if (stage === "Newborn" || stage === "Toddler+") return "parent";
  return undefined;
}

// ---------------------------------------------------------------------------
// importPreLaunchUsers
//   Accepts the raw users.json array and inserts qualifying records.
//   Returns a map { oldId → newConvexId } for the activity import step.
// ---------------------------------------------------------------------------
export const importPreLaunchUsers = internalMutation({
  args: {
    users: v.array(v.any()),
  },
  handler: async (ctx, args): Promise<Record<string, Id<"users">>> => {
    const idMap: Record<string, Id<"users">> = {};

    for (const raw of args.users as RawUser[]) {
      // ── Exclusion filters ────────────────────────────────────────────────
      if (raw.isDevMode === true) continue;
      if (raw.role === "staff" || raw.role === "admin") continue;
      if (raw.email && raw.email.endsWith("@dennan.ug")) continue;

      // ── Dedup: already imported? ─────────────────────────────────────────
      const existing = await ctx.db
        .query("users")
        .withIndex("by_preLaunchId", (q) => q.eq("preLaunchId", raw._id))
        .first();

      if (existing) {
        idMap[raw._id] = existing._id;
        continue;
      }

      // ── Dedup: existing customer by phone then email ─────────────────────
      let matchedId: Id<"users"> | null = null;

      if (raw.phone) {
        // phone is not indexed — scan is acceptable for this one-time import
        const allByPhone = await ctx.db
          .query("users")
          .withIndex("email", (q) =>
            // we can't index phone directly, so we use email as a fallback
            // after checking phone inline below
            q.eq("email", raw.email ?? "__no_match__")
          )
          .first();
        // Try phone match via email index miss — check separately
        if (!allByPhone && raw.phone) {
          // brute-force match on phone for this one-time import only
          // (acceptable: small dataset, one-time operation)
          const all = await ctx.db.query("users").take(2000);
          const hit = all.find((u) => u.phone === raw.phone);
          if (hit) matchedId = hit._id;
        }
      }

      if (!matchedId && raw.email) {
        const byEmail = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", raw.email ?? ""))
          .first();
        if (byEmail) matchedId = byEmail._id;
      }

      if (matchedId) {
        // Existing user — just stamp the provenance fields
        await ctx.db.patch(matchedId, {
          preLaunchId: raw._id,
          importSource: "pre_launch",
        });
        idMap[raw._id] = matchedId;
        continue;
      }

      // ── Insert new user ──────────────────────────────────────────────────
      const role = normaliseRole(raw.stage);
      const newId = await ctx.db.insert("users", {
        name: raw.name ?? undefined,
        email: raw.email ?? undefined,
        phone: raw.phone ?? undefined,
        isWalkIn: raw.isWalkIn ?? false,
        isOnboarded: true,
        role,
        customerNotes: raw.customerNotes ?? undefined,
        preLaunchId: raw._id,
        importSource: "pre_launch",
        leadStatus: "new",
      });

      idMap[raw._id] = newId;
    }

    return idMap;
  },
});

// ---------------------------------------------------------------------------
// importPreLaunchActivities
//   Accepts the raw customer_activities.json array plus the idMap from above.
//   Inserts into customerActivities, skipping isDevMode and already-imported rows.
// ---------------------------------------------------------------------------
export const importPreLaunchActivities = internalMutation({
  args: {
    activities: v.array(v.any()),
    // Serialised as JSON string because Convex args can't be arbitrary Records
    idMapJson: v.string(),
  },
  handler: async (ctx, args) => {
    const idMap: Record<string, Id<"users">> = JSON.parse(args.idMapJson);

    // Map old staff IDs to their canonical staff emails
    const oldStaffIdToEmail: Record<string, string> = {
      "jd70m48nm5c7xhfx4qhtjbepsd88k8nd": "matovu@dennan.ug",
      "jd7ek3rb2wdgr1r3nvmttrwn2x88kp7h": "stacey@dennan.ug",
      "jd7fqtypn47x0qjcg24ww8c08s88jskh": "sherry@dennan.ug",
      "jd7e59v4tmgwh006tcj9w2y3m188kvn4": "brian@dennan.ug",
      "jd7bd3ea9rgfb5fzydq68z0db988jsp2": "mackline@dennan.ug",
    };

    let inserted = 0;
    let skipped = 0;

    for (const raw of args.activities as RawActivity[]) {
      // ── Exclusion ────────────────────────────────────────────────────────
      if (raw.isDevMode === true) {
        skipped++;
        continue;
      }

      // ── Dedup ────────────────────────────────────────────────────────────
      const existing = await ctx.db
        .query("customerActivities")
        .withIndex("by_preLaunchId", (q) => q.eq("preLaunchId", raw._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // ── Resolve IDs ──────────────────────────────────────────────────────
      const customerId = idMap[raw.customerId];
      let staffId = idMap[raw.staffId];

      // If staffId not in map (which is expected since staff are not imported),
      // look up by email in the current DB.
      if (!staffId) {
        const staffEmail = oldStaffIdToEmail[raw.staffId];
        if (staffEmail) {
          const staffUser = await ctx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", staffEmail))
            .first();
          if (staffUser) {
            staffId = staffUser._id;
          }
        }
      }

      if (!customerId || !staffId) {
        // Customer or staff not in map — skip gracefully
        skipped++;
        continue;
      }

      // ── Map type/status ──────────────────────────────────────────────────
      const type = (
        raw.type === "call" || raw.type === "note" ? raw.type : "note"
      ) as "note" | "call";

      const status = (
        raw.status === "completed" ? "completed"
        : raw.status === "pending" ? "pending"
        : "completed"
      ) as "pending" | "completed" | "cancelled";

      // ── Insert ───────────────────────────────────────────────────────────
      await ctx.db.insert("customerActivities", {
        customerId,
        staffId,
        staffName: raw.staffName,
        type,
        note: raw.note,
        status,
        scheduledDate: raw.scheduledDate ?? undefined,
        createdAt: raw.createdAt,
        completedAt: raw.completedAt ?? undefined,
        preLaunchId: raw._id,
        importSource: "pre_launch",
      });

      inserted++;
    }

    return { inserted, skipped };
  },
});
