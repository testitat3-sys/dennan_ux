import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const ADD_NEW_VALUE = "__add_new__";

export default function BrandCombobox({ token, value, onChange }) {
  const brandOptions = useQuery(api.productBrandNames.listProductBrandNames, { token });
  const createBrandName = useMutation(api.productBrandNames.createProductBrandName);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const sortedBrands = [...(brandOptions || [])].sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === ADD_NEW_VALUE) {
      setNewBrandName("");
      setIsAddingNew(true);
      return;
    }
    onChange(val);
  };

  const handleCreate = async () => {
    const name = newBrandName.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const result = await createBrandName({ token, name });
      onChange(result.name);
      setIsAddingNew(false);
    } catch (err) {
      // Fall back to just using the typed name if the mutation fails
      onChange(name);
      setIsAddingNew(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewBrandName("");
  };

  if (isAddingNew) {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          className="form-input-box"
          value={newBrandName}
          onChange={(e) => setNewBrandName(e.target.value)}
          placeholder="New brand name..."
          autoFocus
        />
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleCreate}
          disabled={isCreating || !newBrandName.trim()}
        >
          {isCreating ? "Adding..." : "Add"}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={handleCancelAdd}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select className="form-input-box" value={value || ""} onChange={handleSelectChange}>
      <option value="">No Brand</option>
      {sortedBrands.map((b) => (
        <option key={b._id} value={b.name}>{b.name}</option>
      ))}
      <option value={ADD_NEW_VALUE}>+ Add new brand...</option>
    </select>
  );
}
