/** MCC category → [lat, lng] mapping for map-view chart type. */
export const CITY_COORDS: Record<string, [number, number]> = {
  Fuel: [43.65, -79.38],
  Meals: [45.42, -75.69],
  Lodging: [51.04, -114.07],
  "Vehicle Repair": [49.28, -123.12],
  Software: [43.7, -79.42],
  "Office Supplies": [42.98, -81.24],
  Equipment: [46.81, -71.21],
  "Parking & Tolls": [44.64, -63.57],
  Supplies: [49.89, -97.14],
  Uncategorized: [43.65, -79.38],
};

// ─── Color palette ────────────────────────────────────────────────────────────
// Cohesive "data intelligence" spectrum — blue → indigo → violet → teal → green
const C = {
  blue:    "#3b82f6",
  blue2:   "#60a5fa",
  indigo:  "#818cf8",
  violet:  "#a78bfa",
  purple:  "#c084fc",
  teal:    "#2dd4bf",
  teal2:   "#5eead4",
  emerald: "#34d399",
  green:   "#4ade80",
  amber:   "#fbbf24",
  orange:  "#fb923c",
  red:     "#f87171",
  rose:    "#fb7185",
  cyan:    "#38bdf8",
};

// ─── Arc helper ───────────────────────────────────────────────────────────────
function arc(
  startLat: number, startLng: number,
  endLat: number,   endLng: number,
  color: string,    label: string,
) { return { startLat, startLng, endLat, endLng, color, label }; }

/** 55 arcs covering every continent — primary NA data + global ambient routes */
export const GLOBE_ARCS = [
  // ── Canada ↔ USA (thick primary data) ────────────────────────────────────
  arc(43.65,-79.38,  40.71,-74.0,    C.blue,    "Toronto → NYC · $142K"),
  arc(45.5, -73.57,  37.77,-122.42,  C.indigo,  "Montréal → SF · $38K"),
  arc(49.28,-123.12, 47.61,-122.33,  C.emerald, "Vancouver → Seattle · $27K"),
  arc(51.04,-114.07, 41.85,-87.65,   C.amber,   "Calgary → Chicago · $19K"),
  arc(43.65,-79.38,  41.85,-87.65,   C.blue2,   "Toronto → Chicago · $67K"),
  arc(43.65,-79.38,  45.5, -73.57,   C.violet,  "Toronto → Montréal · $567K"),
  arc(51.04,-114.07, 49.28,-123.12,  C.emerald, "Calgary → Vancouver · $334K"),

  // ── USA internal ──────────────────────────────────────────────────────────
  arc(40.71,-74.0,   34.05,-118.24,  C.blue,    "NYC → LA · $847K"),
  arc(41.85,-87.65,  29.76,-95.37,   C.indigo,  "Chicago → Houston · $623K"),
  arc(37.77,-122.42, 47.61,-122.33,  C.teal,    "SF → Seattle"),
  arc(25.77,-80.19,  40.71,-74.0,    C.teal2,   "Miami → NYC"),

  // ── Fraud hotspot routes ───────────────────────────────────────────────────
  arc(36.17,-115.14, 34.05,-118.24,  C.red,     "Las Vegas → LA · fraud cluster"),
  arc(33.45,-112.07, 29.76,-95.37,   C.rose,    "Phoenix → Houston · risk"),

  // ── Transatlantic ─────────────────────────────────────────────────────────
  arc(40.71,-74.0,   51.5, -0.12,    C.blue2,   "NYC → London"),
  arc(40.71,-74.0,   48.85, 2.35,    C.indigo,  "NYC → Paris"),
  arc(43.65,-79.38,  51.5, -0.12,    C.violet,  "Toronto → London"),
  arc(43.65,-79.38,  53.33,-6.25,    C.cyan,    "Toronto → Dublin"),
  arc(41.85,-87.65,  50.11, 8.68,    C.blue,    "Chicago → Frankfurt"),
  arc(37.77,-122.42, 48.85, 2.35,    C.indigo,  "SF → Paris"),
  arc(25.77,-80.19, -23.55,-46.63,   C.emerald, "Miami → São Paulo"),
  arc(40.71,-74.0,  -23.55,-46.63,   C.teal,    "NYC → São Paulo"),
  arc(34.05,-118.24,-34.6, -58.38,   C.green,   "LA → Buenos Aires"),

  // ── Europe internal ───────────────────────────────────────────────────────
  arc(51.5, -0.12,   48.85, 2.35,    C.blue2,   "London → Paris"),
  arc(51.5, -0.12,   52.52,13.40,    C.indigo,  "London → Berlin"),
  arc(48.85, 2.35,   52.52,13.40,    C.violet,  "Paris → Berlin"),
  arc(51.5, -0.12,   47.37, 8.54,    C.teal,    "London → Zurich"),
  arc(48.85, 2.35,   41.9,  12.5,    C.blue,    "Paris → Rome"),
  arc(52.52,13.40,   59.33,18.07,    C.cyan,    "Berlin → Stockholm"),
  arc(51.5, -0.12,   55.75,37.62,    C.purple,  "London → Moscow"),

  // ── Europe ↔ Middle East / Asia ───────────────────────────────────────────
  arc(51.5, -0.12,   25.2, 55.27,    C.amber,   "London → Dubai"),
  arc(51.5, -0.12,    1.35,103.82,   C.violet,  "London → Singapore"),
  arc(51.5, -0.12,   19.07,72.88,    C.orange,  "London → Mumbai"),
  arc(48.85, 2.35,   35.68,139.69,   C.indigo,  "Paris → Tokyo"),
  arc(52.52,13.40,   31.23,121.47,   C.blue2,   "Berlin → Shanghai"),
  arc(50.11, 8.68,   25.2, 55.27,    C.amber,   "Frankfurt → Dubai"),
  arc(48.85, 2.35,   19.07,72.88,    C.orange,  "Paris → Mumbai"),

  // ── Middle East hub ───────────────────────────────────────────────────────
  arc(25.2, 55.27,   19.07,72.88,    C.amber,   "Dubai → Mumbai"),
  arc(25.2, 55.27,    1.35,103.82,   C.teal,    "Dubai → Singapore"),
  arc(25.2, 55.27,  -26.20,28.04,    C.orange,  "Dubai → Johannesburg"),
  arc(25.2, 55.27,   28.61,77.21,    C.amber,   "Dubai → Delhi"),

  // ── Transpacific ──────────────────────────────────────────────────────────
  arc(34.05,-118.24, 35.68,139.69,   C.teal,    "LA → Tokyo"),
  arc(37.77,-122.42,  1.35,103.82,   C.emerald, "SF → Singapore"),
  arc(34.05,-118.24,-33.87,151.21,   C.violet,  "LA → Sydney"),
  arc(49.28,-123.12, 35.68,139.69,   C.cyan,    "Vancouver → Tokyo"),
  arc(29.76,-95.37,  25.2, 55.27,    C.orange,  "Houston → Dubai"),
  arc(47.61,-122.33, 35.68,139.69,   C.blue2,   "Seattle → Tokyo"),

  // ── Asia-Pacific internal ─────────────────────────────────────────────────
  arc(35.68,139.69,   1.35,103.82,   C.teal,    "Tokyo → Singapore"),
  arc( 1.35,103.82, -33.87,151.21,   C.emerald, "Singapore → Sydney"),
  arc(35.68,139.69, -33.87,151.21,   C.teal2,   "Tokyo → Sydney"),
  arc( 1.35,103.82,  22.31,114.17,   C.cyan,    "Singapore → HK"),
  arc(31.23,121.47,  35.68,139.69,   C.blue,    "Shanghai → Tokyo"),
  arc(19.07, 72.88,  28.61,77.21,    C.orange,  "Mumbai → Delhi"),
  arc(28.61, 77.21,   1.35,103.82,   C.violet,  "Delhi → Singapore"),

  // ── Africa ────────────────────────────────────────────────────────────────
  arc(51.5, -0.12,  -26.20,28.04,    C.purple,  "London → Johannesburg"),
  arc(19.07,72.88,  -26.20,28.04,    C.orange,  "Mumbai → Johannesburg"),
  arc(-23.55,-46.63,-26.20,28.04,    C.green,   "São Paulo → Johannesburg"),
];

/** City points — NA hubs bright, world cities dimmer */
export const GLOBE_POINTS = [
  // Canadian HQ (largest)
  { lat: 43.65, lng: -79.38,  size: 0.7,  color: C.blue,    label: "Toronto HQ — $892K" },
  { lat: 45.5,  lng: -73.57,  size: 0.45, color: C.indigo,  label: "Montréal — $312K" },
  { lat: 49.28, lng: -123.12, size: 0.42, color: C.emerald, label: "Vancouver — $198K" },
  { lat: 51.04, lng: -114.07, size: 0.36, color: C.amber,   label: "Calgary — $134K" },
  // US primary
  { lat: 40.71, lng: -74.0,   size: 0.62, color: C.blue2,   label: "New York — $1.2M" },
  { lat: 34.05, lng: -118.24, size: 0.55, color: C.cyan,    label: "Los Angeles — $734K" },
  { lat: 41.85, lng: -87.65,  size: 0.5,  color: C.violet,  label: "Chicago — $623K" },
  { lat: 37.77, lng: -122.42, size: 0.46, color: C.blue2,   label: "San Francisco — $389K" },
  { lat: 29.76, lng: -95.37,  size: 0.4,  color: C.amber,   label: "Houston — $312K" },
  { lat: 25.77, lng: -80.19,  size: 0.38, color: C.teal,    label: "Miami — $278K" },
  { lat: 47.61, lng: -122.33, size: 0.36, color: C.emerald, label: "Seattle — $412K" },
  // Fraud hotspots
  { lat: 36.17, lng: -115.14, size: 0.55, color: C.red,     label: "⚠ Las Vegas — FRAUD CLUSTER",  isFraud: true },
  { lat: 33.45, lng: -112.07, size: 0.4,  color: "#f97316", label: "⚠ Phoenix — HIGH RISK",        isFraud: true },
  { lat: 32.72, lng: -117.16, size: 0.32, color: C.rose,    label: "⚠ San Diego — SPLIT BILLING",  isFraud: true },
  // Europe
  { lat: 51.5,  lng: -0.12,   size: 0.4,  color: C.indigo,  label: "London" },
  { lat: 48.85, lng: 2.35,    size: 0.32, color: C.violet,  label: "Paris" },
  { lat: 52.52, lng: 13.40,   size: 0.28, color: C.blue2,   label: "Berlin" },
  { lat: 53.33, lng: -6.25,   size: 0.22, color: C.teal,    label: "Dublin" },
  { lat: 50.11, lng: 8.68,    size: 0.22, color: C.cyan,    label: "Frankfurt" },
  { lat: 41.9,  lng: 12.5,    size: 0.22, color: C.amber,   label: "Rome" },
  { lat: 59.33, lng: 18.07,   size: 0.2,  color: C.teal2,   label: "Stockholm" },
  { lat: 55.75, lng: 37.62,   size: 0.22, color: C.purple,  label: "Moscow" },
  // Middle East & South Asia
  { lat: 25.2,  lng: 55.27,   size: 0.38, color: C.amber,   label: "Dubai" },
  { lat: 19.07, lng: 72.88,   size: 0.3,  color: C.orange,  label: "Mumbai" },
  { lat: 28.61, lng: 77.21,   size: 0.28, color: C.rose,    label: "Delhi" },
  // Asia-Pacific
  { lat: 35.68, lng: 139.69,  size: 0.42, color: C.teal,    label: "Tokyo" },
  { lat: 1.35,  lng: 103.82,  size: 0.4,  color: C.cyan,    label: "Singapore" },
  { lat: 31.23, lng: 121.47,  size: 0.34, color: C.blue,    label: "Shanghai" },
  { lat: 22.31, lng: 114.17,  size: 0.28, color: C.indigo,  label: "Hong Kong" },
  { lat: -33.87,lng: 151.21,  size: 0.32, color: C.emerald, label: "Sydney" },
  // South America
  { lat: -23.55,lng: -46.63,  size: 0.32, color: C.green,   label: "São Paulo" },
  { lat: -34.6, lng: -58.38,  size: 0.22, color: C.teal2,   label: "Buenos Aires" },
  // Africa
  { lat: -26.20,lng: 28.04,   size: 0.28, color: C.orange,  label: "Johannesburg" },
  { lat: 30.04, lng: 31.24,   size: 0.24, color: C.amber,   label: "Cairo" },
];

/** Labels for top hubs — shown floating above key cities */
export const GLOBE_LABELS = [
  { lat: 43.65, lng: -79.38, text: "Toronto",    size: 0.55 },
  { lat: 40.71, lng: -74.0,  text: "New York",   size: 0.5  },
  { lat: 51.5,  lng: -0.12,  text: "London",     size: 0.45 },
  { lat: 25.2,  lng: 55.27,  text: "Dubai",      size: 0.42 },
  { lat: 35.68, lng: 139.69, text: "Tokyo",      size: 0.45 },
  { lat: 1.35,  lng: 103.82, text: "Singapore",  size: 0.42 },
  { lat: -33.87,lng: 151.21, text: "Sydney",     size: 0.4  },
];

/** Ring data for pulsing effect */
export const GLOBE_RINGS = GLOBE_POINTS.map((p) => ({
  lat: p.lat,
  lng: p.lng,
  maxR:             (p as any).isFraud ? 5.5 : 3,
  propagationSpeed: (p as any).isFraud ? 3.5 : 1.6,
  repeatPeriod:     (p as any).isFraud ? 800 : 1600,
  color:            (p as any).isFraud ? "#ef444460" : `${p.color}30`,
}));
