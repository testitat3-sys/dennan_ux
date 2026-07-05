// Shared date/urgency helpers for the reminders widget and calendar panel.

export const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const formatScheduledDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/** "overdue" | "today" | "upcoming" — drives the urgency color coding. */
export const getUrgency = (scheduledDate, todayStr) => {
  if (!scheduledDate) return "upcoming";
  if (scheduledDate < todayStr) return "overdue";
  if (scheduledDate === todayStr) return "today";
  return "upcoming";
};

export const priorityRank = { high: 0, normal: 1, low: 2 };
