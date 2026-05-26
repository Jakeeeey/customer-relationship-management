"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Script from "next/script";
import { Loader2, MapPin } from "lucide-react";

interface CustomerGeotagMapProps {
    location: string;
    onLocationChange: (location: string) => void;
    storeName?: string;
}

export function CustomerGeotagMap({ location, onLocationChange, storeName }: CustomerGeotagMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstance = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerInstance = useRef<any>(null);
    const [scriptReady, setScriptReady] = useState(() => {
        if (typeof window !== "undefined") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const win = window as unknown as { L: any };
            return !!win.L;
        }
        return false;
    });

    // Parse "Lat, Lon" string
    const parseCoords = (loc: string): [number, number] | null => {
        if (!loc || !loc.includes(",")) return null;
        const parts = loc.split(",").map(p => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return [parts[0], parts[1]];
        }
        return null;
    };

    const initialCoords = useMemo(() => parseCoords(location) || [14.5995, 120.9842], [location]);





    useEffect(() => {
        if (!scriptReady || !containerRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as unknown as { L: any };
        const L = win.L;
        if (!L) return;

        // Cleanup previous instance
        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }

        const el = containerRef.current as HTMLDivElement & { _leaflet_id?: unknown };
        if (el._leaflet_id) delete el._leaflet_id;

        const map = L.map(el, {
            zoomControl: true,
            attributionControl: false,
        }).setView(initialCoords, 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Marker logic
        const currentCoords = parseCoords(location);
        if (currentCoords) {
            markerInstance.current = L.marker(currentCoords)
                .bindPopup(`<div class="font-bold text-xs">${storeName || "Customer Location"}</div>`)
                .addTo(map);
        }

        // Map Click Listener
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
            const { lat, lng } = e.latlng;
            const newLoc = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            onLocationChange(newLoc);

            if (markerInstance.current) {
                markerInstance.current.setLatLng(e.latlng);
            } else {
                markerInstance.current = L.marker(e.latlng).addTo(map);
            }
        });

        mapInstance.current = map;

        setTimeout(() => {
            if (mapInstance.current) mapInstance.current.invalidateSize();
        }, 300);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [scriptReady, initialCoords, location, onLocationChange, storeName]);

    // Update marker if location changes from outside (e.g. manual typing)
    useEffect(() => {
        if (!mapInstance.current || !scriptReady) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as unknown as { L: any };
        const L = win.L;
        const coords = parseCoords(location);
        
        if (coords) {
            if (markerInstance.current) {
                markerInstance.current.setLatLng(coords);
            } else {
                markerInstance.current = L.marker(coords).addTo(mapInstance.current);
            }
            mapInstance.current.panTo(coords);
        }
    }, [location, scriptReady]);

    return (
        <div className="w-full h-[300px] rounded-[2rem] overflow-hidden border border-border/40 shadow-xl relative group">
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />
            {!scriptReady && (
                <Script
                    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                    crossOrigin=""
                    strategy="afterInteractive"
                    onLoad={() => setScriptReady(true)}
                />
            )}
            
            <div ref={containerRef} className="w-full h-full z-0" />

            {!scriptReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 backdrop-blur-sm z-10 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Initialising Leaflet...</span>
                </div>
            )}

            <div className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur-md px-4 py-2 rounded-xl border border-border/40 shadow-lg pointer-events-none">
                <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-rose-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Click map to set geotag</span>
                </div>
            </div>
        </div>
    );
}
