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
import type * as customerActivities from "../customerActivities.js";
import type * as data from "../data.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as inspect from "../inspect.js";
import type * as migrations from "../migrations.js";
import type * as orders from "../orders.js";
import type * as pesapal from "../pesapal.js";
import type * as products from "../products.js";
import type * as registry from "../registry.js";
import type * as registryPesapal from "../registryPesapal.js";
import type * as returns from "../returns.js";
import type * as seed from "../seed.js";
import type * as seedCloseMatches from "../seedCloseMatches.js";
import type * as seedProduction from "../seedProduction.js";
import type * as seedProducts from "../seedProducts.js";
import type * as staffAuth from "../staffAuth.js";
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
  customerActivities: typeof customerActivities;
  data: typeof data;
  emails: typeof emails;
  http: typeof http;
  inspect: typeof inspect;
  migrations: typeof migrations;
  orders: typeof orders;
  pesapal: typeof pesapal;
  products: typeof products;
  registry: typeof registry;
  registryPesapal: typeof registryPesapal;
  returns: typeof returns;
  seed: typeof seed;
  seedCloseMatches: typeof seedCloseMatches;
  seedProduction: typeof seedProduction;
  seedProducts: typeof seedProducts;
  staffAuth: typeof staffAuth;
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
