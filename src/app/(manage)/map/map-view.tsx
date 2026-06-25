"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapStop {
  lat: number;
  lng: number;
  type: "COLLECTION" | "DELIVERY";
  sequence: number;
  label: string;
}
export interface MapJob {
  id: string;
  reference: string;
  status: string;
  stops: MapStop[];
}

const statusColor: Record<string, string> = {
  BOOKED: "#94a3b8",
  ALLOCATED: "#3b82f6",
  ON_ROUTE: "#f59e0b",
  COMPLETED: "#10b981",
  INVOICED: "#8b5cf6",
  CANCELLED: "#ef4444",
};

export function MapView({ jobs }: { jobs: MapJob[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, { scrollWheelZoom: true }).setView([52.8, -1.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const all: [number, number][] = [];

      for (const job of jobs) {
        const color = statusColor[job.status] ?? "#64748b";
        const pts = job.stops
          .filter((s) => s.lat && s.lng)
          .map((s) => [s.lat, s.lng] as [number, number]);

        if (pts.length > 1) {
          L.polyline(pts, { color, weight: 3, opacity: 0.5 }).addTo(map);
        }

        for (const s of job.stops) {
          if (!s.lat || !s.lng) continue;
          all.push([s.lat, s.lng]);
          const isCollect = s.type === "COLLECTION";
          const icon = L.divIcon({
            className: "",
            html: `<div style="
              display:flex;align-items:center;justify-content:center;
              width:26px;height:26px;border-radius:50%;
              background:${color};color:#fff;font-size:11px;font-weight:700;
              border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
              ${isCollect ? "border-radius:6px;" : ""}">${s.sequence}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          L.marker([s.lat, s.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<strong>${job.reference}</strong><br/>${isCollect ? "Collection" : "Delivery"} ${s.sequence}<br/>${s.label}`,
            );
        }
      }

      if (all.length) map.fitBounds(all, { padding: [40, 40], maxZoom: 12 });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [jobs]);

  return <div ref={ref} className="h-[70vh] w-full rounded-xl border border-slate-200" />;
}
