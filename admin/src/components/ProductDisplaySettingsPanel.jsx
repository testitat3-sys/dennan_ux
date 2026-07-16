import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export default function ProductDisplaySettingsPanel({ token }) {
  const settings = useQuery(api.settings.getAppSettings, token ? { token } : "skip");
  const setProductNameSource = useMutation(api.settings.setProductNameSource);

  const source = settings?.productNameSource ?? "name";

  const handleChange = async (value) => {
    if (value === source) return;
    try {
      await setProductNameSource({ token, productNameSource: value });
    } catch (err) {
      alert("Failed to update product name display: " + err.message);
    }
  };

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header">
        <h1 className="admin-page-title">Product Display Name</h1>
      </div>

      <p style={{ color: "var(--text-tertiary)", fontSize: "13px", marginBottom: "var(--space-3)" }}>
        Choose which product name admin screens (Stock Manager, walk-in POS, Discounts, Trade/Exchange, barcode labels)
        show for products. The storefront always shows the current name.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
          <input
            type="radio"
            name="productNameSource"
            value="name"
            checked={source === "name"}
            onChange={() => handleChange("name")}
          />
          Current Name
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
          <input
            type="radio"
            name="productNameSource"
            value="old_name"
            checked={source === "old_name"}
            onChange={() => handleChange("old_name")}
          />
          Old Name
        </label>
      </div>
    </div>
  );
}
