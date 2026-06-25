"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface RouteMapPoint {
  lat: number;
  lng: number;
  type: "COLLECTION" | "DELIVERY";
  seq: number;
  late?: boolean;
  label?: string;
}

export function RouteMap({
  points,
  height = 280,
}: {
  points: RouteMapPoint[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // Init once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false }).setView([52.8, -1.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      draw();
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when points change.
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

  function draw() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    const pts = points.filter((p) => p.lat && p.lng);
    if (pts.length === 0) return;

    const coords = pts.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(coords, { color: "#4f46e5", weight: 3, opacity: 0.6 }).addTo(layer);

    for (const p of pts) {
      const color = p.late ? "#ef4444" : "#4f46e5";
      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;
          background:${color};color:#fff;font-size:11px;font-weight:700;border:2px solid #fff;
          box-shadow:0 1px 3px rgba(0,0,0,.4);${p.type === "COLLECTION" ? "border-radius:5px;" : "border-radius:50%;"}">${p.seq}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(layer);
      if (p.label) m.bindPopup(p.label);
    }

    map.fitBounds(coords, { padding: [30, 30], maxZoom: 12 });
  }

  return <div ref={ref} style={{ height }} className="w-full overflow-hidden rounded-lg border border-slate-200" />;
}
