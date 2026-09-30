"use client";

import React from "react";
import { SolarCalculationResult } from "../types/solar.schema";
import { 
  PackageCheck, 
  HardHat, 
  Wrench, 
  Zap, 
  BatteryCharging, 
  ClipboardCheck, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SolarBOMScheduleProps {
  calc: SolarCalculationResult;
  designAllowance: number;
  onPrint: () => void;
}

export const SolarBOMSchedule: React.FC<SolarBOMScheduleProps> = ({
  calc,
  designAllowance,
  onPrint,
}) => {
  const isHybrid = calc.systemType === "hybrid";
  const hasData = calc.hasCalculatedData;

  const bomItems = [
    {
      id: "01",
      name: "High-Power PV Modules",
      category: "Solar Array",
      spec: `${calc.panelWattage}W Tier 1 High-Efficiency Monocrystalline Half-Cell Modules`,
      qty: hasData ? `${calc.panelCount}` : "—",
      unit: "pcs",
    },
    {
      id: "02",
      name: isHybrid ? "Hybrid Energy Inverter" : "On-Grid String Inverter",
      category: "Power Conversion",
      spec: `${calc.inverterRatingKw} kW ${isHybrid ? "Hybrid Inverter with Dual MPPT & Battery Port" : "Grid-Tie Inverter with Smart Export Management"}`,
      qty: hasData ? "1" : "—",
      unit: "unit",
    },
    ...(isHybrid
      ? [
          {
            id: "03",
            name: "LiFePO4 Storage Battery",
            category: "Energy Storage",
            spec: `51.2V 314Ah Deep-Cycle Lithium Iron Phosphate (${calc.batteryNominalKwh} kWh nominal, ~${calc.batteryUsableKwh} kWh usable)`,
            qty: hasData ? `${calc.batteryPackCount}` : "—",
            unit: "packs",
          },
          {
            id: "04",
            name: "Battery Protection & Enclosure",
            category: "Storage Hardware",
            spec: "Rack Cabinet, Smart BMS Communications, DC Battery Isolator, Power Cables & Lugs",
            qty: hasData ? `${calc.batteryPackCount}` : "—",
            unit: "sets",
          },
        ]
      : []),
    {
      id: isHybrid ? "05" : "03",
      name: "Roof Mounting Substructure",
      category: "Structural Support",
      spec: "Anodized Aluminum Rails, End/Mid Clamps, L-Feet Anchors & Stainless Steel Fasteners",
      qty: hasData ? `${calc.panelCount}` : "—",
      unit: "positions",
    },
    {
      id: isHybrid ? "06" : "04",
      name: "DC Balance of System (BOS)",
      category: "Electrical DC",
      spec: "UV-Resistant PV Cable, MC4 Connectors, 1000V DC Isolator Switch, DC Surge Protector (SPD)",
      qty: hasData ? "1" : "—",
      unit: "lot",
    },
    {
      id: isHybrid ? "07" : "05",
      name: "AC Integration & Protection",
      category: "Electrical AC",
      spec: "Dedicated AC Breakers, Lockable AC Disconnect, Distribution Board Integration, Type 2 SPD",
      qty: hasData ? "1" : "—",
      unit: "lot",
    },
    {
      id: isHybrid ? "08" : "06",
      name: "Grounding, Telemetry & Monitoring",
      category: "Instrumentation",
      spec: "Copper Grounding System, Smart WiFi Energy Meter, Cloud Monitoring Dongle, Warning Labels",
      qty: hasData ? "1" : "—",
      unit: "lot",
    },
  ];

  return (
    <div className="space-y-6 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-black tracking-tight text-foreground">
              Technical Bill of Materials & Deployment Plan
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preliminary equipment schedule and workforce labor allocation for project scoping
          </p>
        </div>

        <Button
          onClick={onPrint}
          variant="outline"
          disabled={!hasData}
          className="h-10 px-4 rounded-xl border-border hover:border-primary/40 gap-2 font-bold shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4 text-primary" />
          <span>Export Proposal</span>
        </Button>
      </div>

      {/* Grid: BOM Table (8 cols) & Workforce Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Bill of Materials Table */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Component Schedule
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {bomItems.length} Key Subsystems
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="p-3 w-10">#</th>
                  <th className="p-3">Component</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Technical Specification</th>
                  <th className="p-3 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bomItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-muted-foreground text-[11px]">
                      {item.id}
                    </td>
                    <td className="p-3 font-bold text-foreground whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-[11px] leading-relaxed max-w-xs">
                      {item.spec}
                    </td>
                    <td className="p-3 text-right font-black text-foreground whitespace-nowrap">
                      {item.qty} {item.qty !== "—" && <span className="font-normal text-[10px] text-muted-foreground">{item.unit}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground pt-1">
            * Note: Quantities, circuit stringing, and cable runs are preliminary estimates for proposal generation and will be confirmed during the site engineering survey.
          </p>
        </div>

        {/* Workforce & Operations Card */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Workforce Deployment
              </span>
            </div>
            <Badge variant="secondary" className="font-bold text-xs">
              {calc.laborCrewSize} Crew Members
            </Badge>
          </div>

          {/* Deployment Metric */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Estimated Timeline</span>
              <span className="text-2xl font-black text-foreground">
                {hasData ? `${calc.laborWorkingDays} Days` : "0 Days"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Total Person-Days</span>
              <span className="text-2xl font-black text-primary">
                {hasData ? `${calc.laborPersonDays} P-D` : "0 P-D"}
              </span>
            </div>
          </div>

          {/* Scope Checklist */}
          <div className="space-y-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Standard Installation Protocol
            </span>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">Structural roof mounting and aluminum rail alignment</span>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">DC cable routing, string connections, and combiner protection</span>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">Inverter AC wiring, utility distribution panel integration</span>
            </div>

            {isHybrid && (
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">LiFePO4 battery rack placement, BMS setup & DC isolation</span>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">System commissioning, WiFi telemetry & customer handover</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
