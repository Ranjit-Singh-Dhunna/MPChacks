import { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import { GLOBE_ARCS, GLOBE_POINTS } from "../../lib/geoData";

interface Props {
  size?: number;
}

export function GlobeHero({ size = 440 }: Props) {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (globeRef.current) {
      // Start auto-rotation
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.6;
      globeRef.current.controls().enableZoom = false;
      // Start pointing at North America
      globeRef.current.pointOfView({ lat: 48, lng: -90, altitude: 2.2 }, 0);
    }
  }, []);

  return (
    <Globe
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundColor="rgba(0,0,0,0)"
      width={size}
      height={size}
      atmosphereColor="#0051d5"
      atmosphereAltitude={0.14}
      arcsData={GLOBE_ARCS}
      arcColor="color"
      arcDashLength={0.4}
      arcDashGap={0.25}
      arcDashAnimateTime={2200}
      arcStroke={1.4}
      arcLabel="label"
      pointsData={GLOBE_POINTS}
      pointColor="color"
      pointAltitude={0.05}
      pointRadius="size"
      pointLabel="label"
      enablePointerInteraction={true}
    />
  );
}
