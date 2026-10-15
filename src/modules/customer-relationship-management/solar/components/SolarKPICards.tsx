"use client";

import React from "react";
import { SolarCalculationResult } from "../types/solar.schema";
import { Sun, Zap, PiggyBank, BatteryCharging } from "lucide-react";

interface SolarKPICardsProps {
  calc: SolarCalculationResult;
}

export const SolarKPICards: React.FC<SolarKPICardsProps> = ({ calc }) => {
  const hasData = calc.hasCalculatedData;
  const isHybrid = calc.systemType === "hybrid";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Sizing */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System Capacity
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-foreground tracking-tight">
            {hasData ? `${calc.actualSolarKwp} kWp` : "0.0 kWp"}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasData ? `${calc.panelCount} × ${calc.panelWattage}W modules` : "DC Solar Generation"}
          </p>
        </div>
      </div>

      {/* 2. Monthly Savings */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projected Savings
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {hasData ? `₱${calc.potentialMonthlySavings.toLocaleString()}` : "₱0"}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasData ? `~₱${(calc.potentialMonthlySavings * 12).toLocaleString()} / year` : "Per monthly billing cycle"}
          </p>
        </div>
      </div>

      {/* 3. Grid Offset */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Utility Offset
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-black text-foreground tracking-tight">
            {hasData ? `${calc.estimatedBillOffsetPercent}%` : "0%"}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasData ? `${calc.estimatedMonthlyOutputKwh.toLocaleString()} kWh / month` : "Solar energy substitution"}
          </p>
        </div>
      </div>

      {/* 4. Storage Architecture */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Storage Sizing
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <BatteryCharging className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xl font-black text-foreground tracking-tight">
            {isHybrid
              ? hasData ? `${calc.batteryPackCount} Packs (${calc.batteryNominalKwh} kWh)` : "Hybrid Ready"
              : "Grid-Tied"}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHybrid ? "51.2V 314Ah LiFePO4" : "Net-metering configuration"}
          </p>
        </div>
      </div>
    </div>
  );
};
