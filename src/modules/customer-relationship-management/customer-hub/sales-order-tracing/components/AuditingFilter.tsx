// src/modules/customer-relationship-management/customer-hub/sales-order-tracing/components/AuditingFilter.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Calendar, RefreshCw } from "lucide-react";
import type { AuditingFilters } from "../types";

interface AuditingFilterProps {
  filters: AuditingFilters;
  customerNames: string[];
  onApply: (filters: AuditingFilters) => void;
  onClear: () => void;
  onRefresh: () => void;
}

export default function AuditingFilter({
  filters,
  customerNames,
  onApply,
  onClear,
  onRefresh,
}: AuditingFilterProps) {
  const [draftFilters, setDraftFilters] = React.useState<AuditingFilters>({ ...filters });

  React.useEffect(() => {
    setDraftFilters({ ...filters });
  }, [filters]);

  const handleChange = (key: keyof AuditingFilters, val: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onApply(draftFilters);
    }
  };

  const handleApply = () => {
    onApply(draftFilters);
  };

  return (
    <Card className="border shadow-sm bg-muted/30">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3.5">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 flex-1">
            {/* Search Bar – SO#, PDP#, CLDTO#, DP# */}
            <div className="lg:col-span-2 xl:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="auditingSearch" className="text-[10px] font-bold text-muted-foreground uppercase pl-1">
                Search SO# / PDP# / CLDTO# / DP#
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="auditingSearch"
                  className="pl-9 h-9 text-sm shadow-sm focus-visible:ring-primary/50"
                  placeholder="Search SO#, PDP#, CLDTO#, or DP#..."
                  value={draftFilters.search || ""}
                  onChange={(e) => handleChange("search", e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            {/* Customer Name Dropdown */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Customer Name</Label>
              <SearchableSelect
                options={[
                  { value: "all", label: "All Customers" },
                  ...customerNames.map((name) => ({ value: name, label: name })),
                ]}
                value={draftFilters.customerName || "all"}
                onValueChange={(val) => handleChange("customerName", val)}
                placeholder="All Customers"
                className="h-9 text-sm shadow-sm"
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Status</Label>
              <SearchableSelect
                options={[
                  { value: "all", label: "All Status" },
                  { value: "Draft", label: "Draft" },
                  { value: "Pending", label: "Pending" },
                  { value: "For Approval", label: "For Approval" },
                  { value: "For Consolidation", label: "For Consolidation" },
                  { value: "For Picking", label: "For Picking" },
                  { value: "For Invoicing", label: "For Invoicing" },
                  { value: "For Loading", label: "For Loading" },
                  { value: "For Shipping", label: "For Shipping" },
                  { value: "En Route", label: "En Route" },
                  { value: "Delivered", label: "Delivered" },
                  { value: "On Hold", label: "On Hold" },
                  { value: "Cancelled", label: "Cancelled" },
                  { value: "Not Fulfilled", label: "Not Fulfilled" },
                ]}
                value={draftFilters.orderStatus || "all"}
                onValueChange={(val) => handleChange("orderStatus", val)}
                placeholder="All Status"
                className="h-9 text-sm shadow-sm"
              />
            </div>

            {/* Date Range */}
            <div className="lg:col-span-2 xl:col-span-1 flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Order Date
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-9 text-sm shadow-sm px-2 bg-background flex-1"
                  value={draftFilters.startDate || ""}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
                <span className="text-muted-foreground text-xs font-bold uppercase">to</span>
                <Input
                  type="date"
                  className="h-9 text-sm shadow-sm px-2 bg-background flex-1"
                  value={draftFilters.endDate || ""}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch lg:self-end">
            <Button
              onClick={handleApply}
              className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow flex-1 lg:flex-initial"
            >
              Apply Filter
            </Button>
            <Button
              variant="outline"
              onClick={onClear}
              className="h-9 px-4 text-xs font-semibold flex-1 lg:flex-initial"
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              onClick={onRefresh}
              className="h-9 w-9 p-0 border flex items-center justify-center hover:bg-muted text-muted-foreground shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
