import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useErrorLog } from "../hooks/useErrorLog";
import ErrorLogModal from "./ErrorLogModal";

export default function ErrorLogFab() {
  const { entries, unseenCount, markSeen } = useErrorLog();
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0) return null;

  const handleOpen = () => {
    setIsOpen(true);
    markSeen();
  };

  return (
    <>
      <button
        className="error-log-fab"
        onClick={handleOpen}
        type="button"
        title={`${entries.length} error${entries.length === 1 ? "" : "s"} logged this session`}
      >
        <AlertTriangle size={20} />
        {entries.length > 0 && (
          <span className="error-log-fab-badge">{entries.length > 99 ? "99+" : entries.length}</span>
        )}
      </button>
      {isOpen && <ErrorLogModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
