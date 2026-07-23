import React from "react";
import { useTheme } from "../hooks/useTheme";
import { Sun, Moon, Monitor, Check } from "lucide-react";

export default function ThemeSettingsPanel() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    {
      id: "light",
      label: "Light Mode",
      description: "Clean, bright appearance optimized for daytime work",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      description: "Sleek dark interface designed for low-light environments",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Preference",
      description: "Automatically matches your operating system theme settings",
      icon: Monitor,
    },
  ];

  return (
    <div className="admin-tab-panel is-active">
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>
          Dark Mode
        </h1>
        <span
          style={{
            background: "var(--color-brand-primary-bg)",
            color: "var(--color-brand-primary)",
            fontWeight: 700,
            fontSize: "11px",
            padding: "3px 10px",
            borderRadius: "var(--radius-full)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            border: "1px solid color-mix(in srgb, var(--color-brand-primary) 30%, transparent)",
          }}
        >
          Beta
        </span>
      </div>

      <p style={{ color: "var(--text-tertiary)", fontSize: "13.5px", marginBottom: "var(--space-5)", maxWidth: "600px", lineHeight: "1.5" }}>
        Choose your preferred admin appearance. Your selection is remembered across sessions on this browser.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--space-4)",
          maxWidth: "850px",
          marginBottom: "var(--space-6)",
        }}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              style={{
                background: isSelected ? "var(--surface)" : "var(--surface-container-low)",
                border: isSelected
                  ? "2px solid var(--color-brand-primary)"
                  : "1px solid var(--surface-container-highest)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                position: "relative",
                boxShadow: isSelected ? "var(--shadow-card)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    background: isSelected
                      ? "var(--color-brand-primary-bg)"
                      : "var(--surface-container)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isSelected ? "var(--color-brand-primary)" : "var(--text-secondary)",
                  }}
                >
                  <Icon size={20} />
                </div>
                {isSelected && (
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "var(--color-brand-primary)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                  }}
                >
                  {opt.label}
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-tertiary)", lineHeight: "1.4" }}>
                  {opt.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "var(--surface-container)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          fontSize: "12.5px",
          color: "var(--text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          border: "1px solid var(--surface-container-high)",
        }}
      >
        <span>Active theme engine:</span>
        <strong style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>
          {resolvedTheme} mode {theme === "system" ? "(system automatic)" : ""}
        </strong>
      </div>
    </div>
  );
}
