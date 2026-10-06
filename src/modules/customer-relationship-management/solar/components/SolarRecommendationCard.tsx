"use client";

import React from "react";
import { SolarCalculationResult } from "../types/solar.schema";
import { 
  Sun, 
  Gauge, 
  Zap, 
  Ruler, 
  PanelTop, 
  BatteryCharging, 
  Info,
  ArrowLeft
} from "lucide-react";

interface SolarRecommendationCardProps {
  calc: SolarCalculationResult;
  electricityRate: number;
}

export const SolarRecommendationCard: React.FC<SolarRecommendationCardProps> = ({
  calc,
  electricityRate,
}) => {
  const isHybrid = calc.systemType === "hybrid";
  const hasData = calc.hasCalculatedData;

  return (
    <div className="bg-[#003B73] dark:bg-[#00264D] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6 border border-blue-400/20 h-full">
      {/* Top Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-200">
                {isHybrid ? "HYBRID PRELIMINARY RECOMMENDATION" : "ON-GRID PRELIMINARY RECOMMENDATION"}
              </span>
            </div>
          </div>

          {!hasData && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-200 border border-blue-300/30">
              Awaiting Input
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {hasData ? `${calc.actualSolarKwp} kWp solar system` : "0.0 kWp solar system"}
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-medium">
            {hasData
              ? `${calc.panelCount} × ${calc.panelWattage}W panels with a preliminary ${calc.inverterRatingKw} kW ${isHybrid ? "hybrid" : "grid-tie"} inverter`
              : "Enter electricity bills on the left to calculate recommended system sizing"}
          </p>
        </div>

        {/* Empty state prompt banner if no data */}
        {!hasData && (
          <div className="p-3.5 rounded-2xl bg-blue-900/40 border border-blue-400/30 text-xs text-blue-100 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
            <span>Fill in Month 1, Month 2, and Month 3 bills on the left to activate recommendation.</span>
          </div>
        )}

        {/* 4 Metric Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {/* Tile 1: Panels */}
          <div className="bg-[#004b93]/80 rounded-2xl p-3.5 text-center border border-blue-400/20 flex flex-col items-center justify-center">
            <PanelTop className="w-5 h-5 text-blue-200 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Solar Panels
            </span>
            <div className="text-2xl font-black text-white mt-0.5">
              {hasData ? calc.panelCount : "0"}
            </div>
            <span className="text-[10px] text-blue-200 font-medium">
              {calc.panelWattage}W each
            </span>
          </div>

          {/* Tile 2: Output */}
          <div className="bg-[#004b93]/80 rounded-2xl p-3.5 text-center border border-blue-400/20 flex flex-col items-center justify-center">
            <Gauge className="w-5 h-5 text-blue-200 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Estimated Output
            </span>
            <div className="text-2xl font-black text-white mt-0.5">
              {hasData ? calc.estimatedMonthlyOutputKwh.toLocaleString() : "0"}
            </div>
            <span className="text-[10px] text-blue-200 font-medium">
              kWh / month
            </span>
          </div>

          {/* Tile 3: Offset */}
          <div className="bg-[#004b93]/80 rounded-2xl p-3.5 text-center border border-blue-400/20 flex flex-col items-center justify-center">
            <Zap className="w-5 h-5 text-blue-200 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Estimated Bill Offset
            </span>
            <div className="text-2xl font-black text-white mt-0.5">
              {hasData ? `${calc.estimatedBillOffsetPercent}%` : "0%"}
            </div>
            <span className="text-[10px] text-blue-200 font-medium">
              before fixed charges
            </span>
          </div>

          {/* Tile 4: Roof Allowance */}
          <div className="bg-[#004b93]/80 rounded-2xl p-3.5 text-center border border-blue-400/20 flex flex-col items-center justify-center">
            <Ruler className="w-5 h-5 text-blue-200 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Roof Allowance
            </span>
            <div className="text-2xl font-black text-white mt-0.5">
              {hasData ? calc.roofAllowanceSqm : "0"}
            </div>
            <span className="text-[10px] text-blue-200 font-medium">
              m² preliminary
            </span>
          </div>
        </div>

        {/* Calculated Hybrid Battery Recommendation Box (Yellow / Amber) */}
        {isHybrid && (
          <div className="rounded-2xl p-4 sm:p-5 bg-[#FFC72C] text-slate-950 shadow-md space-y-1.5 border border-amber-300">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-slate-900 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                CALCULATED HYBRID BATTERY RECOMMENDATION
              </span>
            </div>
            <div className="text-base sm:text-lg font-black tracking-tight text-slate-950">
              {hasData ? `${calc.batteryPackCount} × 51.2V 314Ah LiFePO4 packs` : "0 × 51.2V 314Ah LiFePO4 packs"}
            </div>
            <p className="text-[11px] leading-relaxed font-semibold text-slate-800">
              {hasData
                ? `16.1 kWh nominal per pack · ${calc.batteryNominalKwh} kWh total nominal · about ${calc.batteryUsableKwh} kWh total usable at 90% depth of discharge · ${calc.batteryCoveragePercent}% of estimated average daily energy use`
                : "Hybrid storage battery calculation will be computed based on average daily energy requirements."}
            </p>
          </div>
        )}
      </div>

      {/* Financial & Engineering Detailed Rows */}
      <div className="space-y-3 pt-2 text-xs sm:text-sm border-t border-blue-400/30">
        <div className="flex justify-between items-center py-1 border-b border-blue-400/20">
          <span className="text-blue-200 font-medium">3-month average bill</span>
          <span className="font-black text-base text-white">
            {hasData ? `₱${calc.averageBill.toLocaleString()}` : "₱0"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-blue-400/20">
          <span className="text-blue-200 font-medium">Local average electricity rate</span>
          <span className="font-bold text-white">
            ₱{electricityRate.toFixed(2)} / kWh
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-blue-400/20">
          <span className="text-blue-200 font-medium">Estimated monthly use</span>
          <span className="font-bold text-white">
            {hasData ? `${calc.estimatedMonthlyKwh.toLocaleString()} kWh` : "0 kWh"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-blue-400/20">
          <span className="text-blue-200 font-medium">Base solar requirement</span>
          <span className="font-bold text-white">
            {hasData ? `${calc.baseSolarKwp} kWp` : "0.00 kWp"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-blue-400/20">
          <span className="text-blue-200 font-medium">Selected design allowance</span>
          <span className="font-bold text-emerald-300">
            {hasData && calc.targetSolarKwp > calc.baseSolarKwp
              ? `+${Math.round(((calc.targetSolarKwp - calc.baseSolarKwp) / calc.baseSolarKwp) * 100)}%`
              : "+0%"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-blue-400/20">
          <span className="text-blue-200 font-medium">Potential monthly savings</span>
          <span className="font-black text-base text-emerald-300">
            {hasData ? `₱${calc.potentialMonthlySavings.toLocaleString()}` : "₱0"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1">
          <span className="text-blue-200 font-medium">Estimated remaining energy charge</span>
          <span className="font-black text-base text-white">
            {hasData ? `₱${calc.estimatedRemainingCharge.toLocaleString()}` : "₱0"}
          </span>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="pt-2 border-t border-blue-400/20">
        <p className="text-[11px] text-blue-200/80 flex items-start gap-1.5 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Fixed utility charges, export-credit rules, weather, shading, orientation, downtime, and future electricity use can change the actual bill.
          </span>
        </p>
      </div>
    </div>
  );
};
