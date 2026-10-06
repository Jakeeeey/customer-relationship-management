"use client";

import React, { useState, useEffect } from "react";
import { SolarFormInput, SolarCalculationResult, CustomerOption } from "../types/solar.schema";
import { 
  Sun, 
  CheckCircle2 
} from "lucide-react";

interface CompanyData {
  company_name?: string;
  company_address?: string;
  company_brgy?: string;
  company_city?: string;
  company_province?: string;
  company_zipCode?: string;
  company_contact?: string;
  company_email?: string;
  company_logo?: string;
}

interface SolarPrintViewProps {
  input: SolarFormInput;
  calc: SolarCalculationResult;
  customer?: CustomerOption | null;
}

export const SolarPrintView: React.FC<SolarPrintViewProps> = ({
  input: _input,
  calc,
  customer,
}) => {
  const isHybrid = calc.systemType === "hybrid";
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/pdf/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json) return;
        const data = json.data?.[0] || (Array.isArray(json.data) ? null : json.data);
        if (data) setCompanyData(data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const companyAddressParts = [
    companyData?.company_address,
    companyData?.company_brgy,
    companyData?.company_city,
    companyData?.company_province,
    companyData?.company_zipCode,
  ].filter(Boolean);

  const formattedCompanyAddress =
    companyAddressParts.length > 0
      ? companyAddressParts.join(", ")
      : "Metropolitan Corporate Center, Metro Manila, Philippines";

  const companyContact = companyData?.company_contact || "+63 (2) 8888-0000";
  const companyEmail = companyData?.company_email || "solar.solutions@vertexenergy.ph";
  const companyName = companyData?.company_name || "VERTEX SOLAR ENERGY SYSTEMS";

  const [quoteMeta] = useState(() => {
    const now = new Date();
    const fallbackId = Math.floor(1000 + Math.random() * 9000);
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      year: now.getFullYear(),
      fallbackId,
      dateFormatted: now.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      validityFormatted: validUntil.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  });

  const quotationNo = `QT-SOL-${quoteMeta.year}-${String(
    customer?.id || quoteMeta.fallbackId
  ).padStart(4, "0")}`;

  const quotationDate = quoteMeta.dateFormatted;
  const validityDate = quoteMeta.validityFormatted;

  return (
    <>
      {/* Strict Scoped Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #solar-quotation-print, #solar-quotation-print * {
                visibility: visible !important;
              }
              #solar-quotation-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 12mm 15mm !important;
                box-sizing: border-box !important;
                background-color: #ffffff !important;
                color: #0f172a !important;
                display: block !important;
                font-family: inherit !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `,
        }}
      />

      <div
        id="solar-quotation-print"
        className="hidden print:block bg-white text-slate-900 w-full max-w-4xl mx-auto space-y-5 print:space-y-4 text-xs"
      >
        {/* ========================================================
            1. CORPORATE QUOTATION HEADER
        ======================================================== */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          {/* Company Branding */}
          <div className="flex items-start gap-3.5 max-w-[60%]">
            {companyData?.company_logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={companyData.company_logo}
                alt={companyName}
                className="w-14 h-14 object-contain rounded-md border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600">
                <Sun className="w-7 h-7" />
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-base font-black uppercase tracking-tight text-slate-900 leading-tight">
                {companyName}
              </h1>
              <p className="text-[11px] text-slate-600 font-medium leading-tight">
                {formattedCompanyAddress}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium pt-0.5">
                <span>Tel: {companyContact}</span>
                <span>•</span>
                <span>Email: {companyEmail}</span>
              </div>
            </div>
          </div>

          {/* Quotation Meta */}
          <div className="text-right space-y-1">
            <div className="inline-block bg-slate-900 text-white font-black text-xs uppercase px-2.5 py-1 rounded">
              Official Quotation
            </div>
            <div className="space-y-0.5 pt-1 text-[11px] text-slate-700">
              <p>
                <span className="text-slate-400 font-bold uppercase text-[9px] mr-1">Quote No:</span>
                <span className="font-bold text-slate-900 font-mono">{quotationNo}</span>
              </p>
              <p>
                <span className="text-slate-400 font-bold uppercase text-[9px] mr-1">Date:</span>
                <span className="font-semibold text-slate-800">{quotationDate}</span>
              </p>
              <p>
                <span className="text-slate-400 font-bold uppercase text-[9px] mr-1">Validity:</span>
                <span className="font-semibold text-slate-800">Until {validityDate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Project Title Banner */}
        <div className="bg-slate-100 rounded-lg px-4 py-2 flex items-center justify-between border border-slate-200">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
              Project Specification & Engineering Starter Plan
            </span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              {calc.actualSolarKwp} kWp {isHybrid ? "Hybrid Solar PV Energy Storage System" : "Grid-Tied Solar PV System"}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
              {isHybrid ? "Solar + Battery Backup" : "Grid-Tie / Net-Metering"}
            </span>
          </div>
        </div>

        {/* ========================================================
            2. CLIENT & SITE ARCHITECTURE INFORMATION
        ======================================================== */}
        <div className="grid grid-cols-2 gap-4">
          {/* Bill To */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/50">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Client / Bill To
              </span>
            </div>
            <div className="space-y-0.5 text-[11px]">
              <p className="font-bold text-slate-900 text-xs">
                {customer?.customer_name || "Valued Client"}
              </p>
              {customer?.store_name && (
                <p className="font-semibold text-slate-700">{customer.store_name}</p>
              )}
              <p className="text-slate-600">
                {[customer?.city, customer?.province].filter(Boolean).join(", ") ||
                  "Installation Address on File"}
              </p>
              <p className="text-slate-500 text-[10px] pt-1">
                Contact: {customer?.contact_number || customer?.customer_email || "Provided on Survey"}
              </p>
            </div>
          </div>

          {/* Installation Site & Structural Profile */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/50">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Site & Technical Profile
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Structure:</span>
                <span className="font-bold text-slate-900 capitalize">
                  {input.buildingType || "Residential"} ({input.buildingStoreys || 1}-Storey)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Roof Surface:</span>
                <span className="font-bold text-slate-900 capitalize">
                  {input.roofType?.replace(/_/g, " ") || "Metal Sheet"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Roof Orientation:</span>
                <span className="font-bold text-slate-900 capitalize">
                  {input.roofOrientation || "South"} ({input.shadingCondition?.replace(/_/g, " ") || "Unshaded"})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Electrical Service:</span>
                <span className="font-bold text-slate-900">
                  {input.electricalPhase === "three_phase" ? "3-Phase 230/400V" : "1-Phase 230V"} ({input.mainBreakerAmps || 60}A)
                </span>
              </div>
            </div>
            {input.siteDescription && (
              <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-1 italic">
                Notes: {input.siteDescription}
              </p>
            )}
          </div>
        </div>

        {/* ========================================================
            3. KEY PERFORMANCE METRICS MATRIX
        ======================================================== */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="border border-slate-200 bg-slate-50 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">System Size</span>
            <span className="text-sm font-black text-slate-900">{calc.actualSolarKwp} kWp</span>
            <span className="text-[9px] text-slate-400 block">DC Array</span>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Inverter</span>
            <span className="text-sm font-black text-slate-900">{calc.inverterRatingKw} kW</span>
            <span className="text-[9px] text-slate-400 block">AC Output</span>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Battery Storage</span>
            <span className="text-sm font-black text-slate-900">
              {isHybrid ? `${calc.batteryNominalKwh} kWh` : "None"}
            </span>
            <span className="text-[9px] text-slate-400 block">
              {isHybrid ? `~${calc.batteryUsableKwh} kWh Usable` : "Grid-Tied"}
            </span>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Monthly Yield</span>
            <span className="text-sm font-black text-blue-700">
              {calc.estimatedMonthlyOutputKwh.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block">kWh / month</span>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-2 rounded-lg">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Est. Bill Savings</span>
            <span className="text-sm font-black text-emerald-700">
              ₱{calc.potentialMonthlySavings.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block">
              {calc.estimatedBillOffsetPercent}% offset
            </span>
          </div>
        </div>

        {/* ========================================================
            4. ITEMIZED BILL OF MATERIALS & ENGINEERING SCOPE
        ======================================================== */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800">
              Bill of Materials & Scope of Supply
            </h3>
            <span className="text-[9px] text-slate-400 font-semibold">Tier-1 Components & Standards</span>
          </div>

          <table className="w-full text-[11px] border border-slate-300 border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px] uppercase">
                <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                <th className="p-2 border-r border-slate-300 w-1/4">Component / Scope</th>
                <th className="p-2 border-r border-slate-300">Technical Specifications</th>
                <th className="p-2 border-r border-slate-300 text-right w-16">Qty</th>
                <th className="p-2 text-center w-14">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              <tr>
                <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">1</td>
                <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                  Solar Photovoltaic Modules
                </td>
                <td className="p-2 border-r border-slate-200">
                  {calc.panelWattage}W Tier 1 High-Efficiency Monocrystalline N-Type TOPCon Panels, PID-resistant, IP68 junction box
                </td>
                <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">
                  {calc.panelCount}
                </td>
                <td className="p-2 text-center text-slate-600">pcs</td>
              </tr>

              <tr>
                <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">2</td>
                <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                  {isHybrid ? "Hybrid Solar Inverter" : "On-Grid Solar Inverter"}
                </td>
                <td className="p-2 border-r border-slate-200">
                  {calc.inverterRatingKw} kW {input.electricalPhase === "three_phase" ? "Three-Phase" : "Single-Phase"} Inverter with MPPT tracking, WiFi telemetry & cloud energy monitoring{isHybrid ? ", and automatic EPS backup transfer switch" : ""}
                </td>
                <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">1</td>
                <td className="p-2 text-center text-slate-600">unit</td>
              </tr>

              {isHybrid && (
                <tr>
                  <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">3</td>
                  <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                    LiFePO4 Energy Storage Bank
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    51.2V 314Ah Deep-Cycle Lithium Iron Phosphate modules ({calc.batteryNominalKwh} kWh nominal, ~{calc.batteryUsableKwh} kWh usable) with intelligent Battery Management System (BMS)
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">
                    {calc.batteryPackCount}
                  </td>
                  <td className="p-2 text-center text-slate-600">packs</td>
                </tr>
              )}

              <tr>
                <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                  {isHybrid ? 4 : 3}
                </td>
                <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                  Mounting Structure & Racking
                </td>
                <td className="p-2 border-r border-slate-200">
                  Anodized AL6005-T5 aluminum rails, mid & end clamps, stainless steel SUS304 hardware, and leak-proof roof brackets engineered for {input.roofType?.replace(/_/g, " ") || "metal sheet"}
                </td>
                <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">
                  {calc.panelCount}
                </td>
                <td className="p-2 text-center text-slate-600">slots</td>
              </tr>

              <tr>
                <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                  {isHybrid ? 5 : 4}
                </td>
                <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                  Balance of System (BOS) & Protection
                </td>
                <td className="p-2 border-r border-slate-200">
                  Weatherproof combiner enclosure, 1000V DC isolators, Class II DC/AC Surge Protection Devices (SPD), MC4 connectors, double-insulated solar cables, and copper earthing system
                </td>
                <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">1</td>
                <td className="p-2 text-center text-slate-600">lot</td>
              </tr>

              <tr>
                <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                  {isHybrid ? 6 : 5}
                </td>
                <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                  Engineering, Labor & Commissioning
                </td>
                <td className="p-2 border-r border-slate-200">
                  Turnkey mechanical and electrical installation by certified crew ({calc.laborCrewSize} personnel, est. {calc.laborWorkingDays} days), safety compliance testing, system commissioning, and mobile app configuration
                </td>
                <td className="p-2 border-r border-slate-200 text-right font-black text-slate-900">1</td>
                <td className="p-2 text-center text-slate-600">lot</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========================================================
            5. COMMERCIAL WARRANTIES & VALUE SUMMARY
        ======================================================== */}
        <div className="grid grid-cols-2 gap-4">
          {/* Warranty Terms */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1 bg-slate-50/50">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
              Warranty & Quality Protection
            </span>
            <ul className="text-[10px] space-y-0.5 text-slate-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span><strong>25 Years:</strong> PV Module 84.8% Linear Performance Warranty</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span><strong>5 Years:</strong> Solar Inverter Manufacturer Warranty</span>
              </li>
              {isHybrid && (
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span><strong>10 Years / 6,000 Cycles:</strong> LiFePO4 Energy Storage</span>
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span><strong>1 Year:</strong> Full Workmanship & After-Sales Engineering Support</span>
              </li>
            </ul>
          </div>

          {/* Payment Terms & Notes */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-1 bg-slate-50/50">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
              Terms & Implementation Schedule
            </span>
            <div className="text-[10px] space-y-0.5 text-slate-700">
              <p><strong>Payment Milestone:</strong> 50% Mobilization Downpayment • 40% Delivery of Equipment • 10% Successful Commissioning.</p>
              <p><strong>Lead Time:</strong> Material mobilization 7-14 calendar days upon confirmation of downpayment and site technical survey sign-off.</p>
              <p><strong>Site Survey:</strong> Final stringing layout and conduit routing subject to physical structural and electrical site assessment.</p>
            </div>
          </div>
        </div>

        {/* ========================================================
            6. CONFORME & SIGNATURE BLOCK
        ======================================================== */}
        <div className="pt-3 border-t-2 border-slate-900 space-y-6">
          <div className="grid grid-cols-2 gap-12 text-center text-xs">
            {/* Prepared By */}
            <div className="space-y-1">
              <div className="h-10 border-b border-slate-400"></div>
              <p className="font-black text-slate-900 uppercase">Prepared & Engineered By</p>
              <p className="text-[10px] text-slate-500">Solar Technical Specialist / Applications Engineer</p>
              <p className="text-[9px] text-slate-400">Date: ________________________</p>
            </div>

            {/* Accepted By */}
            <div className="space-y-1">
              <div className="h-10 border-b border-slate-400"></div>
              <p className="font-black text-slate-900 uppercase">Conforme & Accepted By</p>
              <p className="text-[10px] text-slate-500">
                {customer?.customer_name ? `${customer.customer_name} / Authorized Signatory` : "Client / Authorized Representative"}
              </p>
              <p className="text-[9px] text-slate-400">Date: ________________________</p>
            </div>
          </div>

          <p className="text-[9px] text-slate-400 text-center">
            This document constitutes a preliminary quotation based on provided consumption data and standard solar irradiance metrics. Official contract will be executed upon final site validation.
          </p>
        </div>
      </div>
    </>
  );
};
