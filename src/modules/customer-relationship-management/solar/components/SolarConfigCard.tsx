"use client";

import React, { useState } from "react";
import { 
  SolarFormInput, 
  CustomerOption, 
  BuildingType, 
  RoofType, 
  RoofOrientation, 
  ElectricalPhase, 
  ShadingCondition 
} from "../types/solar.schema";
import { 
  Sliders, 
  Receipt, 
  Zap, 
  Network, 
  BatteryMedium, 
  Check, 
  Coins, 
  Home, 
  Compass, 
  Sun, 
  Layers, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SolarConfigCardProps {
  formData: SolarFormInput;
  updateField: <K extends keyof SolarFormInput>(field: K, value: SolarFormInput[K]) => void;
  selectedCustomer: CustomerOption | null;
  roofAllowanceSqm: number;
}

export const SolarConfigCard: React.FC<SolarConfigCardProps> = ({
  formData,
  updateField,
  selectedCustomer,
  roofAllowanceSqm,
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState<"consumption" | "site">("consumption");
  const isKwhMode = formData.inputMode === "kwh";

  const avgBill = Math.round(
    (Number(formData.billMonth1 || 0) + Number(formData.billMonth2 || 0) + Number(formData.billMonth3 || 0)) / 3
  );

  const avgKwh = Number(
    (
      (Number(formData.kwhMonth1 || 0) + Number(formData.kwhMonth2 || 0) + Number(formData.kwhMonth3 || 0)) /
      3
    ).toFixed(1)
  );

  const availableArea = Number(formData.availableRoofAreaSqm || 0);
  const hasAreaCheck = availableArea > 0 && roofAllowanceSqm > 0;
  const isAreaSufficient = availableArea >= roofAllowanceSqm;
  const areaDiff = Number((availableArea - roofAllowanceSqm).toFixed(1));

  return (
    <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Card Header & Section Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Assessment Configuration
            </h3>
            <p className="text-xs text-muted-foreground">
              Consumption history, electrical service, and site architecture
            </p>
          </div>
        </div>

        {/* Sub-Tabs: Consumption vs Site Profile */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveConfigTab("consumption")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeConfigTab === "consumption"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            1. Consumption
          </button>
          <button
            type="button"
            onClick={() => setActiveConfigTab("site")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeConfigTab === "site"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>2. Building & Site</span>
            {hasAreaCheck && (
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  isAreaSufficient ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONSUMPTION & SIZING PARAMETERS */}
      {/* ========================================================================= */}
      {activeConfigTab === "consumption" && (
        <div className="space-y-6">
          {/* Input Mode Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Consumption Input Basis
              </Label>
              <span className="text-[11px] text-muted-foreground">Choose input method</span>
            </div>

            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => updateField("inputMode", "amount")}
                className={cn(
                  "py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  !isKwhMode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>By Bill Amount (₱ PHP)</span>
              </button>

              <button
                type="button"
                onClick={() => updateField("inputMode", "kwh")}
                className={cn(
                  "py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  isKwhMode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>By Kilowatt-Hours (kWh)</span>
              </button>
            </div>
          </div>

          {/* Historical Billing Inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-primary" />
                <span>
                  {isKwhMode
                    ? "Monthly Energy Consumption (Kilowatt-Hours)"
                    : "Monthly Utility Consumption (PHP)"}
                </span>
              </Label>
              <span className="text-[11px] text-muted-foreground">Last 3 Billing Cycles</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cycle 1 */}
              <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Cycle 1
                </span>
                <div className="relative">
                  {!isKwhMode && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ₱
                    </span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={
                      isKwhMode
                        ? formData.kwhMonth1 === 0 ? "" : formData.kwhMonth1
                        : formData.billMonth1 === 0 ? "" : formData.billMonth1
                    }
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      if (isKwhMode) updateField("kwhMonth1", val);
                      else updateField("billMonth1", val);
                    }}
                    className={cn(
                      "font-bold text-sm h-10 bg-background border-border/80 focus:ring-1 focus:ring-primary",
                      !isKwhMode ? "pl-7 text-right" : "pr-12 text-right"
                    )}
                  />
                  {isKwhMode && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      kWh
                    </span>
                  )}
                </div>
              </div>

              {/* Cycle 2 */}
              <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Cycle 2
                </span>
                <div className="relative">
                  {!isKwhMode && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ₱
                    </span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={
                      isKwhMode
                        ? formData.kwhMonth2 === 0 ? "" : formData.kwhMonth2
                        : formData.billMonth2 === 0 ? "" : formData.billMonth2
                    }
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      if (isKwhMode) updateField("kwhMonth2", val);
                      else updateField("billMonth2", val);
                    }}
                    className={cn(
                      "font-bold text-sm h-10 bg-background border-border/80 focus:ring-1 focus:ring-primary",
                      !isKwhMode ? "pl-7 text-right" : "pr-12 text-right"
                    )}
                  />
                  {isKwhMode && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      kWh
                    </span>
                  )}
                </div>
              </div>

              {/* Cycle 3 */}
              <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Cycle 3
                </span>
                <div className="relative">
                  {!isKwhMode && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ₱
                    </span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={
                      isKwhMode
                        ? formData.kwhMonth3 === 0 ? "" : formData.kwhMonth3
                        : formData.billMonth3 === 0 ? "" : formData.billMonth3
                    }
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      if (isKwhMode) updateField("kwhMonth3", val);
                      else updateField("billMonth3", val);
                    }}
                    className={cn(
                      "font-bold text-sm h-10 bg-background border-border/80 focus:ring-1 focus:ring-primary",
                      !isKwhMode ? "pl-7 text-right" : "pr-12 text-right"
                    )}
                  />
                  {isKwhMode && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      kWh
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tariff & Design Margin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Effective Tariff Rate
                </Label>
                <span className="text-[10px] font-semibold text-muted-foreground">₱ / kWh</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  ₱
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min={1}
                  value={formData.electricityRate === 0 ? "" : formData.electricityRate}
                  onChange={(e) => updateField("electricityRate", Number(e.target.value) || 0)}
                  className="pl-7 text-right font-black text-sm h-10 bg-background border-border"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Current utility billing rate applied to energy calculations
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Design Sizing Margin
                </Label>
                <Badge variant="secondary" className="font-bold text-xs">
                  +{formData.designAllowance}%
                </Badge>
              </div>
              <div className="pt-2">
                <Slider
                  value={[formData.designAllowance]}
                  min={0}
                  max={60}
                  step={5}
                  onValueChange={(val) => updateField("designAllowance", val[0])}
                  className="w-full"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Buffer for future load additions or system degradation
              </p>
            </div>
          </div>

          {/* System Architecture */}
          <div className="space-y-2.5 pt-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              System Architecture
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("systemType", "on_grid")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between",
                  formData.systemType === "on_grid"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-sm"
                    : "border-border hover:border-primary/40 bg-background text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    formData.systemType === "on_grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">On-Grid System</p>
                    <p className="text-[10px] text-muted-foreground">Grid-Tied (No Battery)</p>
                  </div>
                </div>
                {formData.systemType === "on_grid" && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>

              <button
                type="button"
                onClick={() => updateField("systemType", "hybrid")}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between",
                  formData.systemType === "hybrid"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-sm"
                    : "border-border hover:border-primary/40 bg-background text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    formData.systemType === "hybrid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <BatteryMedium className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">Hybrid Storage</p>
                    <p className="text-[10px] text-muted-foreground">With LiFePO4 Packs</p>
                  </div>
                </div>
                {formData.systemType === "hybrid" && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          </div>

          {/* PV Module Wattage Pill Selectors */}
          <div className="space-y-2.5 pt-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              PV Module Rating
            </Label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { watt: 620, desc: "High Density" },
                { watt: 680, desc: "Standard Prime" },
                { watt: 720, desc: "Ultra Power" },
              ].map((item) => {
                const isSelected = formData.panelWattage === item.watt;
                return (
                  <button
                    key={item.watt}
                    type="button"
                    onClick={() => updateField("panelWattage", item.watt as 620 | 680 | 720)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/40 bg-background text-muted-foreground"
                    )}
                  >
                    <span className="font-black text-sm text-foreground">{item.watt}W</span>
                    <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BUILDING & INSTALLATION SITE PROFILE */}
      {/* ========================================================================= */}
      {activeConfigTab === "site" && (
        <div className="space-y-5">
          {/* Live Roof Area Validation Alert (if area entered) */}
          {hasAreaCheck && (
            <div
              className={cn(
                "p-3.5 rounded-xl border text-xs flex items-start gap-2.5",
                isAreaSufficient
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              )}
            >
              {isAreaSufficient ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold block">
                  {isAreaSufficient
                    ? `Roof Space Adequate (+${areaDiff} m² buffer)`
                    : `Roof Area Constrained (${Math.abs(areaDiff)} m² deficit)`}
                </span>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isAreaSufficient
                    ? `The entered roof area (${availableArea} m²) comfortably accommodates the required solar footprint (${roofAllowanceSqm} m²).`
                    : `The calculated solar system requires ${roofAllowanceSqm} m² of roof space, but only ${availableArea} m² was specified. Consider higher wattage panels or splitting arrays.`}
                </p>
              </div>
            </div>
          )}

          {/* 1. Building Type & Electrical Service Phase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Building Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-primary" />
                <span>Building Structure Type</span>
              </Label>
              <Select
                value={formData.buildingType}
                onValueChange={(val: BuildingType) => updateField("buildingType", val)}
              >
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Select building type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential House</SelectItem>
                  <SelectItem value="commercial">Commercial Building</SelectItem>
                  <SelectItem value="industrial">Industrial Facility</SelectItem>
                  <SelectItem value="warehouse">Warehouse / Agribusiness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Electrical Service Phase */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Electrical Grid Phase</span>
              </Label>
              <Select
                value={formData.electricalPhase}
                onValueChange={(val: ElectricalPhase) => updateField("electricalPhase", val)}
              >
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Select electrical phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_phase">Single-Phase (230V Standard)</SelectItem>
                  <SelectItem value="three_phase">Three-Phase (230V / 400V Commercial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 2. Roof Material & Orientation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Roof Material */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Roof Mounting Material</span>
              </Label>
              <Select
                value={formData.roofType}
                onValueChange={(val: RoofType) => updateField("roofType", val)}
              >
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Select roof material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rib_type_gi">Corrugated / Rib-Type Metal (L-Feet)</SelectItem>
                  <SelectItem value="standing_seam">Standing Seam Metal (Seam Clamps)</SelectItem>
                  <SelectItem value="concrete_deck">Concrete Slab / Flat Deck (Ballast/Tilt)</SelectItem>
                  <SelectItem value="tile_roof">Clay Tile / Asphalt Shingle (Tile Hooks)</SelectItem>
                  <SelectItem value="ground_mount">Ground Mount / Open Field Racks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Roof Orientation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-primary" />
                <span>Roof Azimuth / Orientation</span>
              </Label>
              <Select
                value={formData.roofOrientation}
                onValueChange={(val: RoofOrientation) => updateField("roofOrientation", val)}
              >
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Select orientation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="south">South-Facing (Optimal 100% Peak Yield)</SelectItem>
                  <SelectItem value="east">East-Facing (Morning Sun Peak)</SelectItem>
                  <SelectItem value="west">West-Facing (Afternoon Sun Peak)</SelectItem>
                  <SelectItem value="flat_deck">Flat Deck (0°-5° Tilt Array)</SelectItem>
                  <SelectItem value="north">North-Facing (Reduced Winter Yield)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Physical Dimensions: Area, Storeys, Shading */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Usable Roof Area */}
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Usable Roof Area
                </span>
                <span className="text-[10px] text-primary font-bold">m²</span>
              </div>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 50"
                value={formData.availableRoofAreaSqm === 0 ? "" : formData.availableRoofAreaSqm}
                onChange={(e) => updateField("availableRoofAreaSqm", Number(e.target.value) || 0)}
                className="font-bold text-sm h-10 bg-background border-border"
              />
              <span className="text-[10px] text-muted-foreground block">
                Required: {roofAllowanceSqm > 0 ? `${roofAllowanceSqm} m²` : "—"}
              </span>
            </div>

            {/* Number of Storeys */}
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Building Height
              </span>
              <Select
                value={String(formData.buildingStoreys)}
                onValueChange={(val) => updateField("buildingStoreys", Number(val) || 1)}
              >
                <SelectTrigger className="h-10 text-xs font-semibold bg-background">
                  <SelectValue placeholder="Height" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1-Storey (Standard Access)</SelectItem>
                  <SelectItem value="2">2-Storey (Extended Drops)</SelectItem>
                  <SelectItem value="3">3+ Storey (Scaffolding)</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground block">
                Affects conduit runs
              </span>
            </div>

            {/* Sun Shading Exposure */}
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Sun Exposure
              </span>
              <Select
                value={formData.shadingCondition}
                onValueChange={(val: ShadingCondition) => updateField("shadingCondition", val)}
              >
                <SelectTrigger className="h-10 text-xs font-semibold bg-background">
                  <SelectValue placeholder="Exposure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unshaded">Full Sun (Unshaded)</SelectItem>
                  <SelectItem value="minor_shading">Minor Tree Shading</SelectItem>
                  <SelectItem value="heavy_shading">Significant Obstacles</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground block">
                Surrounding obstacles
              </span>
            </div>
          </div>

          {/* 4. Site Description & Installation Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Building Description & Installation Site Remarks</span>
            </Label>
            <Textarea
              placeholder="Provide site specifics, e.g.: South-sloping metal roof, clear roof access from eastern driveway, main service entrance panelboard located in ground floor utility room."
              value={formData.siteDescription || ""}
              onChange={(e) => updateField("siteDescription", e.target.value)}
              className="min-h-[85px] text-xs leading-relaxed bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
};
