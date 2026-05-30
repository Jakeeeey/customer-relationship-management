// src/modules/customer-relationship-management/customer-hub/auditing/components/AuditingFilter.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, RotateCcw, Filter } from "lucide-react";
import type { AuditingFilters } from "../types";

interface AuditingFilterProps {
  filters: AuditingFilters;
  onApply: (filters: AuditingFilters) => void;
  onClear: () => void;
}

export default function AuditingFilter({
  filters,
  onApply,
  onClear,
}: AuditingFilterProps) {
  const [localFilters, setLocalFilters] = React.useState<AuditingFilters>({ ...filters });

  React.useEffect(() => {
    setLocalFilters({ ...filters });
  }, [filters]);

  const handleChange = (key: keyof AuditingFilters, val: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(localFilters);
  };

  const handleClear = () => {
    onClear();
  };

  return (
    <form
      onSubmit={handleApply}
      className="bg-card border rounded-xl p-5 shadow-sm space-y-4 transition-all"
    >
      <div className="flex items-center gap-2 pb-2 border-b">
        <Filter className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Filter & Refine Status</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Date Start */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</Label>
          <div className="relative">
            <Input
              type="date"
              className="bg-background/50 pl-9 border-primary/10 hover:border-primary/20 transition-all text-xs h-9 rounded-lg"
              value={localFilters.startDate || ""}
              onChange={(e) => handleChange("startDate", e.target.value)}
            />
            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          </div>
        </div>

        {/* Date End */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</Label>
          <div className="relative">
            <Input
              type="date"
              className="bg-background/50 pl-9 border-primary/10 hover:border-primary/20 transition-all text-xs h-9 rounded-lg"
              value={localFilters.endDate || ""}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          </div>
        </div>

        {/* Sales Order No */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sales Order No</Label>
          <Input
            placeholder="SO-20251013..."
            className="bg-background/50 border-primary/10 hover:border-primary/20 transition-all text-xs h-9 rounded-lg"
            value={localFilters.orderNo || ""}
            onChange={(e) => handleChange("orderNo", e.target.value)}
          />
        </div>

        {/* Customer Code */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Code</Label>
          <Input
            placeholder="MAIN - 31632"
            className="bg-background/50 border-primary/10 hover:border-primary/20 transition-all text-xs h-9 rounded-lg"
            value={localFilters.customerCode || ""}
            onChange={(e) => handleChange("customerCode", e.target.value)}
          />
        </div>

        {/* Order Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Status</Label>
          <Select
            value={localFilters.orderStatus || "all"}
            onValueChange={(val) => handleChange("orderStatus", val)}
          >
            <SelectTrigger className="bg-background/50 border-primary/10 hover:border-primary/20 transition-all text-xs h-9 rounded-lg">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="Delivered" className="text-xs">Delivered</SelectItem>
              <SelectItem value="Processing" className="text-xs">Processing</SelectItem>
              <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="text-xs h-8 border-primary/10 hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset Filters
        </Button>
        <Button
          type="submit"
          className="text-xs h-8 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm"
        >
          Apply Filters
        </Button>
      </div>
    </form>
  );
}
