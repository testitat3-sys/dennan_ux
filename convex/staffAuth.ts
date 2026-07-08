import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

declare const process: {
  env: Record<string, string | undefined>;
};

// Helper function to generate a secure SHA-256 password hash using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const salt = process.env.STAFF_AUTH_SALT;
  if (!salt) {
    console.warn("STAFF_AUTH_SALT environment variable is not set. Hashing password with fallback salt.");
  }
  const activeSalt = salt || "dennan-default-secure-salt-2026";
  const msgBuffer = new TextEncoder().encode(activeSalt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Helper to generate a unique session token
function generateSessionToken(): string {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 15)).join("-");
  }
}

/**
 * Shared server-side helper to verify a staff session token.
 * This is used across all gated functions (orders, products, customerActivities, etc.).
 */
export async function verifyStaffSession(
  ctx: { db: any },
  token: string,
  allowedRoles?: ("staff" | "admin")[]
): Promise<{ user: Doc<"users">; session: Doc<"staffSessions"> }> {
  if (!token) {
    throw new Error("Unauthorized: Session token is missing");
  }

  const session = await ctx.db
    .query("staffSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session) {
    throw new Error("Unauthorized: Invalid session token");
  }

  if (session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: Session expired");
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error("Unauthorized: Associated user not found");
  }

  if (!user.accountRole) {
    throw new Error("Access denied: User is not a staff member or administrator");
  }

  if (allowedRoles && !allowedRoles.includes(user.accountRole as any)) {
    throw new Error(`Access denied: Required role ${allowedRoles.join(" or ")}, but got ${user.accountRole}`);
  }

  return { user, session };
}

/**
 * Seeding mutation for staff and admin credentials.
 * Reads keys from STAFF_PASSWORDS_JSON env var to populate password fields.
 */
export const seedStaff = mutation({
  args: {},
  handler: async (ctx) => {
    const passwordsJson = process.env.STAFF_PASSWORDS_JSON;
    let passwords: Record<string, string> = {};
    if (passwordsJson) {
      try {
        passwords = JSON.parse(passwordsJson);
      } catch (e) {
        console.error("Failed to parse STAFF_PASSWORDS_JSON:", e);
      }
    }

    // 1. Fetch existing users with accountRole set (staff or admin)
    const staff = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", "staff"))
      .collect();
    const admins = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", "admin"))
      .collect();
    const existingStaffAndAdmin = [...staff, ...admins];

    // 2. Delete leaked/stale staff accounts whose emails do not end with @dennan.ug
    for (const u of existingStaffAndAdmin) {
      if (!u.email || !u.email.endsWith("@dennan.ug")) {
        // Delete all active sessions belonging to this user
        const sessions = await ctx.db
          .query("staffSessions")
          .withIndex("by_userId", (q) => q.eq("userId", u._id))
          .collect();
        for (const session of sessions) {
          await ctx.db.delete(session._id);
        }
        await ctx.db.delete(u._id);
        console.log(`Deleted leaked/stale staff user: ${u.email} (${u.name})`);
      }
    }

    // 3. Roster of seed users
    const staffList = [
      { name: "Matovu", email: "matovu@dennan.ug", key: "matovu", accountRole: "staff" as const },
      { name: "Mackline", email: "mackline@dennan.ug", key: "mackline", accountRole: "staff" as const },
      { name: "Stacey", email: "stacey@dennan.ug", key: "stacey", accountRole: "staff" as const },
      { name: "Sherry", email: "sherry@dennan.ug", key: "sherry", accountRole: "staff" as const },
      { name: "Brian", email: "brian@dennan.ug", key: "brian", accountRole: "admin" as const },
    ];

    let seededCount = 0;
    for (const u of staffList) {
      const password = passwords[u.key];
      if (!password) {
        console.warn(`No password found in environment for key: ${u.key}. Skipping seeding for ${u.email}`);
        continue;
      }

      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", u.email))
        .first();

      const hashedPassword = await hashPassword(password);

      if (!existing) {
        await ctx.db.insert("users", {
          name: u.name,
          email: u.email,
          password: hashedPassword,
          accountRole: u.accountRole,
          isAdmin: u.accountRole === "admin",
          isOnboarded: true,
        });
        seededCount++;
      } else {
        await ctx.db.patch(existing._id, {
          name: u.name,
          password: hashedPassword,
          accountRole: u.accountRole,
          isAdmin: u.accountRole === "admin",
          isOnboarded: true,
        });
      }
    }

    return { success: true, seededCount };
  },
});

/**
 * Logs in a staff member or administrator.
 * Creates a custom session valid for 24 hours.
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.password || !user.accountRole) {
      throw new Error("Invalid email or password");
    }

    const hashedPassword = await hashPassword(args.password);
    if (user.password !== hashedPassword) {
      throw new Error("Invalid email or password");
    }

    // Create session token and set expiry to 24 hours
    const token = generateSessionToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await ctx.db.insert("staffSessions", {
      userId: user._id,
      token,
      expiresAt,
    });

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountRole: user.accountRole,
      },
    };
  },
});

/**
 * Logs out a staff member, invalidating their token.
 */
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("staffSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Queries and verifies a staff session token.
 * Returns user profile info if valid, otherwise null.
 */
export const verifyToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { user } = await verifyStaffSession(ctx, args.token);
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        accountRole: user.accountRole,
      };
    } catch (e) {
      return null;
    }
  },
});

/**
 * Rotates an active session token.
 * Deletes the old session and returns a new session valid for 12 hours.
 */
export const rotateSessionToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify old token
    const { user, session } = await verifyStaffSession(ctx, args.token);

    // 2. Generate a new token and insert new session with 12 hour expiry
    const newToken = generateSessionToken();
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

    await ctx.db.delete(session._id);
    await ctx.db.insert("staffSessions", {
      userId: user._id,
      token: newToken,
      expiresAt,
    });

    return {
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountRole: user.accountRole,
      },
    };
  },
});

/**
 * Admin-only query: retrieves list of staff users and their claimed orders performance.
 */
export const getStaffList = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify that caller is an admin
    await verifyStaffSession(ctx, args.token, ["admin"]);

    // 2. Retrieve all staff members
    const staffUsers = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", "staff"))
      .collect();

    const staffPerformanceList = [];

    // 3. Query claimed orders for each staff member
    for (const u of staffUsers) {
      const claimedOrders = await ctx.db
        .query("orders")
        .withIndex("by_claimedBy", (q) => q.eq("claimedBy", u._id))
        .collect();

      staffPerformanceList.push({
        id: u._id,
        name: u.name,
        email: u.email,
        accountRole: u.accountRole,
        orders: claimedOrders.map((o) => ({
          customerName: o.deliveryAddress.name,
          amountPaid: o.grandTotal,
          status: o.status,
        })),
      });
    }

    return staffPerformanceList;
  },
});

// Lightweight staff+admin name roster for the POS "staff who worked on this" picker.
// Unlike getStaffList (admin-only, includes every claimed order's details), this is
// accessible to any staff/admin and returns only what's needed to populate a dropdown.
export const getStaffRoster = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyStaffSession(ctx, args.token, ["staff", "admin"]);

    const staffUsers = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", "staff"))
      .collect();
    const adminUsers = await ctx.db
      .query("users")
      .withIndex("by_accountRole", (q) => q.eq("accountRole", "admin"))
      .collect();

    return [...staffUsers, ...adminUsers]
      .map((u) => ({ id: u._id, name: u.name || "Unnamed Staff", accountRole: u.accountRole }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
