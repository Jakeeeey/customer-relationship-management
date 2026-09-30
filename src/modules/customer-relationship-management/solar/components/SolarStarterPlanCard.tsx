"use client";

import React from "react";
import { SolarCalculationResult } from "../types/solar.schema";
import { 
  Printer, 
  CheckCircle2, 
  FileCheck, 
  HardHat, 
  Wrench, 
  Zap, 
  BatteryCharging, 
  Search, 
  ClipboardCheck, 
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SolarStarterPlanCardProps {
  calc: SolarCalculationResult;
  designAllowance: number;
  onPrint: () => void;
}

export const SolarStarterPlanCard: React.FC<SolarStarterPlanCardProps> = ({
  calc,
  designAllowance,
  onPrint,
}) => {
  const isHybrid = calc.systemType === "hybrid";
  const hasData = calc.hasCalculatedData;

  return (
    <div className="space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
            AUTOMATIC PROJECT STARTER PLAN
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Suggested materials and installation labor
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            This is a preliminary planning quantity for customer discussion. WEM will finalize brands, electrical ratings, cable lengths, mounting type, string design, and protection after the technical site survey.
          </p>
        </div>

        <Button
          onClick={onPrint}
          variant="outline"
          disabled={!hasData}
          className="h-11 px-5 rounded-xl border-border hover:border-primary/40 gap-2 font-bold shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4 text-primary" />
          <span>Print result</span>
        </Button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Materials Schedule */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-border/60">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                PRELIMINARY MATERIAL SCHEDULE
              </span>
              <h3 className="text-lg font-black text-foreground">
                System components
              </h3>
            </div>
          </div>

          {/* Component List */}
          <div className="space-y-4">
            {/* 1. PV Modules */}
            <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    High-power PV modules
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {hasData
                      ? `${calc.panelWattage}W each · ${calc.actualSolarKwp} kWp total DC capacity including the selected ${designAllowance}% design allowance`
                      : `${calc.panelWattage}W Tier 1 Solar PV Modules with selected design allowance`}
                  </p>
                </div>
              </div>
              <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                {hasData ? `${calc.panelCount} panels` : "—"}
              </div>
            </div>

            {/* 2. Inverter */}
            <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    {isHybrid ? "Hybrid solar inverter" : "On-grid solar inverter"}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {hasData
                      ? `${calc.inverterRatingKw} kW preliminary AC size with monitoring; final MPPT and phase selection after site verification`
                      : "Preliminary AC size with monitoring; final MPPT and phase selection after site verification"}
                  </p>
                </div>
              </div>
              <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                {hasData ? "1 set" : "—"}
              </div>
            </div>

            {/* 3. Battery Pack (Hybrid only) */}
            {isHybrid && (
              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-foreground">
                      LiFePO4 battery pack
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {hasData
                        ? `51.2V 314Ah each · 16.1 kWh nominal per pack · ${calc.batteryNominalKwh} kWh total nominal · approximately ${calc.batteryUsableKwh} kWh total usable at 90% depth of discharge`
                        : "51.2V 314Ah lithium storage units; computed based on average daily energy requirement"}
                    </p>
                  </div>
                </div>
                <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                  {hasData ? `${calc.batteryPackCount} packs` : "—"}
                </div>
              </div>
            )}

            {/* 4. Battery Protection & Enclosure (Hybrid only) */}
            {isHybrid && (
              <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-foreground">
                      Battery protection and enclosure
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Compatible BMS communications, correctly rated protection for every parallel pack, DC breaker or fused isolator, battery cables, lugs, rack or cabinet, labeling, and commissioning accessories
                    </p>
                  </div>
                </div>
                <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                  {hasData ? `${calc.batteryPackCount} pack positions` : "—"}
                </div>
              </div>
            )}

            {/* 5. Roof Mounting */}
            <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    Roof mounting structure
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Roof-specific aluminum rails, clamps, anchors, flashings, and corrosion-resistant fasteners
                  </p>
                </div>
              </div>
              <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                {hasData ? `${calc.panelCount} module positions` : "—"}
              </div>
            </div>

            {/* 6. DC Cabling & Protection */}
            <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    DC solar protection and cabling
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    UV-rated PV cable, compatible connectors, DC isolator, surge protection, and combiner protection when required
                  </p>
                </div>
              </div>
              <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                {hasData ? "1 preliminary string circuit" : "—"}
              </div>
            </div>

            {/* 7. AC Integration */}
            <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    AC integration and protection
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Dedicated breaker, AC disconnect, surge protection, distribution-board integration, and utility-ready metering provision
                  </p>
                </div>
              </div>
              <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                {hasData ? "1 lot" : "—"}
              </div>
            </div>

            {/* 8. Grounding & Monitoring */}
            <div className="flex items-start justify-between gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${hasData ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-foreground">
                    Grounding, labels, and monitoring
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Equipment grounding, bonding, warning labels, cable management, monitoring setup, testing, and commissioning records
                  </p>
                </div>
              </div>
              <div className="font-bold text-xs text-foreground whitespace-nowrap pt-0.5">
                {hasData ? "1 lot" : "—"}
              </div>
            </div>
          </div>

          {/* Bottom Warm Callout Box */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isHybrid
                ? `${hasData ? `${calc.batteryPackCount} standard 314Ah packs are calculated to provide at least one average day of estimated whole-site energy use.` : "Standard 314Ah packs are calculated to provide at least one average day of whole-site energy use."} Final battery quantity requires an essential-load list, required backup hours, motor starting currents, compatible inverter limits, and an outage-use assessment.`
                : "This system is configured for direct On-grid feed without storage. Exporting surplus energy to the utility grid will require net-metering approvals from your local power distribution utility."}
            </p>
          </div>
        </div>

        {/* Right Column (4 cols): Automatic Labor Allowance Card */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          {/* Dark Navy Header Banner */}
          <div className="bg-[#002B49] text-white p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                AUTOMATIC LABOR ALLOWANCE
              </span>
              <h4 className="text-sm font-black text-white">
                {calc.laborCrewSize}-person solar crew
              </h4>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Big Working Days Stat */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-5xl sm:text-6xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {hasData ? calc.laborWorkingDays : "0"}
              </span>
              <div className="space-y-0.5">
                <span className="text-base font-black text-foreground block">
                  working days
                </span>
                <span className="text-xs text-muted-foreground block">
                  {hasData ? `${calc.laborPersonDays} total person-days` : "Awaiting system sizing"}
                </span>
              </div>
            </div>

            {/* Checklist of Tasks with Icons */}
            <div className="space-y-3.5 pt-2 text-xs">
              <div className="flex items-center gap-2.5 text-foreground font-semibold">
                <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Mounting and module installation</span>
              </div>

              <div className="flex items-center gap-2.5 text-foreground font-semibold">
                <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                <span>DC and AC electrical works</span>
              </div>

              <div className="flex items-center gap-2.5 text-foreground font-semibold">
                <BatteryCharging className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Battery mounting, protection, BMS setup</span>
              </div>

              <div className="flex items-center gap-2.5 text-foreground font-semibold">
                <Search className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Testing, monitoring, and commissioning</span>
              </div>

              <div className="flex items-center gap-2.5 text-foreground font-semibold">
                <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Turnover checklist and customer orientation</span>
              </div>
            </div>

            {/* Footer notes */}
            <div className="pt-4 border-t border-border">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Scaffolding, structural reinforcement, long cable routes, roof repair, service upgrades, trenching, and utility processing can add labor after inspection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
