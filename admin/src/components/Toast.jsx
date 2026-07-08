import React from "react";
import { CheckCircle, AlertCircle, Bell, X } from "lucide-react";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Bell,
};

export default function Toast({ toasts, onDismiss }) {
  return (
    <div id="toast-container" aria-live="assertive" aria-atomic="true">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Bell;
        return (
          <div key={t.id} className={`toast toast--${t.type} is-visible`}>
            <span className="toast-icon">
              <Icon size={18} />
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => onDismiss(t.id)} type="button">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
