import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function useProductDisplayName(token) {
  const settings = useQuery(api.settings.getAppSettings, token ? { token } : "skip");
  const source = settings?.productNameSource ?? "name";
  const getDisplayName = (product) =>
    (source === "old_name" && product?.old_name) ? product.old_name : product?.name;
  return { source, getDisplayName };
}
