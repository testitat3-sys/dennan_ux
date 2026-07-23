/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attributes from "../attributes.js";
import type * as auth from "../auth.js";
import type * as barcodeCounters from "../barcodeCounters.js";
import type * as brands from "../brands.js";
import type * as businessExpenses from "../businessExpenses.js";
import type * as cart from "../cart.js";
import type * as cashUp from "../cashUp.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as customerActivities from "../customerActivities.js";
import type * as data from "../data.js";
import type * as dbIOStats from "../dbIOStats.js";
import type * as delivery from "../delivery.js";
import type * as emails from "../emails.js";
import type * as errorLogs from "../errorLogs.js";
import type * as giftVouchers from "../giftVouchers.js";
import type * as http from "../http.js";
import type * as importPreLaunch from "../importPreLaunch.js";
import type * as importProducts from "../importProducts.js";
import type * as inspect from "../inspect.js";
import type * as leads from "../leads.js";
import type * as lib_ioTracking from "../lib/ioTracking.js";
import type * as migrations from "../migrations.js";
import type * as orders from "../orders.js";
import type * as pesapal from "../pesapal.js";
import type * as productBrandNames from "../productBrandNames.js";
import type * as products from "../products.js";
import type * as receipts from "../receipts.js";
import type * as referralSources from "../referralSources.js";
import type * as registry from "../registry.js";
import type * as registryPesapal from "../registryPesapal.js";
import type * as restockNotifications from "../restockNotifications.js";
import type * as returns from "../returns.js";
import type * as seed from "../seed.js";
import type * as seedCloseMatches from "../seedCloseMatches.js";
import type * as seedProductBrandNames from "../seedProductBrandNames.js";
import type * as seedProduction from "../seedProduction.js";
import type * as seedProducts from "../seedProducts.js";
import type * as settings from "../settings.js";
import type * as staffAuth from "../staffAuth.js";
import type * as stockCounters from "../stockCounters.js";
import type * as stockRequests from "../stockRequests.js";
import type * as storeOnlyProducts from "../storeOnlyProducts.js";
import type * as storeRequests from "../storeRequests.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attributes: typeof attributes;
  auth: typeof auth;
  barcodeCounters: typeof barcodeCounters;
  brands: typeof brands;
  businessExpenses: typeof businessExpenses;
  cart: typeof cart;
  cashUp: typeof cashUp;
  coupons: typeof coupons;
  crons: typeof crons;
  customerActivities: typeof customerActivities;
  data: typeof data;
  dbIOStats: typeof dbIOStats;
  delivery: typeof delivery;
  emails: typeof emails;
  errorLogs: typeof errorLogs;
  giftVouchers: typeof giftVouchers;
  http: typeof http;
  importPreLaunch: typeof importPreLaunch;
  importProducts: typeof importProducts;
  inspect: typeof inspect;
  leads: typeof leads;
  "lib/ioTracking": typeof lib_ioTracking;
  migrations: typeof migrations;
  orders: typeof orders;
  pesapal: typeof pesapal;
  productBrandNames: typeof productBrandNames;
  products: typeof products;
  receipts: typeof receipts;
  referralSources: typeof referralSources;
  registry: typeof registry;
  registryPesapal: typeof registryPesapal;
  restockNotifications: typeof restockNotifications;
  returns: typeof returns;
  seed: typeof seed;
  seedCloseMatches: typeof seedCloseMatches;
  seedProductBrandNames: typeof seedProductBrandNames;
  seedProduction: typeof seedProduction;
  seedProducts: typeof seedProducts;
  settings: typeof settings;
  staffAuth: typeof staffAuth;
  stockCounters: typeof stockCounters;
  stockRequests: typeof stockRequests;
  storeOnlyProducts: typeof storeOnlyProducts;
  storeRequests: typeof storeRequests;
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
