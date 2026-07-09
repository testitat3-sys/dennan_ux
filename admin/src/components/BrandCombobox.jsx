import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export default function BrandCombobox({ token, value, onChange }) {
  const brandOptions = useQuery(api.productBrandNames.listProductBrandNames, { token });
  const createBrandName = useMutation(api.productBrandNames.createProductBrandName);
  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = (brandOptions || []).filter((b) =>
    b.name.toLowerCase().includes(inputValue.trim().toLowerCase())
  );
  const exactMatch = (brandOptions || []).some(
    (b) => b.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  const handleSelect = (name) => {
    setInputValue(name);
    onChange(name);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    const name = inputValue.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const result = await createBrandName({ token, name });
      handleSelect(result.name);
    } catch (err) {
      // Fall back to just using the typed name if the mutation fails
      handleSelect(name);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={wrapRef}>
      <input
        type="text"
        className="form-input-box"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search or add a brand..."
        required
      />
      {isOpen && inputValue.trim() && (
        <div
          className="table-wrap"
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            maxHeight: "200px", overflowY: "auto", marginTop: "4px",
            background: "var(--surface)", border: "1px solid var(--surface-container-high)",
          }}
        >
          {filtered.map((b) => (
            <div
              key={b._id}
              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)" }}
              onClick={() => handleSelect(b.name)}
            >
              {b.name}
            </div>
          ))}
          {!exactMatch && (
            <div
              style={{ padding: "8px 12px", cursor: "pointer", color: "var(--accent, #6366f1)" }}
              onClick={handleCreate}
            >
              {isCreating ? "Adding..." : `+ Add new brand "${inputValue.trim()}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
