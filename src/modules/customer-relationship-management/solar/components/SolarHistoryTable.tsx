"use client";

import React, { useState } from "react";
import { SolarQuotation } from "../types/solar.schema";
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  Sun, 
  Calendar, 
  User 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SolarHistoryTableProps {
  quotations: SolarQuotation[];
  isLoading: boolean;
  onRefresh: () => void;
  onLoadQuotation: (quotation: SolarQuotation) => void;
  onDeleteQuotation: (id: string | number) => void;
}

export const SolarHistoryTable: React.FC<SolarHistoryTableProps> = ({
  quotations,
  isLoading,
  onRefresh,
  onLoadQuotation,
  onDeleteQuotation,
}) => {
  const [search, setSearch] = useState("");

  const filtered = quotations.filter((q) => {
    const term = search.toLowerCase();
    return (
      q.quotation_code?.toLowerCase().includes(term) ||
      q.customer_name?.toLowerCase().includes(term) ||
      q.store_name?.toLowerCase().includes(term) ||
      q.system_type?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Search and Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight text-foreground">
            Saved Solar Quotations & Assessments
          </h3>
          <p className="text-xs text-muted-foreground">
            All stored customer calculations and engineering starter plans
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search code, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-10 w-10 shrink-0 rounded-xl"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground font-black uppercase tracking-wider text-[10px] border-b border-border">
            <tr>
              <th className="p-3.5">Quotation Code</th>
              <th className="p-3.5">Customer / Store</th>
              <th className="p-3.5">System Specs</th>
              <th className="p-3.5">Avg Bill</th>
              <th className="p-3.5">Est. Output</th>
              <th className="p-3.5">Offset</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading saved quotations...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-muted-foreground">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Sun className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
                    <p className="font-semibold text-foreground">No solar quotations found</p>
                    <p className="text-[11px]">
                      Calculate a solar system and click &ldquo;Save to Database&rdquo; to store it here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-bold text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{q.quotation_code}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-normal">
                      {q.created_at ? new Date(q.created_at).toLocaleDateString() : ""}
                    </span>
                  </td>

                  <td className="p-3.5 font-medium">
                    <span className="font-bold text-foreground block">
                      {q.customer_name || `Customer #${q.customer_id}`}
                    </span>
                    {q.store_name && (
                      <span className="text-muted-foreground text-[10px] block">
                        {q.store_name}
                      </span>
                    )}
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-black text-foreground">
                      <span>{q.recommended_solar_kwp || q.base_solar_kwp} kWp</span>
                      <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                        {q.system_type === "hybrid" ? "Hybrid" : "On-Grid"}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {q.panel_count} × {q.panel_wattage}W panels
                    </span>
                  </td>

                  <td className="p-3.5 font-bold text-foreground whitespace-nowrap">
                    ₱{Number(q.average_bill).toLocaleString()}
                  </td>

                  <td className="p-3.5 font-medium whitespace-nowrap">
                    {Number(q.estimated_monthly_output_kwh || 0).toLocaleString()} kWh/mo
                  </td>

                  <td className="p-3.5 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                    {q.estimated_bill_offset_percent}%
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    <Badge
                      className={
                        q.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : q.status === "presented"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }
                      variant="outline"
                    >
                      {q.status}
                    </Badge>
                  </td>

                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onLoadQuotation(q)}
                        className="h-8 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 gap-1 rounded-lg"
                        title="Load into Calculator"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Load</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteQuotation(q.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                        title="Delete quotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
