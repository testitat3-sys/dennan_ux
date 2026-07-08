import { ConvexClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { staticData } from "../constants/staticData";

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

export const fetchData = async (endpoint) => {
  return staticData[endpoint] || null;
};

export const getDashboardData = async () => {
  try {
    const dash = await convex.query(api.data.getDashboardConfig);
    if (!dash || !dash.milestones || dash.milestones.expecting.length === 0) {
      return staticData.dashboard;
    }
    return dash;
  } catch (error) {
    console.warn("[API] Convex query failed for dashboard config. Falling back to local staticData.", error);
    return staticData.dashboard;
  }
};

export const getCheckoutData = async () => {
  try {
    const checkout = await convex.query(api.data.getCheckoutConfig);
    if (!checkout || !checkout.steps || checkout.steps.length === 0) {
      return staticData.checkout;
    }
    return checkout;
  } catch (error) {
    console.warn("[API] Convex query failed for checkout config. Falling back to local staticData.", error);
    return staticData.checkout;
  }
};

export const getPLPData = async () => {
  try {
    const collections = await convex.query(api.data.getCollectionsConfig);
    if (!collections || Object.keys(collections).length === 0) {
      return { collections: staticData.collections };
    }
    return { collections };
  } catch (error) {
    console.warn("[API] Convex query failed for PLP collections. Falling back to local staticData.", error);
    return { collections: staticData.collections };
  }
};

export const getBrandDetails = async (brandId) => {
  try {
    const brand = await convex.query(api.brands.getBrandBySlug, { slug: brandId || "" });
    if (brand) return brand;
  } catch (error) {
    console.warn(`[API] Convex query failed for brand "${brandId}". Falling back.`, error);
  }
  return null;
};

export const getRegistryData = async () => {
  try {
    const registry = await convex.query(api.registry.get);
    if (registry) return registry;
  } catch (error) {
    console.warn("[API] Convex query failed for active registry. Falling back.", error);
  }
  return null;
};

