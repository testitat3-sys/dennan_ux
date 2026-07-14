import { query, mutation } from "../_generated/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type {
  GenericDatabaseReader,
  OrderedQuery,
  Query,
  QueryInitializer,
} from "convex/server";

/**
 * Read-cost instrumentation for the admin DB I/O baseline dashboard.
 *
 * Convex queries are read-only transactions: they cannot write to the
 * database, use ctx.scheduler, or call ctx.runMutation. So a `trackedQuery`
 * can't persist its own read count - instead it tallies reads via a wrapped
 * `ctx.db` and rides the tally back to the client on the return value as
 * `_io`. The client (storefront/admin `useTrackedQuery` hook) is the one
 * that both sees this value and can call the `recordIO` mutation to persist
 * it. Mutations/actions CAN write, so `trackedMutation`/`trackedAction`
 * persist the tally directly, no client round-trip needed.
 */

export interface IOTally {
  reads: number;
}

function wrapOrderedQuery<T>(q: OrderedQuery<T>, tally: IOTally): OrderedQuery<T> {
  const wrapped = {
    filter: (pred: any) => wrapOrderedQuery((q as any).filter(pred), tally),
    paginate: async (opts: any) => {
      const res = await q.paginate(opts);
      tally.reads += res.page.length;
      return res;
    },
    collect: async () => {
      const r = await q.collect();
      tally.reads += r.length;
      return r;
    },
    take: async (n: number) => {
      const r = await q.take(n);
      tally.reads += r.length;
      return r;
    },
    first: async () => {
      const r = await q.first();
      if (r) tally.reads += 1;
      return r;
    },
    unique: async () => {
      const r = await q.unique();
      if (r) tally.reads += 1;
      return r;
    },
    [Symbol.asyncIterator]: () => {
      const it = (q as any)[Symbol.asyncIterator]();
      return {
        next: async () => {
          const n = await it.next();
          if (!n.done) tally.reads += 1;
          return n;
        },
      };
    },
  };
  return wrapped as unknown as OrderedQuery<T>;
}

function wrapQuery<T>(q: Query<T>, tally: IOTally): Query<T> {
  const base = wrapOrderedQuery(q, tally);
  return {
    ...base,
    order: (dir: "asc" | "desc") => wrapOrderedQuery(q.order(dir), tally),
  } as unknown as Query<T>;
}

function wrapQueryInitializer<T>(qi: QueryInitializer<T>, tally: IOTally): QueryInitializer<T> {
  const base = wrapQuery(qi, tally);
  return {
    ...base,
    fullTableScan: () => wrapQuery(qi.fullTableScan(), tally),
    withIndex: (name: any, range?: any) => wrapQuery(qi.withIndex(name, range), tally),
    withSearchIndex: (name: any, filter: any) =>
      wrapOrderedQuery(qi.withSearchIndex(name, filter), tally),
  } as unknown as QueryInitializer<T>;
}

/**
 * Wraps a query/mutation ctx.db so every `.collect()`/`.take()`/`.paginate()`/
 * `.first()`/`.unique()`/async-iteration/`.get()` call tallies the number of
 * documents actually read into `tally.reads`. Write methods (insert/patch/
 * replace/delete), if present on the underlying db (mutation context), are
 * passed through untouched - this helper only meters reads.
 */
export function wrapDb<T extends GenericDatabaseReader<any>>(db: T, tally: IOTally): T {
  const wrapped: any = {
    get: async (...args: any[]) => {
      const r = await (db.get as any)(...args);
      if (r) tally.reads += 1;
      return r;
    },
    query: (table: any) => wrapQueryInitializer(db.query(table) as any, tally),
    normalizeId: db.normalizeId.bind(db),
    system: db.system,
  };

  const writer = db as any;
  if (typeof writer.insert === "function") {
    wrapped.insert = writer.insert.bind(writer);
    wrapped.patch = writer.patch.bind(writer);
    wrapped.replace = writer.replace.bind(writer);
    wrapped.delete = writer.delete.bind(writer);
  }

  return wrapped as T;
}

/** "YYYY-MM-DD", server-local - matches the day-string convention already used in orders.ts. */
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get-or-init-then-patch both the per-day and all-time counters for a
 * function, mirroring the singleton read-then-patch idiom in
 * convex/stockCounters.ts (`getOrInitCounters`/`applyStockCounterDelta`).
 * Never scans - always a point lookup by index.
 */
export async function bumpIOCounters(
  ctx: MutationCtx,
  functionName: string,
  reads: number,
  day: string = todayStr()
): Promise<void> {
  const dailyExisting = await ctx.db
    .query("dbIOCounters")
    .withIndex("by_functionName_and_day", (q) => q.eq("functionName", functionName).eq("day", day))
    .unique();
  if (dailyExisting) {
    await ctx.db.patch(dailyExisting._id, {
      reads: dailyExisting.reads + reads,
      invocations: dailyExisting.invocations + 1,
    });
  } else {
    await ctx.db.insert("dbIOCounters", { functionName, day, reads, invocations: 1 });
  }

  const allTimeExisting = await ctx.db
    .query("dbIOAllTimeCounters")
    .withIndex("by_functionName", (q) => q.eq("functionName", functionName))
    .unique();
  if (allTimeExisting) {
    await ctx.db.patch(allTimeExisting._id, {
      reads: allTimeExisting.reads + reads,
      invocations: allTimeExisting.invocations + 1,
    });
  } else {
    await ctx.db.insert("dbIOAllTimeCounters", { functionName, reads, invocations: 1 });
  }
}

type AnyArgs = Record<string, any>;

/**
 * Drop-in replacement for Convex's `query()` that meters reads and piggybacks
 * the tally onto the return value as `_io`, since queries can't persist it
 * themselves. Handler code is unchanged - it just receives a `ctx` whose `db`
 * is metered. Callers must go through the `useTrackedQuery` frontend hook
 * (not raw `useQuery`) so the `{ data, _io }` envelope is transparently
 * unwrapped back to a normal `data` shape for components.
 */
export function trackedQuery<Args extends AnyArgs, R>(
  name: string,
  def: { args: Args; handler: (ctx: QueryCtx, args: any) => Promise<R> }
) {
  return query({
    args: def.args,
    handler: async (ctx: QueryCtx, args: any) => {
      const tally: IOTally = { reads: 0 };
      const trackedCtx: QueryCtx = { ...ctx, db: wrapDb(ctx.db, tally) };
      const data = await def.handler(trackedCtx, args);
      return { data, _io: { reads: tally.reads, fn: name } };
    },
  });
}

/**
 * Drop-in replacement for Convex's `mutation()` that meters reads and
 * persists the tally directly (mutations can write, so no client round-trip
 * is needed). Instrumentation failures never break the underlying mutation.
 */
export function trackedMutation<Args extends AnyArgs, R>(
  name: string,
  def: { args: Args; handler: (ctx: MutationCtx, args: any) => Promise<R> }
) {
  return mutation({
    args: def.args,
    handler: async (ctx: MutationCtx, args: any) => {
      const tally: IOTally = { reads: 0 };
      const trackedCtx: MutationCtx = { ...ctx, db: wrapDb(ctx.db, tally) };
      const result = await def.handler(trackedCtx, args);
      try {
        await bumpIOCounters(ctx, name, tally.reads);
      } catch {
        // Instrumentation must never break the real mutation.
      }
      return result;
    },
  });
}
