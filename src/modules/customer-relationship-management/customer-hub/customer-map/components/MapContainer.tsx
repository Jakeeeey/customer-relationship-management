"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useCustomerMapContext } from "../providers/CustomerMapProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  addLayer: (layer: unknown) => void;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
  remove: () => void;
}

interface LeafletMarker {
  bindPopup: (content: string, options?: Record<string, unknown>) => void;
  on: (event: string, fn: () => void) => void;
  openPopup: () => void;
  closePopup: () => void;
}

interface LeafletMarkerClusterGroup {
  clearLayers: () => void;
  addLayer: (layer: unknown) => void;
}

interface LeafletNamespace {
  map: (el: HTMLElement) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  markerClusterGroup: (options?: Record<string, unknown>) => LeafletMarkerClusterGroup;
  latLngBounds: (bounds: unknown[]) => { extend: (coords: [number, number]) => void };
  marker: (coords: [number, number]) => LeafletMarker;
}

// Declare Leaflet for TypeScript
declare global {
  interface Window {
    L: LeafletNamespace;
  }
}

interface LocationObject {
  lat?: number;
  latitude?: number;
  y?: number;
  lng?: number;
  longitude?: number;
  x?: number;
}

export function MapContainer() {
  const { data, isLoading, error } = useCustomerMapContext();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<LeafletMap | null>(null);
  const clusterGroup = useRef<LeafletMarkerClusterGroup | null>(null);
  const [isBaseLeafletLoaded, setIsBaseLeafletLoaded] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // Parse location (e.g., "POINT(lng lat)", "lat, lng", or object {lat, lng}/{x, y})
  const parseLocation = (loc: unknown): [number, number] | null => {
    if (!loc) return null;

    try {
      // Handle Object format (common for JSON serialization of POINT)
      if (typeof loc === 'object' && loc !== null) {
        const locObj = loc as LocationObject;
        const lat = locObj.lat ?? locObj.latitude ?? locObj.y;
        const lng = locObj.lng ?? locObj.longitude ?? locObj.x;

        if (typeof lat === 'number' && typeof lng === 'number') {
          // Heuristic: If lat is outside [-90, 90] and lng is inside, they are likely swapped
          if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
            return [lng, lat];
          }
          return [lat, lng];
        }
      }

      // Handle String format
      if (typeof loc === 'string') {
        // WKT POINT format: POINT(lng lat) or POINT (lng lat)
        const pointMatch = loc.match(/POINT\s?\(([-\d.]+) ([-\d.]+)\)/i);
        if (pointMatch) {
          return [parseFloat(pointMatch[2]), parseFloat(pointMatch[1])]; // [lat, lng]
        }

        // CSV format: "lat, lng"
        const parts = loc.split(/[\s,]+/).map(p => parseFloat(p));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          // Heuristic: usually [lat, lng], but if first part > 90, it's likely [lng, lat]
          if (Math.abs(parts[0]) > 90 && Math.abs(parts[1]) <= 90) {
            return [parts[1], parts[0]];
          }
          return [parts[0], parts[1]];
        }
      }
    } catch (e) {
      console.warn("Failed to parse location:", loc, e);
    }
    return null;
  };


  // Initialize Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapRef.current || leafletMap.current) return;

    const L = window.L;
    // Default center (e.g., Pangasinan area as seen in example)
    const defaultCenter: [number, number] = [15.8949, 120.2863];

    leafletMap.current = L.map(mapRef.current).setView(defaultCenter, 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [isLeafletLoaded]);

  // Update Markers
  useEffect(() => {
    if (!isLeafletLoaded || !leafletMap.current) return;

    const L = window.L;
    if (!L.markerClusterGroup) return; // Ensure plugin is ready

    // Initialize or clear cluster group
    if (!clusterGroup.current) {
      clusterGroup.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true
      });
      if (leafletMap.current) {
        leafletMap.current.addLayer(clusterGroup.current);
      }
    } else {
      clusterGroup.current.clearLayers();
    }

    let parsedCount = 0;
    const bounds = L.latLngBounds([]);

    data.forEach((customer) => {
      const coords = parseLocation(customer.location);
      if (coords) {
        parsedCount++;
        const marker = L.marker(coords);

        // Popup Content (Hover Utility)
        const popupContent = `
          <div class="p-2 min-w-[200px] font-sans text-popover-foreground">
            <h3 class="font-bold text-sm border-b border-border pb-1 mb-2">${customer.customerName}</h3>
            <div class="space-y-1 text-xs">
              <p><strong>Store:</strong> ${customer.storeName}</p>
              <p><strong>Signage:</strong> ${customer.storeSignage || "N/A"}</p>
              <p><strong>Location:</strong> ${[customer.brgy, customer.city, customer.province].filter(Boolean).join(", ")}</p>
              <p><strong>Type:</strong> <span class="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px]">${customer.storeType || "Regular"}</span></p>
              <p><strong>Classification:</strong> ${customer.classification || "N/A"}</p>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { 
          closeButton: false, 
          offset: [0, -20],
          className: 'custom-map-popup'
        });

        // Hover functionality
        marker.on('mouseover', () => {
          marker.openPopup();
        });
        marker.on('mouseout', () => {
          marker.closePopup();
        });

        if (clusterGroup.current) {
          clusterGroup.current.addLayer(marker);
        }
        bounds.extend(coords);
      }
    });

    if (parsedCount > 0 && leafletMap.current) {
      leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [data, isLeafletLoaded]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-destructive">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-semibold">Failed to Load Map Data</h3>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"
        crossOrigin=""
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"
        crossOrigin=""
      />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        onLoad={() => {
          setIsBaseLeafletLoaded(true);
        }}
      />
      {isBaseLeafletLoaded && (
        <Script
          src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"
          crossOrigin=""
          onLoad={() => setIsLeafletLoaded(true)}
        />
      )}

      <div className="relative w-full h-full bg-muted/30 custom-leaflet-map">
        {isLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-[400px] w-full" />
              <div className="text-sm font-medium animate-pulse">Loading Map Data...</div>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full z-0" />
      </div>
    </>
  );
}
