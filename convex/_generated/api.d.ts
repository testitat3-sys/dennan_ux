/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_test from "../auth_test.js";
import type * as brands from "../brands.js";
import type * as cart from "../cart.js";
import type * as coupons from "../coupons.js";
import type * as data from "../data.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as inspect from "../inspect.js";
import type * as orders from "../orders.js";
import type * as registry from "../registry.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  auth_test: typeof auth_test;
  brands: typeof brands;
  cart: typeof cart;
  coupons: typeof coupons;
  data: typeof data;
  emails: typeof emails;
  http: typeof http;
  inspect: typeof inspect;
  orders: typeof orders;
  registry: typeof registry;
  seed: typeof seed;
  users: typeof users;
  wishlist: typeof wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
