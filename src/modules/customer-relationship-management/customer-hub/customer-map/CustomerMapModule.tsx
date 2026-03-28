"use client";

import React from "react";
import { CustomerMapProvider } from "./providers/CustomerMapProvider";
import { MapFilters } from "./components/MapFilters";
import { MapContainer } from "./components/MapContainer";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function CustomerMapModule() {
  return (
    <CustomerMapProvider>
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Map</h1>
            <p className="text-muted-foreground">Visual reports of customer locations based on filters.</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)] min-h-[600px]">
          {/* Map Area - Left */}
          <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-sidebar-border/60 bg-card relative">
            <MapContainer />
          </div>

          {/* Sidebar - Right */}
          <Card className="w-full lg:w-80 shadow-md border-sidebar-border/60 overflow-y-auto">
            <CardContent className="p-4 h-full">
              <MapFilters />
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerMapProvider>
  );
}
