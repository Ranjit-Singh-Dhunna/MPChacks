import { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import { CITY_COORDS } from "../../lib/geoData";

interface DataRow {
  label: string;
  value: number;
  [key: string]: unknown;
}

interface Props {
  data: DataRow[];
  xKey: string;
  yKey: string;
  width?: number;
  height?: number;
}

// Dept / employee names → representative city coords
const DEPT_COORDS: Record<string, [number, number]> = {
  Engineering:   [37.77,  -122.42],  // SF
  Finance:       [40.71,  -74.0],    // NYC
  Operations:    [41.85,  -87.65],   // Chicago
  Sales:         [34.05,  -118.24],  // LA
  Executive:     [43.65,  -79.38],   // Toronto
  Marketing:     [47.61,  -122.33],  // Seattle
  HR:            [29.76,  -95.37],   // Houston
  Legal:         [38.90,  -77.04],   // DC
  "Field Ops":   [51.04,  -114.07],  // Calgary
  Logistics:     [45.5,   -73.57],   // Montréal
};

const EMPLOYEE_COORDS: Record<string, [number, number]> = {
  "Grace Lee":     [40.71,  -74.0],
  "Frank Miller":  [34.05,  -118.24],
  "Eric Tran":     [41.85,  -87.65],
  "Sarah Kim":     [47.61,  -122.33],
  "Mike Torres":   [25.77,  -80.19],
  "CFO":           [43.65,  -79.38],
};

// Fallback spread — distribute unknown labels around the globe visually
const WORLD_FALLBACK: [number, number][] = [
  [51.5,   -0.12],   // London
  [48.85,   2.35],   // Paris
  [52.52,  13.40],   // Berlin
  [35.68, 139.69],   // Tokyo
  [31.23, 121.47],   // Shanghai
  [28.61,  77.21],   // Delhi
  [-33.87, 151.21],  // Sydney
  [-23.55, -46.63],  // São Paulo
  [55.75,  37.62],   // Moscow
  [1.35,  103.82],   // Singapore
  [19.43, -99.13],   // Mexico City
  [-26.20,  28.04],  // Johannesburg
];

const COLORS = [
  "#0051d5", "#6f7ae5", "#34d399", "#f59e0b", "#f43f5e",
  "#38bdf8", "#a78bfa", "#fb923c", "#e879f9", "#facc15",
  "#2dd4bf", "#f87171",
];

function resolveCoords(label: string, index: number): [number, number] {
  return (
    CITY_COORDS[label] ??
    DEPT_COORDS[label] ??
    EMPLOYEE_COORDS[label] ??
    WORLD_FALLBACK[index % WORLD_FALLBACK.length]
  );
}

export function MiniGlobe({ data, xKey, yKey, width = 560, height = 320 }: Props) {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.5;
    ctrl.enableZoom = false;
    // Tilt slightly so bars read well
    globeRef.current.pointOfView({ lat: 28, lng: -20, altitude: 2.2 }, 0);
  }, []);

  const maxVal = Math.max(...data.map((d) => Number(d[yKey] ?? d.value ?? 0)), 1);

  const points = data.slice(0, 12).map((row, i) => {
    const label = String(row[xKey] ?? row.label ?? "");
    const val = Number(row[yKey] ?? row.value ?? 0);
    const coords = resolveCoords(label, i);
    const pct = val / maxVal;
    return {
      lat: coords[0],
      lng: coords[1],
      // altitude creates the 3-D bar-chart effect
      altitude: 0.02 + pct * 0.45,
      radius: 0.25 + pct * 0.5,
      color: COLORS[i % COLORS.length],
      label: `${label}: $${val.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`,
    };
  });

  // Arcs between top-2 spenders for visual flair
  const arcs = points.length >= 2
    ? [{ startLat: points[0].lat, startLng: points[0].lng, endLat: points[1].lat, endLng: points[1].lng, color: "#0051d580" }]
    : [];

  return (
    <Globe
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
      backgroundColor="rgba(0,0,0,0)"
      width={width}
      height={height}
      atmosphereColor="#1e40af"
      atmosphereAltitude={0.15}
      pointsData={points}
      pointColor="color"
      pointAltitude="altitude"
      pointRadius="radius"
      pointLabel="label"
      arcsData={arcs}
      arcColor="color"
      arcDashLength={0.5}
      arcDashGap={0.5}
      arcDashAnimateTime={2000}
      arcStroke={0.8}
      enablePointerInteraction={true}
    />
  );
}
