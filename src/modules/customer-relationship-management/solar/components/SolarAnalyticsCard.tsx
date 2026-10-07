"use client";

import React from "react";
import { SolarCalculationResult } from "../types/solar.schema";
import { 
  Activity, 
  BatteryCharging 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SolarAnalyticsCardProps {
  calc: SolarCalculationResult;
  electricityRate?: number;
}

export const SolarAnalyticsCard: React.FC<SolarAnalyticsCardProps> = ({
  calc,
}) => {
  const hasData = calc.hasCalculatedData;
  const isHybrid = calc.systemType === "hybrid";
  const annualSavings = calc.potentialMonthlySavings * 12;

  return (
    <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Engineering Yield & Financial Impact
            </h3>
            <p className="text-xs text-muted-foreground">
              Production yield, utility bill offset, and physical footprint
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={
            hasData
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-muted text-muted-foreground"
          }
        >
          {hasData ? `${calc.actualSolarKwp} kWp Installed` : "Awaiting Data"}
        </Badge>
      </div>

      {/* 1. Energy Generation vs Consumption Progress */}
      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Monthly Solar Production Offset</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            {hasData ? `${calc.estimatedBillOffsetPercent}% Offset` : "0%"}
          </span>
        </div>

        <Progress
          value={hasData ? Math.min(100, calc.estimatedBillOffsetPercent) : 0}
          className="h-2.5 rounded-full bg-muted"
        />

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div>
            <span className="text-muted-foreground text-[11px] block">Monthly Demand</span>
            <span className="font-bold text-foreground">
              {hasData ? `${calc.estimatedMonthlyKwh.toLocaleString()} kWh` : "0 kWh"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-[11px] block">Est. Solar Generation</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {hasData ? `${calc.estimatedMonthlyOutputKwh.toLocaleString()} kWh` : "0 kWh"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Financial Return Matrix */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Financial Impact Summary
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl border border-border bg-background space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Monthly Savings
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {hasData ? `₱${calc.potentialMonthlySavings.toLocaleString()}` : "₱0"}
            </div>
            <span className="text-[10px] text-muted-foreground">Direct bill offset</span>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-background space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Projected 1-Year ROI
            </span>
            <div className="text-xl font-black text-foreground">
              {hasData ? `₱${annualSavings.toLocaleString()}` : "₱0"}
            </div>
            <span className="text-[10px] text-muted-foreground">Cumulative annual value</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs flex justify-between items-center">
          <span className="text-muted-foreground">Estimated Remaining Utility Spend</span>
          <span className="font-black text-foreground">
            {hasData ? `₱${calc.estimatedRemainingCharge.toLocaleString()}` : "₱0"}
          </span>
        </div>
      </div>

      {/* 3. Physical & Technical Specs */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Technical Sizing Specifications
        </h4>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-2.5 rounded-xl border border-border/70 bg-background">
            <span className="text-[10px] text-muted-foreground block">PV Modules</span>
            <span className="font-black text-sm text-foreground block">
              {hasData ? `${calc.panelCount} pcs` : "0 pcs"}
            </span>
            <span className="text-[9px] text-muted-foreground">{calc.panelWattage}W Tier 1</span>
          </div>

          <div className="p-2.5 rounded-xl border border-border/70 bg-background">
            <span className="text-[10px] text-muted-foreground block">Inverter AC</span>
            <span className="font-black text-sm text-foreground block">
              {hasData ? `${calc.inverterRatingKw} kW` : "0 kW"}
            </span>
            <span className="text-[9px] text-muted-foreground">Pure Sine Wave</span>
          </div>

          <div className="p-2.5 rounded-xl border border-border/70 bg-background">
            <span className="text-[10px] text-muted-foreground block">Roof Space</span>
            <span className="font-black text-sm text-foreground block">
              {hasData ? `${calc.roofAllowanceSqm} m²` : "0 m²"}
            </span>
            <span className="text-[9px] text-muted-foreground">Required Area</span>
          </div>
        </div>

        {/* Battery Sizing (Hybrid Mode) */}
        {isHybrid && (
          <div className="p-3.5 rounded-xl border border-amber-300/40 dark:border-amber-700/40 bg-amber-500/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-amber-500" />
                <span>LiFePO4 Storage Battery System</span>
              </span>
              <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-500/30">
                {hasData ? `${calc.batteryPackCount} Packs` : "0 Packs"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {hasData
                ? `${calc.batteryPackCount} × 51.2V 314Ah packs (${calc.batteryNominalKwh} kWh nominal, ~${calc.batteryUsableKwh} kWh usable at 90% DoD). Covers ~${calc.batteryCoveragePercent}% of daily energy consumption.`
                : "Hybrid battery packs will be sized to supply nighttime load and emergency backup."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
