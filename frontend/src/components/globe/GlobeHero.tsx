import { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import { GLOBE_ARCS, GLOBE_LABELS, GLOBE_POINTS, GLOBE_RINGS } from "../../lib/geoData";

interface Props {
  size?: number;
}

// Long-haul arcs soar higher; NA routes stay tight to the continent
function arcAltitude(d: any): number {
  const lngDiff = Math.abs((d.startLng ?? 0) - (d.endLng ?? 0));
  const latDiff = Math.abs((d.startLat ?? 0) - (d.endLat ?? 0));
  const dist = Math.sqrt(lngDiff * lngDiff + latDiff * latDiff);
  if (dist > 120) return 0.55;   // transpacific / transatlantic
  if (dist > 60)  return 0.38;   // continental
  if (dist > 25)  return 0.22;   // regional
  return 0.12;                   // short hop
}

// Primary data routes thicker; global ambient thinner
function arcStroke(d: any): number {
  return d.label?.includes("$") ? 1.6 : 0.65;
}

// Faster dashes on short hops, slower on long hauls — organic feel
function arcDashAnimateTime(d: any): number {
  const lngDiff = Math.abs((d.startLng ?? 0) - (d.endLng ?? 0));
  if (lngDiff > 100) return 3200;
  if (lngDiff > 50)  return 2400;
  return 1600;
}

export function GlobeHero({ size = 440 }: Props) {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.45;
    ctrl.enableZoom = false;
    ctrl.enablePan = false;
    // Start showing Atlantic so transatlantic arcs are visible immediately
    globeRef.current.pointOfView({ lat: 18, lng: -15, altitude: 2.75 }, 0);
  }, []);

  return (
    <Globe
      ref={globeRef}
      // Night-lights texture — city glow visible from space
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundColor="rgba(0,0,0,0)"
      width={size}
      height={size}
      atmosphereColor="#3b82f6"
      atmosphereAltitude={0.25}
      // Arcs
      arcsData={GLOBE_ARCS}
      arcColor="color"
      arcDashLength={0.3}
      arcDashGap={0.7}
      arcDashAnimateTime={arcDashAnimateTime}
      arcStroke={arcStroke}
      arcAltitude={arcAltitude}
      arcLabel="label"
      // City points
      pointsData={GLOBE_POINTS}
      pointColor="color"
      pointAltitude={0.04}
      pointRadius="size"
      pointLabel="label"
      // Pulsing rings
      ringsData={GLOBE_RINGS}
      ringColor="color"
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      // Floating city labels
      labelsData={GLOBE_LABELS}
      labelLat="lat"
      labelLng="lng"
      labelText="text"
      labelSize="size"
      labelColor={() => "rgba(255,255,255,0.65)"}
      labelDotRadius={0.3}
      labelAltitude={0.018}
      enablePointerInteraction={true}
    />
  );
}
