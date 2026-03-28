"use client";

import React from "react";
import { Filter, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomerMapContext } from "../providers/CustomerMapProvider";

export function MapFilters() {
  const { filters, options, updateFilters, refreshMap, isLoading } = useCustomerMapContext();

  const handleSelectChange = (name: string, value: string) => {
    updateFilters({ ...filters, [name]: value === "all" ? undefined : value });
  };

  // Helper to format options for SearchableSelect
  const formatOptions = (items: string[], fieldName: string) => {
    const formatted = items.map(item => ({ value: item, label: item }));
    return [
      { value: "all", label: `All ${fieldName}s` },
      { value: "none", label: `(None)` },
      ...formatted
    ];
  };

  // Fallback options based on user examples if API returns empty
  const clusterOptions = options.clusters.length > 0 ? options.clusters : ["Central Pangasinan", "Northern Luzon", "Southern Luzon"];
  const storeTypeOptions = options.storeTypes.length > 0 ? options.storeTypes : ["LOCAL KEY ACCOUNT", "GENERAL TRADE", "MODERN TRADE"];
  const classificationOptions = options.classifications.length > 0 ? options.classifications : ["CSI Group of Companies", "Magic Group", "Independent"];
  const salesmanOptions = options.salesmen.length > 0 ? options.salesmen : ["P.J. Sales", "R.A. Garcia", "M.T. Reyes"];

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex items-center gap-2 pb-2 border-b border-sidebar-border/60 mb-2">
        <Filter className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-black uppercase tracking-wider">Filter Options</h2>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Cluster</label>
        <SearchableSelect
          options={formatOptions(clusterOptions, "Cluster")}
          value={filters.cluster || "all"}
          onValueChange={(val) => handleSelectChange("cluster", val)}
          placeholder="Select Cluster"
          className="h-9 text-xs font-bold uppercase"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Store Type</label>
        <SearchableSelect
          options={formatOptions(storeTypeOptions, "Store Type")}
          value={filters.storeType || "all"}
          onValueChange={(val) => handleSelectChange("storeType", val)}
          placeholder="Select Store Type"
          className="h-9 text-xs font-bold uppercase"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Classification</label>
        <SearchableSelect
          options={formatOptions(classificationOptions, "Classification")}
          value={filters.classification || "all"}
          onValueChange={(val) => handleSelectChange("classification", val)}
          placeholder="Select Classification"
          className="h-9 text-xs font-bold uppercase"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Salesman</label>
        <SearchableSelect
          options={formatOptions(salesmanOptions, "Salesman")}
          value={filters.salesman || "all"}
          onValueChange={(val) => handleSelectChange("salesman", val)}
          placeholder="Select Salesman"
          className="h-9 text-xs font-bold uppercase"
        />
      </div>

      <div className="pt-4 mt-auto">
        <Button
          variant="outline"
          className="w-full gap-2 h-10 border-sidebar-border/60 hover:bg-primary/5 hover:text-primary transition-all font-bold text-xs uppercase"
          onClick={refreshMap}
          disabled={isLoading}
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Refreshing..." : "Refresh Map"}
        </Button>
      </div>
    </div>
  );
}
