import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const COLLECTION = "crm_solar_quotations";

// Local persistent fallback file in scratch/ if Directus table is not yet migrated
const FALLBACK_DIR = path.join(process.cwd(), "scratch");
const FALLBACK_FILE = path.join(FALLBACK_DIR, "solar_quotations_db.json");

function getFallbackStore(): any[] {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    if (!fs.existsSync(FALLBACK_FILE)) {
      const initial: any[] = [];
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const data = fs.readFileSync(FALLBACK_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveFallbackStore(items: any[]) {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(items, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving fallback solar store:", e);
  }
}

// ============================================================================
// GET - Retrieve Solar Quotations
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    if (DIRECTUS_URL && DIRECTUS_TOKEN) {
      try {
        const directusRes = await fetch(`${DIRECTUS_URL}/items/${COLLECTION}?sort=-date_created&limit=200`, {
          headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
          cache: "no-store",
        });

        if (directusRes.ok) {
          const json = await directusRes.json();
          return NextResponse.json({ ok: true, data: json.data || [] });
        }
      } catch (err) {
        console.warn("[Solar API] Directus request skipped or collection not ready:", err);
      }
    }

    // Return persisted local store
    const localData = getFallbackStore();
    return NextResponse.json({ ok: true, data: localData });
  } catch (error) {
    console.error("Failed to fetch solar quotations:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch solar quotations" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create New Solar Quotation
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, calculation, customer } = body;

    if (!input || !calculation) {
      return NextResponse.json(
        { ok: false, message: "Missing input or calculation payload" },
        { status: 400 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quotationCode = `SOL-${new Date().getFullYear()}-${randomSuffix}`;

    const newRecord = {
      id: Date.now(),
      quotation_code: quotationCode,
      customer_id: input.customerId,
      customer_name: customer?.customer_name || `Customer #${input.customerId}`,
      customer_code: customer?.customer_code || "",
      store_name: customer?.store_name || "",
      city: customer?.city || "",
      province: customer?.province || "",
      contact_number: customer?.contact_number || "",
      
      // Inputs
      input_mode: input.inputMode || "amount",
      bill_month_1: input.billMonth1 || 0,
      bill_month_2: input.billMonth2 || 0,
      bill_month_3: input.billMonth3 || 0,
      kwh_month_1: input.kwhMonth1 || 0,
      kwh_month_2: input.kwhMonth2 || 0,
      kwh_month_3: input.kwhMonth3 || 0,
      average_bill: calculation.averageBill,
      electricity_rate: input.electricityRate,
      design_allowance_percent: input.designAllowance,
      system_type: input.systemType,
      panel_wattage: input.panelWattage,

      // Site & Building Engineering Profile
      electrical_phase: input.electricalPhase || "single_phase",
      main_breaker_rating_amps: input.mainBreakerAmps || 60,
      building_type: input.buildingType || "residential",
      roof_type: input.roofType || "rib_type_gi",
      roof_orientation: input.roofOrientation || "south",
      building_storeys: input.buildingStoreys || 1,
      available_roof_area_sqm: input.availableRoofAreaSqm || 0,
      shading_condition: input.shadingCondition || "unshaded",
      site_description: input.siteDescription || "",

      // Calculated Outputs
      estimated_monthly_kwh: calculation.estimatedMonthlyKwh,
      base_solar_kwp: calculation.baseSolarKwp,
      recommended_solar_kwp: calculation.actualSolarKwp,
      panel_count: calculation.panelCount,
      inverter_rating_kw: calculation.inverterRatingKw,
      battery_pack_count: calculation.batteryPackCount,
      estimated_monthly_output_kwh: calculation.estimatedMonthlyOutputKwh,
      estimated_bill_offset_percent: calculation.estimatedBillOffsetPercent,
      roof_allowance_sqm: calculation.roofAllowanceSqm,
      potential_monthly_savings: calculation.potentialMonthlySavings,
      estimated_remaining_charge: calculation.estimatedRemainingCharge,

      labor_crew_size: calculation.laborCrewSize,
      labor_working_days: calculation.laborWorkingDays,
      labor_person_days: calculation.laborPersonDays,

      status: "draft",
      notes: input.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt Directus persistence first
    if (DIRECTUS_URL && DIRECTUS_TOKEN) {
      try {
        const directusRes = await fetch(`${DIRECTUS_URL}/items/${COLLECTION}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          },
          body: JSON.stringify(newRecord),
        });

        if (directusRes.ok) {
          const json = await directusRes.json();
          // Also sync to local fallback for safety
          const localList = getFallbackStore();
          saveFallbackStore([json.data, ...localList]);
          return NextResponse.json({ ok: true, data: json.data }, { status: 201 });
        }
      } catch (directusErr) {
        console.warn("[Solar API] Directus insert failed, fallback to local:", directusErr);
      }
    }

    // Fallback store write
    const items = getFallbackStore();
    items.unshift(newRecord);
    saveFallbackStore(items);

    return NextResponse.json({ ok: true, data: newRecord }, { status: 201 });
  } catch (error) {
    console.error("Failed to save solar quotation:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error saving quotation" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remove Solar Quotation
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, message: "ID is required" }, { status: 400 });
    }

    if (DIRECTUS_URL && DIRECTUS_TOKEN) {
      try {
        await fetch(`${DIRECTUS_URL}/items/${COLLECTION}/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        });
      } catch (e) {
        // ignore
      }
    }

    const items = getFallbackStore();
    const updated = items.filter((item) => String(item.id) !== String(id));
    saveFallbackStore(updated);

    return NextResponse.json({ ok: true, message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Delete failed" }, { status: 500 });
  }
}
