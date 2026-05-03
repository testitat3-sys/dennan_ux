export const deliveryZones = {
  "Kololo": 30, // minutes
  "Buziga": 50,
  "Mukono": 90,
  "Ntinda": 45,
  "Lubowa": 55,
  "Kiwatule": 40,
  "Default": 60
};

export const kampalaLandmarks = [
  { name: "Kiruddu General Hospital", sub: "Buziga", zone: "Buziga" },
  { name: "Kiruddu-Bunamwaya Rd", sub: "Buziga", zone: "Buziga" },
  { name: "Village Mall", sub: "Bugolobi", zone: "Ntinda" },
  { name: "Acacia Mall", sub: "Kololo", zone: "Kololo" },
  { name: "Garden City", sub: "Central", zone: "Kololo" },
  { name: "Sheraton Hotel", sub: "Central", zone: "Kololo" },
  { name: "Mulago Hospital", sub: "Mulago", zone: "Kololo" },
  { name: "Game Lugogo", sub: "Lugogo", zone: "Kololo" }
];

export const userHistory = [
  { name: "Home (Kiwatule)", zone: "Kiwatule" },
  { name: "Work (Kololo)", zone: "Kololo" }
];

/**
 * Calculates the ETA based on the user's location in Kampala.
 * @param {string} zone - The suburb/zone name.
 * @returns {Object} - An object containing the ETA string and the estimated arrival Date.
 */
export function getKampalaETA(zone) {
  const travelTime = deliveryZones[zone] || deliveryZones["Default"];
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

