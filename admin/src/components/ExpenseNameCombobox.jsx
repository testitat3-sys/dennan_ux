import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from "../hooks/useTrackedQuery";

const ADD_NEW_VALUE = "__add_new__";

export default function ExpenseNameCombobox({ token, value, onChange }) {
  const nameOptions = useTrackedQuery(api.businessExpenses.listExpenseNames, { token });
  const createExpenseName = useMutation(api.businessExpenses.createExpenseName);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const sortedNames = [...(nameOptions || [])].sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === ADD_NEW_VALUE) {
      setNewName("");
      setIsAddingNew(true);
      return;
    }
    onChange(val);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      const result = await createExpenseName({ token, name });
      onChange(result.name);
      setIsAddingNew(false);
    } catch (err) {
      onChange(name);
      setIsAddingNew(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewName("");
  };

  if (isAddingNew) {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          className="form-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New expense name..."
          autoFocus
        />
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={handleCreate}
          disabled={isCreating || !newName.trim()}
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
    <select className="form-input" value={value || ""} onChange={handleSelectChange}>
      <option value="" disabled>Select an expense name...</option>
      {sortedNames.map((n) => (
        <option key={n._id} value={n.name}>{n.name}</option>
      ))}
      <option value={ADD_NEW_VALUE}>+ Add new expense name...</option>
    </select>
  );
}
