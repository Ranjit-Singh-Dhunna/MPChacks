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

const COLORS = ["#0051d5", "#6f7ae5", "#34d399", "#f59e0b", "#f43f5e", "#38bdf8", "#a78bfa"];

export function MiniGlobe({ data, xKey, yKey, width = 500, height = 300 }: Props) {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.controls().enableZoom = false;
      globeRef.current.pointOfView({ lat: 50, lng: -95, altitude: 2.8 }, 0);
    }
  }, []);

  const maxVal = Math.max(...data.map((d) => Number(d[yKey] ?? d.value ?? 0)), 1);

  const points = data.slice(0, 8).map((row, i) => {
    const label = String(row[xKey] ?? row.label ?? "");
    const val = Number(row[yKey] ?? row.value ?? 0);
    const coords = CITY_COORDS[label] ?? [43.65 + i * 0.5, -79.38 + i * 0.5];
    return {
      lat: coords[0],
      lng: coords[1],
      size: 0.15 + (val / maxVal) * 0.65,
      color: COLORS[i % COLORS.length],
      label: `${label}: $${val.toLocaleString()}`,
    };
  });

  return (
    <Globe
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
      backgroundColor="rgba(0,0,0,0)"
      width={width}
      height={height}
      atmosphereColor="#0051d5"
      atmosphereAltitude={0.1}
      pointsData={points}
      pointColor="color"
      pointAltitude={0.06}
      pointRadius="size"
      pointLabel="label"
      enablePointerInteraction={true}
    />
  );
}
