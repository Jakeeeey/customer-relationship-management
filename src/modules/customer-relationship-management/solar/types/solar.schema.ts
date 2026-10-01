import { z } from "zod";

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export const SystemTypeEnum = z.enum(["on_grid", "hybrid"]);
export type SystemType = z.infer<typeof SystemTypeEnum>;

export const InputModeEnum = z.enum(["amount", "kwh"]);
export type InputMode = z.infer<typeof InputModeEnum>;

export const ElectricalPhaseEnum = z.enum(["single_phase", "three_phase"]);
export type ElectricalPhase = z.infer<typeof ElectricalPhaseEnum>;

export const BuildingTypeEnum = z.enum(["residential", "commercial", "industrial", "warehouse"]);
export type BuildingType = z.infer<typeof BuildingTypeEnum>;

export const RoofTypeEnum = z.enum([
  "rib_type_gi",
  "standing_seam",
  "concrete_deck",
  "tile_roof",
  "ground_mount",
]);
export type RoofType = z.infer<typeof RoofTypeEnum>;

export const RoofOrientationEnum = z.enum(["south", "east", "west", "flat_deck", "north"]);
export type RoofOrientation = z.infer<typeof RoofOrientationEnum>;

export const ShadingConditionEnum = z.enum(["unshaded", "minor_shading", "heavy_shading"]);
export type ShadingCondition = z.infer<typeof ShadingConditionEnum>;

// ============================================================================
// SOLAR CALCULATOR FORM SCHEMA
// ============================================================================

export const SolarInputSchema = z.object({
  customerId: z.union([z.number(), z.string()]).refine((val) => Boolean(val), {
    message: "Customer selection is required",
  }),
  inputMode: InputModeEnum.default("amount"),
  billMonth1: z.number().min(0, "Bill must be 0 or greater").default(0),
  billMonth2: z.number().min(0, "Bill must be 0 or greater").default(0),
  billMonth3: z.number().min(0, "Bill must be 0 or greater").default(0),
  kwhMonth1: z.number().min(0, "kWh must be 0 or greater").default(0),
  kwhMonth2: z.number().min(0, "kWh must be 0 or greater").default(0),
  kwhMonth3: z.number().min(0, "kWh must be 0 or greater").default(0),
  electricityRate: z.number().positive("Rate must be greater than 0").default(12.5),
  designAllowance: z.number().min(0, "Allowance cannot be negative").max(100, "Max allowance is 100%").default(30),
  systemType: SystemTypeEnum.default("hybrid"),
  panelWattage: z.union([z.literal(620), z.literal(680), z.literal(720)]).default(680),

  // Building & Site Engineering Profile
  electricalPhase: ElectricalPhaseEnum.default("single_phase"),
  mainBreakerAmps: z.number().default(60),
  buildingType: BuildingTypeEnum.default("residential"),
  roofType: RoofTypeEnum.default("rib_type_gi"),
  roofOrientation: RoofOrientationEnum.default("south"),
  buildingStoreys: z.number().min(1).default(1),
  availableRoofAreaSqm: z.number().min(0).default(0),
  shadingCondition: ShadingConditionEnum.default("unshaded"),
  siteDescription: z.string().optional(),

  notes: z.string().optional(),
});

export type SolarFormInput = z.infer<typeof SolarInputSchema>;

// ============================================================================
// SOLAR CALCULATION RESULT SCHEMA
// ============================================================================

export const SolarCalculationResultSchema = z.object({
  hasCalculatedData: z.boolean().default(false),
  averageBill: z.number(),
  estimatedMonthlyKwh: z.number(),
  dailyEnergyKwh: z.number(),
  baseSolarKwp: z.number(),
  targetSolarKwp: z.number(),
  actualSolarKwp: z.number(),
  panelCount: z.number(),
  panelWattage: z.number(),
  inverterRatingKw: z.number(),
  systemType: SystemTypeEnum,
  batteryPackCount: z.number(),
  batteryNominalKwh: z.number(),
  batteryUsableKwh: z.number(),
  batteryCoveragePercent: z.number(),
  estimatedMonthlyOutputKwh: z.number(),
  estimatedBillOffsetPercent: z.number(),
  roofAllowanceSqm: z.number(),
  potentialMonthlySavings: z.number(),
  estimatedRemainingCharge: z.number(),
  laborCrewSize: z.number(),
  laborWorkingDays: z.number(),
  laborPersonDays: z.number(),

  // Site Engineering Analysis
  electricalPhase: ElectricalPhaseEnum,
  roofType: RoofTypeEnum,
  availableRoofAreaSqm: z.number(),
  roofFitStatus: z.enum(["unknown", "sufficient", "insufficient"]),
  roofFitDifferenceSqm: z.number(),
});

export type SolarCalculationResult = z.infer<typeof SolarCalculationResultSchema>;

// ============================================================================
// SAVED SOLAR QUOTATION SCHEMA
// ============================================================================

export const QuotationStatusEnum = z.enum(["draft", "presented", "approved", "rejected"]);
export type QuotationStatus = z.infer<typeof QuotationStatusEnum>;

export const SolarQuotationSchema = z.object({
  id: z.union([z.number(), z.string()]),
  quotation_code: z.string(),
  customer_id: z.union([z.number(), z.string()]),
  customer_name: z.string().optional(),
  customer_code: z.string().optional(),
  store_name: z.string().optional(),
  contact_number: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  
  // Inputs
  input_mode: InputModeEnum.default("amount"),
  bill_month_1: z.number().default(0),
  bill_month_2: z.number().default(0),
  bill_month_3: z.number().default(0),
  kwh_month_1: z.number().nullish(),
  kwh_month_2: z.number().nullish(),
  kwh_month_3: z.number().nullish(),
  average_bill: z.number(),
  electricity_rate: z.number(),
  design_allowance_percent: z.number(),
  system_type: SystemTypeEnum,
  panel_wattage: z.number(),

  // Site Profile
  electrical_phase: ElectricalPhaseEnum.default("single_phase"),
  main_breaker_rating_amps: z.number().nullish(),
  building_type: BuildingTypeEnum.default("residential"),
  roof_type: RoofTypeEnum.default("rib_type_gi"),
  roof_orientation: RoofOrientationEnum.default("south"),
  building_storeys: z.number().default(1),
  available_roof_area_sqm: z.number().nullish(),
  shading_condition: ShadingConditionEnum.default("unshaded"),
  site_description: z.string().nullish(),

  // Outputs
  estimated_monthly_kwh: z.number(),
  base_solar_kwp: z.number(),
  recommended_solar_kwp: z.number(),
  panel_count: z.number(),
  inverter_rating_kw: z.number(),
  battery_pack_count: z.number(),
  estimated_monthly_output_kwh: z.number(),
  estimated_bill_offset_percent: z.number(),
  roof_allowance_sqm: z.number(),
  potential_monthly_savings: z.number(),
  estimated_remaining_charge: z.number(),
  
  labor_crew_size: z.number(),
  labor_working_days: z.number(),
  labor_person_days: z.number(),

  status: QuotationStatusEnum.default("draft"),
  notes: z.string().nullish(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type SolarQuotation = z.infer<typeof SolarQuotationSchema>;

export interface CustomerOption {
  id: number | string;
  customer_code: string;
  customer_name: string;
  store_name?: string | null;
  city?: string | null;
  province?: string | null;
  contact_number?: string | null;
  customer_email?: string | null;
}
