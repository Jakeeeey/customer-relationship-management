"use client";

import React, { useState } from "react";
import { SolarFormInput, CustomerOption } from "../types/solar.schema";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Sparkles, 
  Receipt, 
  Sliders, 
  Cpu, 
  Zap, 
  Network, 
  BatteryMedium, 
  Info,
  Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SolarConfigCardProps {
  formData: SolarFormInput;
  updateField: <K extends keyof SolarFormInput>(field: K, value: SolarFormInput[K]) => void;
  selectedCustomer: CustomerOption | null;
}

export const SolarConfigCard: React.FC<SolarConfigCardProps> = ({
  formData,
  updateField,
  selectedCustomer,
}) => {
  const avgBill = Math.round(
    (Number(formData.billMonth1 || 0) + Number(formData.billMonth2 || 0) + Number(formData.billMonth3 || 0)) / 3
  );

  return (
    <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Assessment Configuration
            </h3>
            <p className="text-xs text-muted-foreground">
              Billing consumption history & technical sizing parameters
            </p>
          </div>
        </div>

        {avgBill > 0 && (
          <Badge variant="outline" className="px-2.5 py-1 text-xs font-bold border-primary/20 bg-primary/5 text-primary">
            Avg: ₱{avgBill.toLocaleString()}
          </Badge>
        )}
      </div>

      {/* 1. Historical Billing Consumption */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-primary" />
            <span>Monthly Utility Consumption (PHP)</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">Last 3 Billing Cycles</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Month 1 */}
          <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Billing Cycle 1
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₱
              </span>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={formData.billMonth1 === 0 ? "" : formData.billMonth1}
                onChange={(e) => updateField("billMonth1", Number(e.target.value) || 0)}
                className="pl-7 text-right font-bold text-sm h-10 bg-background border-border/80 focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Month 2 */}
          <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Billing Cycle 2
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₱
              </span>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={formData.billMonth2 === 0 ? "" : formData.billMonth2}
                onChange={(e) => updateField("billMonth2", Number(e.target.value) || 0)}
                className="pl-7 text-right font-bold text-sm h-10 bg-background border-border/80 focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Month 3 */}
          <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Billing Cycle 3
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₱
              </span>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={formData.billMonth3 === 0 ? "" : formData.billMonth3}
                onChange={(e) => updateField("billMonth3", Number(e.target.value) || 0)}
                className="pl-7 text-right font-bold text-sm h-10 bg-background border-border/80 focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Utility Rate & Design Margin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Electricity Tariff */}
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

        {/* Design Capacity Allowance */}
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

      {/* 3. System Architecture Type (Segmented control) */}
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

      {/* 4. PV Module Wattage Pill Selectors */}
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
  );
};
