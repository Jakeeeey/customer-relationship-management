"use client";

import React from "react";
import { SolarFormInput, SolarCalculationResult, CustomerOption } from "../types/solar.schema";
import { Sun, CheckCircle2, ShieldCheck, MapPin, Phone, Building2, User } from "lucide-react";

interface SolarPrintViewProps {
  input: SolarFormInput;
  calc: SolarCalculationResult;
  customer?: CustomerOption | null;
}

export const SolarPrintView: React.FC<SolarPrintViewProps> = ({
  input,
  calc,
  customer,
}) => {
  const isHybrid = calc.systemType === "hybrid";

  return (
    <div id="solar-print-section" className="hidden print:block bg-white text-slate-900 p-8 max-w-4xl mx-auto space-y-6">
      {/* Printable Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              SOLAR ENERGY SYSTEM PROPOSAL
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Preliminary Engineering Sizing & Project Starter Plan
          </p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5">
          <p className="font-bold text-slate-900">Date: {new Date().toLocaleDateString()}</p>
          <p>System Type: <span className="font-bold uppercase">{calc.systemType.replace("_", "-")}</span></p>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
          <p className="font-bold text-sm text-slate-900">
            {customer?.customer_name || "Valued Client"}
          </p>
          {customer?.store_name && (
            <p className="text-slate-600 font-medium">{customer.store_name}</p>
          )}
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Location & Contact</span>
          <p className="text-slate-700">
            {[customer?.city, customer?.province].filter(Boolean).join(", ") || "Site Address on File"}
          </p>
          <p className="text-slate-600">{customer?.contact_number || customer?.customer_email || ""}</p>
        </div>
      </div>

      {/* Installation Site & Structural Profile */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
          Installation Site & Structural Profile
        </span>
        <div className="grid grid-cols-4 gap-3 text-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 block">Structure Type</span>
            <span className="font-bold text-slate-900 capitalize">{input.buildingType || "Residential"} ({input.buildingStoreys || 1}-Storey)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Roof Mounting Surface</span>
            <span className="font-bold text-slate-900 capitalize">{input.roofType?.replace(/_/g, " ") || "Metal Sheet"}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Roof Orientation / Shading</span>
            <span className="font-bold text-slate-900 capitalize">{input.roofOrientation || "South"} ({input.shadingCondition?.replace(/_/g, " ") || "Unshaded"})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Electrical Service</span>
            <span className="font-bold text-slate-900">{input.electricalPhase === "three_phase" ? "3-Phase 230V/400V" : "1-Phase 230V"} ({input.mainBreakerAmps || 60}A)</span>
          </div>
        </div>
        {input.siteDescription && (
          <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800">Site Notes: </span>
            {input.siteDescription}
          </div>
        )}
      </div>
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {calc.actualSolarKwp} kWp Solar System
            </h2>
            <p className="text-xs text-slate-600">
              {calc.panelCount} × {calc.panelWattage}W High-Power PV Modules + {calc.inverterRatingKw} kW Inverter
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Est. Monthly Output</span>
            <span className="text-lg font-black text-blue-700">
              {calc.estimatedMonthlyOutputKwh.toLocaleString()} kWh/mo
            </span>
          </div>
        </div>

        {/* Key Metrics Table */}
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          <div className="bg-slate-100 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block">Solar Panels</span>
            <span className="font-bold text-slate-900 text-sm">{calc.panelCount} panels</span>
          </div>
          <div className="bg-slate-100 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block">Bill Offset</span>
            <span className="font-bold text-slate-900 text-sm">{calc.estimatedBillOffsetPercent}%</span>
          </div>
          <div className="bg-slate-100 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block">Roof Area</span>
            <span className="font-bold text-slate-900 text-sm">{calc.roofAllowanceSqm} m²</span>
          </div>
          <div className="bg-slate-100 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block">Monthly Savings</span>
            <span className="font-bold text-emerald-700 text-sm">₱{calc.potentialMonthlySavings.toLocaleString()}</span>
          </div>
        </div>

        {isHybrid && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <span className="text-[10px] font-black uppercase text-amber-800 block">Hybrid Battery System</span>
            <p className="font-bold text-slate-900">
              {calc.batteryPackCount} × 51.2V 314Ah LiFePO4 packs ({calc.batteryNominalKwh} kWh nominal, ~{calc.batteryUsableKwh} kWh usable)
            </p>
          </div>
        )}
      </div>

      {/* Materials Schedule List */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
          Preliminary Materials & Installation Scope
        </h3>
        <table className="w-full text-xs border border-slate-200 text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-2">Component</th>
              <th className="p-2">Specification</th>
              <th className="p-2 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr>
              <td className="p-2 font-semibold">High-power PV modules</td>
              <td className="p-2">{calc.panelWattage}W Tier 1 Solar PV Modules</td>
              <td className="p-2 text-right font-bold">{calc.panelCount} panels</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold">{isHybrid ? "Hybrid Inverter" : "Grid-Tie Inverter"}</td>
              <td className="p-2">{calc.inverterRatingKw} kW Solar Inverter with Smart Monitoring</td>
              <td className="p-2 text-right font-bold">1 set</td>
            </tr>
            {isHybrid && (
              <tr>
                <td className="p-2 font-semibold">LiFePO4 Battery Storage</td>
                <td className="p-2">51.2V 314Ah lithium iron phosphate storage units</td>
                <td className="p-2 text-right font-bold">{calc.batteryPackCount} packs</td>
              </tr>
            )}
            <tr>
              <td className="p-2 font-semibold">Roof Mounting Structure</td>
              <td className="p-2">Aluminum rails, mid/end clamps, stainless steel fasteners</td>
              <td className="p-2 text-right font-bold">{calc.panelCount} positions</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold">DC & AC Electrical Works</td>
              <td className="p-2">Cables, isolators, DC/AC breakers, surge protection devices</td>
              <td className="p-2 text-right font-bold">1 lot</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold">Installation Crew & Labor</td>
              <td className="p-2">{calc.laborCrewSize}-person solar crew ({calc.laborPersonDays} total person-days)</td>
              <td className="p-2 text-right font-bold">{calc.laborWorkingDays} days</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Disclaimers & Signatures */}
      <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-500 space-y-4">
        <p>
          * Notice: This is a preliminary proposal based on historical billing data and standard 3.6 PSH solar conditions. Actual production and final system components will be confirmed upon physical technical site survey and roof structural evaluation.
        </p>

        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
          <div className="border-t border-slate-300 pt-2">
            <span className="font-bold text-slate-800 block">Prepared By:</span>
            <span className="text-slate-500">Solar Technical Specialist</span>
          </div>
          <div className="border-t border-slate-300 pt-2">
            <span className="font-bold text-slate-800 block">Conforme:</span>
            <span className="text-slate-500">Client / Representative Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
};
