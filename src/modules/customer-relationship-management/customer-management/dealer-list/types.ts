// src/modules/customer-relationship-management/customer-management/dealer-list/types.ts
// Shared TypeScript contracts for the Dealer Registration / Dealer List module.
// Mirrors the `dealer_list` table schema. No backend changes required.

export interface DealerTypeRecord {
  dealer_type_id: number;
  type_name: string;
  description?: string;
}

export interface SubscriptionRecord {
  id: number;
  name: string;
  description?: string;
  tier?: number;
}

// ---------------------------------------------------------------------------
// Primary record shape returned from Directus `dealer_list` collection
// ---------------------------------------------------------------------------
export interface DealerRecord {
  dealer_id?: number | string;
  dealer_name?: string;
  dealer_type?: string; // dealer_type
  dealer_type_id?: number | string | DealerTypeRecord | null;
  dealer_code?: string;
  dealer_address?: string;
  dealer_brgy?: string;
  dealer_city?: string;
  dealer_province?: string;
  dealer_zipCode?: string;
  dealer_registrationNumber?: string;
  dealer_tin?: string;
  dealer_dateAdmitted?: string;
  dealer_contact?: string;
  dealer_email?: string;
  dealer_outlook?: string;
  dealer_gmail?: string;
  dealer_department?: string;
  dealer_logo?: string;
  dealer_facebook?: string;
  dealer_website?: string;
  dealer_tags?: string;
  directus?: string;
  springboot?: string;
  subscription_tier?: string; // virtual field mapped from subscription_id.name
  subscription_id?: number | string | SubscriptionRecord | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Directus API response envelope
// ---------------------------------------------------------------------------
export type DealerApiResponse =
  | DealerRecord[]
  | {
      data?: DealerRecord[];
      meta?: {
        total_count?: number;
        filter_count?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }
  | null;

// ---------------------------------------------------------------------------
// Filters the UI exposes to the user
// ---------------------------------------------------------------------------
export interface DealerFilters {
  dealer_type?: string;
  dealer_type_id?: string | number;
  dealer_city?: string;
  dealer_province?: string;
  dealer_brgy?: string;
  dealer_department?: string;
  subscription_tier?: string;
  subscription_id?: string | number;
  search?: string;
}

// ---------------------------------------------------------------------------
// Lookup options fetched from Directus for filter dropdowns
// ---------------------------------------------------------------------------
export interface DealerLookupOptions {
  types: DealerTypeRecord[];
  cities: string[];
  provinces: string[];
  departments: string[];
  tiers: SubscriptionRecord[];
}

// ---------------------------------------------------------------------------
// Normalized result used inside the hook
// ---------------------------------------------------------------------------
export interface NormalizedDealerResult {
  data: DealerRecord[];
  total: number;
}

// ---------------------------------------------------------------------------
// KPI summary derived client-side from the dealer data
// ---------------------------------------------------------------------------
export interface DealerKPIs {
  totalDealers: number;
  activeDealers: number;
  dealerTypes: number;
  provinces: number;
}

