"use client";

import { useMemo, useState } from "react";
import { 
  SolarFormInput, 
  SolarCalculationResult, 
  SystemType,
  InputMode
} from "../types/solar.schema";

const PEAK_SUN_HOURS_PER_DAY = 3.6;
const DAYS_PER_MONTH = 30;
const BATTERY_NOMINAL_KWH_PER_PACK = 16.1; // 51.2V * 314Ah ≈ 16.08 kWh
const BATTERY_DOD_RATIO = 0.9; // 90% depth of discharge
const SQM_PER_PANEL = 3.1; // ~3.1 m² roof allowance per panel

export function useSolarCalculator(initialValues?: Partial<SolarFormInput>) {
  const [formData, setFormData] = useState<SolarFormInput>({
    customerId: initialValues?.customerId || "",
    inputMode: initialValues?.inputMode ?? "amount",
    billMonth1: initialValues?.billMonth1 ?? 0,
    billMonth2: initialValues?.billMonth2 ?? 0,
    billMonth3: initialValues?.billMonth3 ?? 0,
    kwhMonth1: initialValues?.kwhMonth1 ?? 0,
    kwhMonth2: initialValues?.kwhMonth2 ?? 0,
    kwhMonth3: initialValues?.kwhMonth3 ?? 0,
    electricityRate: initialValues?.electricityRate ?? 12.5,
    designAllowance: initialValues?.designAllowance ?? 30,
    systemType: initialValues?.systemType ?? "hybrid",
    panelWattage: initialValues?.panelWattage ?? 680,
    notes: initialValues?.notes ?? "",
  });

  const updateField = <K extends keyof SolarFormInput>(field: K, value: SolarFormInput[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculation = useMemo<SolarCalculationResult>(() => {
    const { 
      inputMode,
      billMonth1, 
      billMonth2, 
      billMonth3, 
      kwhMonth1,
      kwhMonth2,
      kwhMonth3,
      electricityRate, 
      designAllowance, 
      systemType, 
      panelWattage 
    } = formData;

    const validRate = electricityRate > 0 ? electricityRate : 12.5;

    let avgBill = 0;
    let estimatedMonthlyKwh = 0;

    if (inputMode === "kwh") {
      const k1 = Number(kwhMonth1 || 0);
      const k2 = Number(kwhMonth2 || 0);
      const k3 = Number(kwhMonth3 || 0);
      const totalKwh = k1 + k2 + k3;
      estimatedMonthlyKwh = totalKwh > 0 ? Number((totalKwh / 3).toFixed(1)) : 0;
      avgBill = Math.round(estimatedMonthlyKwh * validRate);
    } else {
      const m1 = Number(billMonth1 || 0);
      const m2 = Number(billMonth2 || 0);
      const m3 = Number(billMonth3 || 0);
      const totalBills = m1 + m2 + m3;
      avgBill = totalBills > 0 ? Math.round(totalBills / 3) : 0;
      estimatedMonthlyKwh = validRate > 0 && avgBill > 0 ? Number((avgBill / validRate).toFixed(1)) : 0;
    }

    const hasCalculatedData = avgBill > 0 || estimatedMonthlyKwh > 0;

    if (!hasCalculatedData) {
      return {
        hasCalculatedData: false,
        averageBill: 0,
        estimatedMonthlyKwh: 0,
        dailyEnergyKwh: 0,
        baseSolarKwp: 0,
        targetSolarKwp: 0,
        actualSolarKwp: 0,
        panelCount: 0,
        panelWattage,
        inverterRatingKw: 0,
        systemType,
        batteryPackCount: 0,
        batteryNominalKwh: 0,
        batteryUsableKwh: 0,
        batteryCoveragePercent: 0,
        estimatedMonthlyOutputKwh: 0,
        estimatedBillOffsetPercent: 0,
        roofAllowanceSqm: 0,
        potentialMonthlySavings: 0,
        estimatedRemainingCharge: 0,
        laborCrewSize: 3,
        laborWorkingDays: 0,
        laborPersonDays: 0,
      };
    }

    const dailyEnergyKwh = Number((estimatedMonthlyKwh / DAYS_PER_MONTH).toFixed(2));

    // Base solar requirement: Monthly kWh / (30 days * 3.6 PSH)
    const baseSolarKwp = Number((estimatedMonthlyKwh / (DAYS_PER_MONTH * PEAK_SUN_HOURS_PER_DAY)).toFixed(2));
    
    // Target with design allowance
    const allowanceMultiplier = 1 + (Number(designAllowance || 0) / 100);
    const targetSolarKwp = Number((baseSolarKwp * allowanceMultiplier).toFixed(2));

    // Panel count calculation (rounded up to whole panel)
    const wattageInKw = panelWattage / 1000;
    const panelCount = Math.max(1, Math.ceil(targetSolarKwp / wattageInKw));
    
    // Actual installed DC system size
    const actualSolarKwp = Number(((panelCount * panelWattage) / 1000).toFixed(1));

    // Monthly estimated output: Actual kWp * 30 days * 3.6 PSH
    const estimatedMonthlyOutputKwh = Number((actualSolarKwp * DAYS_PER_MONTH * PEAK_SUN_HOURS_PER_DAY).toFixed(1));

    // Offset percentage
    const offsetCalc = estimatedMonthlyKwh > 0 ? (estimatedMonthlyOutputKwh / estimatedMonthlyKwh) * 100 : 100;
    const estimatedBillOffsetPercent = Math.min(100, Math.round(offsetCalc));

    // Roof allowance: Panel count * 3.1 m²
    const roofAllowanceSqm = Math.round(panelCount * SQM_PER_PANEL);

    // Preliminary Inverter Sizing
    const rawInverter = actualSolarKwp * 0.9;
    let inverterRatingKw = 6;
    if (rawInverter <= 3.5) inverterRatingKw = 3;
    else if (rawInverter <= 5.5) inverterRatingKw = 5;
    else if (rawInverter <= 6.5) inverterRatingKw = 6;
    else if (rawInverter <= 8.5) inverterRatingKw = 8;
    else if (rawInverter <= 11) inverterRatingKw = 10;
    else if (rawInverter <= 13) inverterRatingKw = 12;
    else inverterRatingKw = Math.round(rawInverter);

    // Battery pack recommendation (only for hybrid)
    let batteryPackCount = 0;
    let batteryNominalKwh = 0;
    let batteryUsableKwh = 0;
    let batteryCoveragePercent = 0;

    if (systemType === "hybrid") {
      const singlePackUsable = BATTERY_NOMINAL_KWH_PER_PACK * BATTERY_DOD_RATIO; // ~14.49 kWh
      batteryPackCount = Math.max(1, Math.ceil(dailyEnergyKwh / singlePackUsable));
      batteryNominalKwh = Number((batteryPackCount * BATTERY_NOMINAL_KWH_PER_PACK).toFixed(1));
      batteryUsableKwh = Number((batteryNominalKwh * BATTERY_DOD_RATIO).toFixed(1));
      batteryCoveragePercent = dailyEnergyKwh > 0 ? Math.round((batteryUsableKwh / dailyEnergyKwh) * 100) : 100;
    }

    // Financial estimations
    const potentialMonthlySavings = Math.min(avgBill, Math.round(estimatedMonthlyOutputKwh * validRate));
    const estimatedRemainingCharge = Math.max(0, Math.round(avgBill - potentialMonthlySavings));

    // Labor crew & time estimation
    const laborCrewSize = 3;
    let laborWorkingDays = 3;
    if (actualSolarKwp <= 4) laborWorkingDays = 2;
    else if (actualSolarKwp <= 9) laborWorkingDays = 3;
    else if (actualSolarKwp <= 15) laborWorkingDays = 4;
    else laborWorkingDays = 5;

    const laborPersonDays = laborCrewSize * laborWorkingDays;

    return {
      hasCalculatedData: true,
      averageBill: avgBill,
      estimatedMonthlyKwh,
      dailyEnergyKwh,
      baseSolarKwp,
      targetSolarKwp,
      actualSolarKwp,
      panelCount,
      panelWattage,
      inverterRatingKw,
      systemType,
      batteryPackCount,
      batteryNominalKwh,
      batteryUsableKwh,
      batteryCoveragePercent,
      estimatedMonthlyOutputKwh,
      estimatedBillOffsetPercent,
      roofAllowanceSqm,
      potentialMonthlySavings,
      estimatedRemainingCharge,
      laborCrewSize,
      laborWorkingDays,
      laborPersonDays,
    };
  }, [formData]);

  const resetForm = () => {
    setFormData({
      customerId: "",
      inputMode: "amount",
      billMonth1: 0,
      billMonth2: 0,
      billMonth3: 0,
      kwhMonth1: 0,
      kwhMonth2: 0,
      kwhMonth3: 0,
      electricityRate: 12.5,
      designAllowance: 30,
      systemType: "hybrid",
      panelWattage: 680,
      notes: "",
    });
  };

  const loadQuotation = (item: Partial<SolarFormInput>) => {
    setFormData({
      customerId: item.customerId || "",
      inputMode: item.inputMode ?? "amount",
      billMonth1: item.billMonth1 ?? 0,
      billMonth2: item.billMonth2 ?? 0,
      billMonth3: item.billMonth3 ?? 0,
      kwhMonth1: item.kwhMonth1 ?? 0,
      kwhMonth2: item.kwhMonth2 ?? 0,
      kwhMonth3: item.kwhMonth3 ?? 0,
      electricityRate: item.electricityRate ?? 12.5,
      designAllowance: item.designAllowance ?? 30,
      systemType: item.systemType ?? "hybrid",
      panelWattage: item.panelWattage ?? 680,
      notes: item.notes ?? "",
    });
  };

  return {
    formData,
    calculation,
    updateField,
    resetForm,
    loadQuotation,
  };
}
