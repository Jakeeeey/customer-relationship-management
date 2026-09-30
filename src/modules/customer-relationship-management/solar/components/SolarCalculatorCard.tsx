"use client";

import React, { useState } from "react";
import { SolarFormInput, SystemType } from "../types/solar.schema";
import { 
  Calculator, 
  Info, 
  Network, 
  Zap, 
  SunMedium, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SolarCalculatorCardProps {
  formData: SolarFormInput;
  updateField: <K extends keyof SolarFormInput>(field: K, value: SolarFormInput[K]) => void;
}

export const SolarCalculatorCard: React.FC<SolarCalculatorCardProps> = ({
  formData,
  updateField,
}) => {
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="bg-card text-card-foreground border border-border/70 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <Calculator className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
            YOUR ELECTRICITY USE
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Enter bills and the local rate
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Use the total current charges before late-payment fees, reconnection fees, or old unpaid balances.
          </p>
        </div>
      </div>

      {/* Bill Inputs (Month 1, 2, 3) */}
      <div className="space-y-3.5 pt-2">
        {/* Month 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-foreground">Most recent bill</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground tracking-wider">
              MONTH 1
            </span>
          </div>
          <div className="relative w-full sm:w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">
              ₱
            </span>
            <Input
              type="number"
              min={0}
              value={formData.billMonth1 === 0 ? "" : formData.billMonth1}
              onChange={(e) => updateField("billMonth1", Number(e.target.value) || 0)}
              className="pl-8 text-right font-bold text-base h-11 rounded-xl border-border bg-background focus:ring-2 focus:ring-blue-500/20"
              placeholder="0"
            />
          </div>
        </div>

        {/* Month 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-foreground">Previous bill</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground tracking-wider">
              MONTH 2
            </span>
          </div>
          <div className="relative w-full sm:w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">
              ₱
            </span>
            <Input
              type="number"
              min={0}
              value={formData.billMonth2 === 0 ? "" : formData.billMonth2}
              onChange={(e) => updateField("billMonth2", Number(e.target.value) || 0)}
              className="pl-8 text-right font-bold text-base h-11 rounded-xl border-border bg-background focus:ring-2 focus:ring-blue-500/20"
              placeholder="0"
            />
          </div>
        </div>

        {/* Month 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-foreground">Third bill</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground tracking-wider">
              MONTH 3
            </span>
          </div>
          <div className="relative w-full sm:w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">
              ₱
            </span>
            <Input
              type="number"
              min={0}
              value={formData.billMonth3 === 0 ? "" : formData.billMonth3}
              onChange={(e) => updateField("billMonth3", Number(e.target.value) || 0)}
              className="pl-8 text-right font-bold text-base h-11 rounded-xl border-border bg-background focus:ring-2 focus:ring-blue-500/20"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Local Rate Basis (Highlighted Gold/Amber Box) */}
      <div className="space-y-2">
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              LOCAL RATE BASIS — REQUIRED
            </span>
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Average electricity rate
            </h4>
            <p className="text-xs text-muted-foreground">
              Electricity rates vary by utility, service area, and billing period.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-amber-700 dark:text-amber-300">
                ₱
              </span>
              <Input
                type="number"
                step="0.01"
                min={1}
                value={formData.electricityRate === 0 ? "" : formData.electricityRate}
                onChange={(e) => updateField("electricityRate", Number(e.target.value) || 0)}
                className="pl-7 pr-3 text-right font-black text-base h-11 rounded-xl border-amber-300 dark:border-amber-700 bg-background text-foreground"
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
              / kWh
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-1 leading-normal">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            Use the average effective rate shown on the bills. If it is not shown, divide the total current energy charges across all three bills by their total kWh consumption.
          </span>
        </p>
      </div>

      {/* System Sizing (Optional Design Allowance) */}
      <div className="space-y-2">
        <div className="rounded-2xl p-4 sm:p-5 bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              SYSTEM SIZING — OPTIONAL
            </span>
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Design allowance
            </h4>
            <p className="text-xs text-muted-foreground">
              Choose how much extra solar capacity to add above the estimated base requirement.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Input
              type="number"
              min={0}
              max={100}
              value={formData.designAllowance === 0 ? "0" : formData.designAllowance}
              onChange={(e) => updateField("designAllowance", Number(e.target.value) || 0)}
              className="w-24 text-center font-black text-base h-11 rounded-xl border-border bg-background"
            />
            <span className="text-sm font-bold text-muted-foreground">%</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Starts at 30%. Enter 0 or leave this optional field blank to apply no additional allowance.</span>
        </p>
      </div>

      {/* Solar System Type Selection */}
      <div className="space-y-2.5 pt-1">
        <Label className="text-xs font-black uppercase tracking-wider text-foreground">
          Choose the solar system type
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* On-grid Card */}
          <button
            type="button"
            onClick={() => updateField("systemType", "on_grid")}
            className={cn(
              "p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 relative cursor-pointer",
              formData.systemType === "on_grid"
                ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 shadow-sm"
                : "border-border/80 hover:border-border hover:bg-muted/30 text-foreground"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              formData.systemType === "on_grid"
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground"
            )}>
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">On-grid</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                Grid-tie system without battery storage
              </p>
            </div>
          </button>

          {/* Hybrid Card */}
          <button
            type="button"
            onClick={() => updateField("systemType", "hybrid")}
            className={cn(
              "p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 relative cursor-pointer",
              formData.systemType === "hybrid"
                ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 shadow-sm"
                : "border-border/80 hover:border-border hover:bg-muted/30 text-foreground"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              formData.systemType === "hybrid"
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground"
            )}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">Hybrid</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                Calculates the required 314Ah battery packs
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Choose Panel Wattage */}
      <div className="space-y-2.5 pt-1">
        <Label className="text-xs font-black uppercase tracking-wider text-foreground">
          Choose your panel wattage
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { watt: 620, label: "Flexible layout" },
            { watt: 680, label: "Balanced choice" },
            { watt: 720, label: "Fewer panels" },
          ].map((item) => {
            const isSelected = formData.panelWattage === item.watt;
            return (
              <button
                key={item.watt}
                type="button"
                onClick={() => updateField("panelWattage", item.watt as 620 | 680 | 720)}
                className={cn(
                  "p-3 sm:p-4 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                  isSelected
                    ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-sm"
                    : "border-border/80 hover:border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <SunMedium className={cn("w-5 h-5 mb-0.5", isSelected ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
                <span className="font-black text-base tracking-tight">{item.watt}W</span>
                <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculation Assumptions Accordion */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>Calculation assumptions</span>
          {showAssumptions ? (
            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {showAssumptions && (
          <div className="mt-3 p-4 bg-muted/40 rounded-2xl text-xs space-y-2 text-muted-foreground border border-border">
            <p>• <strong>Peak Sun Hours (PSH):</strong> 3.6 hours/day standard irradiance baseline for solar calculation.</p>
            <p>• <strong>Monthly Factor:</strong> 30 billing days per month baseline (1 kWp yields ~108 kWh/month).</p>
            <p>• <strong>Hybrid Battery:</strong> 51.2V 314Ah LiFePO4 packs (16.1 kWh nominal, 14.5 kWh usable at 90% DoD).</p>
            <p>• <strong>Roof Allowance:</strong> ~3.1 m² estimated required installation surface per panel.</p>
          </div>
        )}
      </div>
    </div>
  );
};
