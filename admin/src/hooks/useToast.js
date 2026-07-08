import { useCallback, useState } from "react";

// Shared toast-stack hook, mirroring the ad-hoc toast implementation already used in
// AdminProductCreate.jsx (same CSS classes: #toast-container / .toast / .toast--type),
// extracted so other screens (StaffDashboard) don't have to reimplement it.
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
