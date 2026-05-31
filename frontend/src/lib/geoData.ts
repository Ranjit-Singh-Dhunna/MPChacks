/** MCC category → [lat, lng] mapping for map-view chart type.
 *  Points are Canadian/US cities relevant to a transport-logistics SMB. */
export const CITY_COORDS: Record<string, [number, number]> = {
  Fuel: [43.65, -79.38],            // Toronto
  Meals: [45.42, -75.69],           // Ottawa
  Lodging: [51.04, -114.07],        // Calgary
  "Vehicle Repair": [49.28, -123.12], // Vancouver
  Software: [43.7, -79.42],         // North York
  "Office Supplies": [42.98, -81.24], // London ON
  Equipment: [46.81, -71.21],       // Quebec City
  "Parking & Tolls": [44.64, -63.57], // Halifax
  Supplies: [49.89, -97.14],        // Winnipeg
  Uncategorized: [43.65, -79.38],   // Toronto fallback
};

/** Hardcoded arcs for the landing globe: US ↔ Canada cross-border spend */
export const GLOBE_ARCS = [
  {
    startLat: 43.65, startLng: -79.38,
    endLat: 40.71, endLng: -74.0,
    color: "#0051d5", label: "Toronto → NYC · $142K",
  },
  {
    startLat: 45.5, startLng: -73.57,
    endLat: 37.77, endLng: -122.42,
    color: "#6f7ae5", label: "Montréal → SF · $38K",
  },
  {
    startLat: 49.28, startLng: -123.12,
    endLat: 47.61, endLng: -122.33,
    color: "#34d399", label: "Vancouver → Seattle · $27K",
  },
  {
    startLat: 51.04, startLng: -114.07,
    endLat: 41.85, endLng: -87.65,
    color: "#f59e0b", label: "Calgary → Chicago · $19K",
  },
];

export const GLOBE_POINTS = [
  { lat: 43.65, lng: -79.38, size: 0.55, color: "#0051d5", label: "Toronto HQ" },
  { lat: 45.5, lng: -73.57, size: 0.35, color: "#6f7ae5", label: "Montréal" },
  { lat: 49.28, lng: -123.12, size: 0.35, color: "#34d399", label: "Vancouver" },
  { lat: 51.04, lng: -114.07, size: 0.3, color: "#f59e0b", label: "Calgary" },
  { lat: 40.71, lng: -74.0, size: 0.45, color: "#f43f5e", label: "New York" },
  { lat: 47.61, lng: -122.33, size: 0.3, color: "#34d399", label: "Seattle" },
  { lat: 41.85, lng: -87.65, size: 0.3, color: "#f59e0b", label: "Chicago" },
];
