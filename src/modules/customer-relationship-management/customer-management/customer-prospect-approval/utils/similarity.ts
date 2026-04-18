import { CustomerProspect } from "../types";

/**
 * Local type definitions to ensure decoupling from duplicate-customer module
 */
export type SimilarityMatchReason = 
    | 'EXACT_NAME_MATCH'
    | 'FUZZY_NAME_MATCH'
    | 'SHARED_TIN'
    | 'SHARED_CONTACT'
    | 'SHARED_EMAIL'
    | 'SHARED_STORE_LOCATION'
    | 'SIMILAR_NAME_SAME_ADDRESS';

/**
 * Customer interface matching the main customer table schema.
 * Used for comparing with prospects.
 */
export interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
    type: 'Regular' | 'Employee';
    user_id?: number | null;
    customer_image?: string | null;
    store_name: string;
    store_signage: string;
    brgy?: string | null;
    city?: string | null;
    province?: string | null;
    contact_number: string;
    customer_email?: string | null;
    tel_number?: string | null;
    bank_details?: string | null;
    customer_tin?: string | null;
    payment_term?: number | null;
    store_type: number;
    price_type?: string | null;
    encoder_id: number;
    credit_type?: number | null;
    company_code?: number | null;
    date_entered?: string | null;
    isActive: number;
    isVAT: number;
    isEWT: number;
    discount_type?: number | null;
    otherDetails?: string | null;
    classification?: number | null;
    prospect_status?: string | null;
}

export interface SimilarityGroup {
    id: string;
    reasons: SimilarityMatchReason[];
    customers: (CustomerProspect | Customer)[]; // [Prospect, ExistingCustomer]
    confidence_score: number;
}

/**
 * Calculates string similarity using Sorensen-Dice coefficient.
 */
export function getStringSimilarity(str1: string | null | undefined, str2: string | null | undefined): number {
    const s1 = (str1 || "").toLowerCase().replace(/\s+/g, "");
    const s2 = (str2 || "").toLowerCase().replace(/\s+/g, "");

    if (s1 === s2 && s1 !== "") return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const getBigrams = (str: string) => {
        const bigrams = new Set<string>();
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.add(str.substring(i, i + 2));
        }
        return bigrams;
    };

    const bigrams1 = getBigrams(s1);
    const bigrams2 = getBigrams(s2);

    let intersection = 0;
    for (const bigram of bigrams1) {
        if (bigrams2.has(bigram)) intersection++;
    }

    return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Checks a prospect against a list of customers to find potential matches.
 */
export function findPotentialMatches(
    prospect: CustomerProspect,
    customers: Customer[],
    threshold: number = 0.85
): SimilarityGroup[] {
    const matches: SimilarityGroup[] = [];

    const weights: Record<string, number> = {
        'SHARED_TIN': 0.98,
        'SHARED_EMAIL': 0.92,
        'SHARED_CONTACT': 0.88,
        'EXACT_NAME_MATCH': 0.85,
        'SIMILAR_NAME_SAME_ADDRESS': 0.75,
        'FUZZY_NAME_MATCH': 0.70,
        'SHARED_STORE_LOCATION': 0.65,
    };

    const hasContent = (val: string | null | undefined) => {
        const s = (val || "").trim();
        return s !== "" && s !== "0" && s.toLowerCase() !== "null";
    };

    for (const target of customers) {
        const reasons = new Set<SimilarityMatchReason>();
        let isMatch = false;

        // 1. Exact/Fuzzy Name Match
        const nameSimilarity = getStringSimilarity(prospect.customer_name, target.customer_name);
        if (nameSimilarity >= threshold) {
            if (prospect.store_name !== target.store_name || prospect.contact_number !== target.contact_number) {
                isMatch = true;
                reasons.add(nameSimilarity === 1 ? 'EXACT_NAME_MATCH' : 'FUZZY_NAME_MATCH');
            }
        }

        // 2. Shared Identifiers
        if (hasContent(prospect.customer_tin) && prospect.customer_tin === target.customer_tin) {
            isMatch = true;
            reasons.add('SHARED_TIN');
        }
        if (hasContent(prospect.contact_number) && prospect.contact_number === target.contact_number) {
            isMatch = true;
            reasons.add('SHARED_CONTACT');
        }
        if (hasContent(prospect.customer_email) && prospect.customer_email === target.customer_email) {
            isMatch = true;
            reasons.add('SHARED_EMAIL');
        }

        // 3. Shared Location/Store
        const isAddressMatch = 
            hasContent(prospect.province) &&
            prospect.brgy === target.brgy &&
            prospect.city === target.city &&
            prospect.province === target.province;

        const isStoreMatch = 
            hasContent(prospect.store_name) &&
            prospect.store_name === target.store_name &&
            prospect.store_signage === target.store_signage;

        if (isAddressMatch && isStoreMatch && prospect.customer_name !== target.customer_name) {
            isMatch = true;
            reasons.add('SHARED_STORE_LOCATION');
        }

        if (isAddressMatch && prospect.customer_name !== target.customer_name) {
            if (nameSimilarity >= threshold) {
                isMatch = true;
                reasons.add('SIMILAR_NAME_SAME_ADDRESS');
            }
        }

        if (isMatch) {
            const reasonArray = Array.from(reasons);
            let probabilityOfFailure = 1.0;
            reasonArray.forEach(reason => {
                const weight = weights[reason] || 0.5;
                probabilityOfFailure *= (1 - weight);
            });
            const confidenceScore = Math.min(0.99, 1 - probabilityOfFailure);

            matches.push({
                id: `match-${target.id}`,
                customers: [prospect, target],
                reasons: reasonArray,
                confidence_score: Number(confidenceScore.toFixed(4)),
            });
        }
    }

    return matches;
}
