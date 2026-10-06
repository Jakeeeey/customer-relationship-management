/**
 * PSGC address helpers shared by the customer and customer-registration forms.
 *
 * Pure functions only: callers keep their own fetching (the customer form
 * calls psgc.gitlab.io directly, the registration form goes through the
 * /api/psgc proxy). Codes are used transiently to fetch child lists but are
 * never persisted — only place names are stored on the customer row.
 */

export interface PsgcLocation {
    code: string;
    name: string;
}

export interface PsgcProvince extends PsgcLocation {
    regionCode?: string | null;
}

export interface PsgcCity extends PsgcLocation {
    regionCode?: string | null;
    provinceCode?: string | null | false;
}

const REGION_ALIASES: Record<string, string> = {
    "metro manila": "national capital region",
    ncr: "national capital region",
};

/**
 * Normalise a Philippine place name for PSGC comparison. PSGC and OSM disagree
 * on decorations ("City of Manila" vs "Manila", "Cebu City" vs "City of Cebu",
 * trailing "(Pob.)"), so strip those before matching.
 */
export function normalizePhName(raw?: string | null): string {
    if (!raw) return "";
    const normalized = raw
        .toLowerCase()
        .replace(/\(pob\.?\)/g, " ")
        .replace(/\b(city|municipality|province|region)\s+of\b/g, " ")
        .replace(/\b(city|municipality)\b/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return REGION_ALIASES[normalized] ?? normalized;
}

/**
 * Pick the single entry whose name matches `raw`. An exact normalised match
 * wins; otherwise a one-way containment match is accepted only when it is
 * unique. Ambiguous lookups return null so a wrong place is never auto-filled.
 */
export function matchUnique<T extends PsgcLocation>(pool: T[], raw?: string | null): T | null {
    const target = normalizePhName(raw);
    if (!target) return null;

    const exact = pool.filter((item) => normalizePhName(item.name) === target);
    if (exact.length === 1) return exact[0];

    const loose = pool.filter((item) => {
        const name = normalizePhName(item.name);
        return name.includes(target) || target.includes(name);
    });
    return loose.length === 1 ? loose[0] : null;
}

export function matchRegion(regions: PsgcLocation[], raw?: string | null): PsgcLocation | null {
    return matchUnique(regions, raw);
}

export function matchProvince(
    provinces: PsgcProvince[],
    raw: string | null | undefined,
    regionCode?: string | null,
): PsgcProvince | null {
    const pool = regionCode ? provinces.filter((p) => p.regionCode === regionCode) : provinces;
    return matchUnique(pool, raw);
}

export function matchCity(
    cities: PsgcCity[],
    raw: string | null | undefined,
    scope: { regionCode?: string | null; provinceCode?: string | null } = {},
): PsgcCity | null {
    let pool = cities;
    if (scope.provinceCode) pool = pool.filter((c) => c.provinceCode === scope.provinceCode);
    else if (scope.regionCode) pool = pool.filter((c) => c.regionCode === scope.regionCode);
    return matchUnique(pool, raw);
}

export function matchBarangay(barangays: PsgcLocation[], raw?: string | null): PsgcLocation | null {
    return matchUnique(barangays, raw);
}

export interface NominatimAddress {
    house_number?: string;
    building?: string;
    road?: string;
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
    village?: string;
    hamlet?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
    region?: string;
    postcode?: string;
}

export interface GeocodedAddress {
    region: string;
    province: string;
    city: string;
    brgy: string;
    detail: {
        house_no: string;
        unit_building: string;
        street: string;
        subdivision: string;
        purok_sitio: string;
        zip_code: string;
    };
}

/** Map a Nominatim `address` object onto our address columns. */
export function parseNominatimAddress(address: NominatimAddress): GeocodedAddress {
    return {
        region: address.region ?? "",
        province: address.state ?? "",
        city: address.city ?? address.town ?? address.municipality ?? "",
        brgy: address.village ?? address.suburb ?? address.neighbourhood ?? address.quarter ?? "",
        detail: {
            house_no: address.house_number ?? "",
            unit_building: address.building ?? "",
            street: address.road ?? "",
            subdivision: address.suburb ?? address.hamlet ?? "",
            purok_sitio: address.neighbourhood ?? address.quarter ?? "",
            zip_code: address.postcode ?? "",
        },
    };
}
