"use client";

/**
 * ProspectMapViewer
 *
 * A self-contained Leaflet map component used inside the Prospect Review modal.
 * It mounts its own Leaflet CSS/JS, initialises the map when it mounts, and
 * removes the instance when it unmounts — mirroring the lifecycle pattern in
 * customer-map/MapContainer.tsx.
 *
 * Using a dedicated component (instead of a ref inside the parent) guarantees
 * that the DOM node exists when the initialisation effect fires.
 */

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, MapPin } from "lucide-react";

interface ProspectMapViewerProps {
  location: unknown;
  storeName?: string | null;
  customerName?: string | null;
  address?: string;
}

/**
 * Converts any location value returned by Directus into a Leaflet [lat, lng] tuple.
 * Handles:
 *   - GeoJSON { type: "Point", coordinates: [lng, lat] }  ← Directus geometry fields
 *   - { lat, lng } / { latitude, longitude } / { y, x }
 *   - WKT "POINT(lng lat)"
 *   - CSV "lat, lng"
 */
function parseLocation(loc: unknown): [number, number] | null {
  if (!loc) return null;
  try {
    // GeoJSON — Directus spatial fields are serialised as GeoJSON
    if (
      typeof loc === "object" &&
      loc !== null &&
      "type" in loc &&
      (loc as Record<string, unknown>).type === "Point" &&
      "coordinates" in loc &&
      Array.isArray((loc as Record<string, unknown>).coordinates)
    ) {
      const coords = (loc as Record<string, unknown>).coordinates as unknown[];
      const [lng, lat] = coords as [number, number];
      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return [lat, lng];
      }
    }

    // Generic object { lat/latitude/y, lng/longitude/x }
    if (typeof loc === "object" && loc !== null) {
      const o = loc as Record<string, unknown>;
      const lat = (o.lat ?? o.latitude ?? o.y) as number | undefined;
      const lng = (o.lng ?? o.longitude ?? o.x) as number | undefined;
      if (typeof lat === "number" && typeof lng === "number") {
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) return [lng, lat];
        return [lat, lng];
      }
    }

    // String — WKT or CSV
    if (typeof loc === "string") {
      const wkt = loc.match(/POINT\s?\(([-\d.]+)\s+([-\d.]+)\)/i);
      if (wkt) return [parseFloat(wkt[2]), parseFloat(wkt[1])];

      const parts = loc.split(/[\s,]+/).map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (Math.abs(parts[0]) > 90 && Math.abs(parts[1]) <= 90)
          return [parts[1], parts[0]];
        return [parts[0], parts[1]];
      }
    }
  } catch (e) {
    console.warn("[ProspectMapViewer] parseLocation error:", e);
  }

  console.warn("[ProspectMapViewer] Could not parse location:", JSON.stringify(loc));
  return null;
}

export function ProspectMapViewer({
  location,
  storeName,
  customerName,
  address,
}: ProspectMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<{ remove: () => void; invalidateSize: () => void } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const coords = parseLocation(location);

  // Log for debugging — remove once confirmed working
  useEffect(() => {
    console.log("[ProspectMapViewer] location raw:", JSON.stringify(location));
    console.log("[ProspectMapViewer] parsed coords:", coords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if Leaflet is already available (e.g. loaded by another module on the same page)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, { L?: unknown }>).L) {
      setScriptReady(true);
    }
  }, []);

  // Initialise the map when both the container is mounted AND Leaflet is available
  useEffect(() => {
    if (!scriptReady || !containerRef.current || !coords) return;

    const L = (window as unknown as Record<string, {
      map: (el: HTMLElement, options: unknown) => { setView: (coords: [number, number], zoom: number) => { remove: () => void; invalidateSize: () => void } };
      tileLayer: (url: string, options: unknown) => { addTo: (map: unknown) => void };
      marker: (coords: [number, number]) => { bindPopup: (content: string, options: unknown) => { addTo: (map: unknown) => { openPopup: () => void } } };
    }>).L;
    if (!L) return;

    // Clean up any previous instance
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Clear Leaflet's internal container flag in case the DOM element was reused
    const el = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (el._leaflet_id) delete el._leaflet_id;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: false,
    }).setView(coords, 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const label = storeName || customerName || "Location";
    const popup = `
      <div style="font-family:sans-serif;min-width:150px;padding:2px;">
        <strong style="font-size:12px;display:block;margin-bottom:2px;">${label}</strong>
        ${address ? `<span style="font-size:11px;color:#555;">${address}</span>` : ""}
        <span style="font-size:10px;color:#888;display:block;margin-top:4px;">
          ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}
        </span>
      </div>
    `;

    L.marker(coords)
      .bindPopup(popup, { closeButton: false, offset: [0, -15] })
      .addTo(map)
      .openPopup();

    mapInstance.current = map;

    // Force recalculation of container dimensions after animation
    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 300);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  if (!location) {
    return (
      <div className="h-48 w-full rounded-xl border bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground shadow-inner">
        <MapPin className="h-6 w-6 opacity-40" />
        <span className="text-[11px]">No geo-tag recorded for this prospect.</span>
      </div>
    );
  }

  return (
    <>
      {/* Leaflet CSS — must be loaded before the JS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      {/* Only inject the script if Leaflet isn't already present */}
      {!scriptReady && (
        <Script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
      )}

      <div className="h-48 w-full rounded-xl border bg-muted overflow-hidden relative shadow-inner">
        {/* The actual Leaflet container — ALWAYS rendered so the ref attaches before the effect fires */}
        <div ref={containerRef} className="w-full h-full z-0" />

        {/* Loading overlay while Leaflet script is fetching */}
        {!scriptReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 backdrop-blur-sm z-10 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground">Loading map…</span>
          </div>
        )}

        {/* If Leaflet is ready but coords couldn't be parsed, show a friendly error */}
        {scriptReady && !coords && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 z-10 gap-2">
            <MapPin className="h-6 w-6 text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground">
              Location data is in an unrecognised format.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
