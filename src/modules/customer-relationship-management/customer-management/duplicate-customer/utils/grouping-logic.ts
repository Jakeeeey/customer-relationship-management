import { Customer, DuplicateGroup, DuplicateMatchReason, GroupingOptions } from "../types";

/**
 * Calculates string similarity using Sorensen-Dice coefficient.
 * Returns a value between 0 and 1.
 */
function getStringSimilarity(str1: string | null | undefined, str2: string | null | undefined): number {
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
 * Groups customers into potential duplicate groups based on "fishy" logic.
 */
export function identifyDuplicateGroups(
    customers: Customer[],
    options: GroupingOptions = {
        fuzzyThreshold: 0.85,
        checkFuzzyNames: true,
        checkIdentifiers: true,
        checkLocations: true,
    }
): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<number>();

    for (let i = 0; i < customers.length; i++) {
        const c1 = customers[i];
        if (processedIds.has(c1.id)) continue;

        const currentGroupCustomers: Customer[] = [c1];
        const reasons = new Set<DuplicateMatchReason>();

        for (let j = i + 1; j < customers.length; j++) {
            const c2 = customers[j];
            if (processedIds.has(c2.id)) continue;

            let isMatch = false;

            const hasContent = (val: string | null | undefined) => {
                const s = (val || "").trim();
                return s !== "" && s !== "0" && s.toLowerCase() !== "null";
            };

            // 1. Exact/Fuzzy Name Match
            if (options.checkFuzzyNames) {
                const nameSimilarity = getStringSimilarity(c1.customer_name, c2.customer_name);
                if (nameSimilarity >= options.fuzzyThreshold) {
                    // Check if store or contact differs as per "fishy" logic
                    if (c1.store_name !== c2.store_name || c1.contact_number !== c2.contact_number) {
                        isMatch = true;
                        reasons.add(nameSimilarity === 1 ? "EXACT_NAME_MATCH" : "FUZZY_NAME_MATCH");
                    }
                }
            }

            // 2. Shared Identifiers
            if (options.checkIdentifiers) {
                // Shared TIN
                if (hasContent(c1.customer_tin) && c1.customer_tin === c2.customer_tin) {
                    isMatch = true;
                    reasons.add("SHARED_TIN");
                }
                // Shared Contact Number
                if (hasContent(c1.contact_number) && c1.contact_number === c2.contact_number) {
                    isMatch = true;
                    reasons.add("SHARED_CONTACT");
                }
                // Shared Email
                if (hasContent(c1.customer_email) && c1.customer_email === c2.customer_email) {
                    isMatch = true;
                    reasons.add("SHARED_EMAIL");
                }
            }

            // 3. Shared Location/Store
            if (options.checkLocations) {
                const isAddressMatch = 
                    hasContent(c1.province) && // Ensure we have at least a province to match address
                    c1.brgy === c2.brgy &&
                    c1.city === c2.city &&
                    c1.province === c2.province;

                const isStoreMatch = 
                    hasContent(c1.store_name) &&
                    c1.store_name === c2.store_name &&
                    c1.store_signage === c2.store_signage;

                // Shared Full Store Location (Exact Address + Store Name)
                if (isAddressMatch && isStoreMatch && c1.customer_name !== c2.customer_name) {
                    isMatch = true;
                    reasons.add("SHARED_STORE_LOCATION");
                }

                // 4. Same Address + Similar Name
                if (isAddressMatch && c1.customer_name !== c2.customer_name) {
                    const nameSimilarity = getStringSimilarity(c1.customer_name, c2.customer_name);
                    if (nameSimilarity >= options.fuzzyThreshold) {
                        isMatch = true;
                        reasons.add("SIMILAR_NAME_SAME_ADDRESS");
                    }
                }
            }

            if (isMatch) {
                currentGroupCustomers.push(c2);
                processedIds.add(c2.id);
            }
        }

        if (currentGroupCustomers.length > 1) {
            processedIds.add(c1.id);
            
            // Calculate dynamic confidence score using probabilistic OR
            // Formula: 1 - ((1-s1) * (1-s2) * ... (1-sn))
            const weights: Record<string, number> = {
                'SHARED_TIN': 0.98,
                'SHARED_EMAIL': 0.92,
                'SHARED_CONTACT': 0.88,
                'EXACT_NAME_MATCH': 0.85,
                'SIMILAR_NAME_SAME_ADDRESS': 0.75,
                'FUZZY_NAME_MATCH': 0.70,
                'SHARED_STORE_LOCATION': 0.65,
            };

            const reasonArray = Array.from(reasons);
            let probabilityOfFailure = 1.0;
            
            reasonArray.forEach(reason => {
                const weight = weights[reason] || 0.5;
                probabilityOfFailure *= (1 - weight);
            });

            const confidenceScore = Math.min(0.99, 1 - probabilityOfFailure);

            groups.push({
                id: `group-${c1.id}`,
                customers: currentGroupCustomers,
                reasons: reasonArray,
                status: "pending",
                confidence_score: Number(confidenceScore.toFixed(4)),
            });
        }
    }

    return groups;
}
