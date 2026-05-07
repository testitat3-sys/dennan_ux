
/**
 * Calculates the ETA based on the user's location in Kampala.
 * @param {string} zone - The suburb/zone name.
 * @param {Object} zones - The delivery zones mapping from API.
 * @returns {Object} - An object containing the ETA string and the estimated arrival Date.
 */
export function getKampalaETA(zone, zones = {}) {
  const travelTime = zones[zone] || zones["Default"] || 60;
  const now = Date.now();
  const arrivalDate = new Date(now + travelTime * 60000);
  
  const timeString = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return {
    timeString,
    arrivalDate,
    travelTime,
    formattedETA: `Arriving by ${timeString}`
  };
}

