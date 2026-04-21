import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Customer, GroupingOptions } from "../types";
import { identifyDuplicateGroups } from "../utils/grouping-logic";
import { toast } from "sonner";

export function useDuplicateCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [options, setOptions] = useState<GroupingOptions>({
        fuzzyThreshold: 0.85,
        checkFuzzyNames: true,
        checkIdentifiers: true,
        checkLocations: true,
    });

    const hasLoadedRef = useRef(false);
    
    // Persistent Dismissal Registry (Database-backed)
    const [resolvedRecords, setResolvedRecords] = useState<{customer_id: number, group_id: string}[]>([]);

    // Load resolved records from database on mount
    const fetchResolutions = useCallback(async () => {
        try {
            const res = await fetch("/api/crm/customer/duplicate");
            if (res.ok) {
                const data = await res.json();
                setResolvedRecords(data || []);
            }
        } catch (e) {
            console.error("Failed to fetch resolutions:", e);
        }
    }, []);

    useEffect(() => {
        fetchResolutions();
    }, [fetchResolutions]);

    const fetchData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading || !hasLoadedRef.current) {
                setIsLoading(true);
            }
            setIsError(false);
            setError(null);

            // Fetch using the new specialized scan endpoint to avoid CORS and performance issues
            const params = new URLSearchParams({
                limit: "1000",
                t: Date.now().toString()
            });

            const res = await fetch(`/api/crm/customer/scan?${params.toString()}`, { 
                cache: "no-store"
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data = await res.json();
            // Match the structure from our new /api/crm/customer/scan endpoint
            setCustomers(data.customers || []);
            hasLoadedRef.current = true;
            
            if (showLoading) {
                toast.success("Scan complete. Groups refreshed.");
            }
        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            toast.error("Failed to fetch customer data for scan.");
            console.error("Duplicate Detection Fetch Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const duplicateGroups = useMemo(() => {
        const rawGroups = identifyDuplicateGroups(customers, options);
        
        if (resolvedRecords.length === 0) return rawGroups;

        // Group the resolved IDs by their group_id for efficient lookup
        // Use numbers consistently for comparison
        const dbGroups = resolvedRecords.reduce((acc, rec) => {
            if (!acc[rec.group_id]) acc[rec.group_id] = new Set<number>();
            acc[rec.group_id].add(Number(rec.customer_id));
            return acc;
        }, {} as Record<string, Set<number>>);

        return rawGroups.filter(potentialGroup => {
            const potentialIds = potentialGroup.customers.map(c => Number(c.id));
            
            // A potential group is hidden if ANY dismissed pair exists within it
            // We iterate through every possible pair in the potential group
            for (const dbSet of Object.values(dbGroups)) {
                // If the DB group contains at least 2 members...
                if (dbSet.size >= 2) {
                    // Check how many members of the potential group are in this specific DB dismissal group
                    const intersection = potentialIds.filter(id => dbSet.has(id));
                    
                    // IF the intersection contains at least 2 people, it means this specific pair/set
                    // was previously dismissed as "not duplicates".
                    if (intersection.length >= 2) {
                        return false; // Hide this group
                    }
                }
            }
            return true;
        });
    }, [customers, options, resolvedRecords]);

    const handleResolve = async (groupId: string, action: 'merge' | 'dismiss' | 'delete') => {
        if (action === 'dismiss') {
            const group = duplicateGroups.find(g => g.id === groupId);
            if (group) {
                try {
                    const res = await fetch("/api/crm/customer/duplicate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            customerIds: group.customers.map(c => c.id),
                            reasons: group.reasons,
                            status: "dismissed"
                        })
                    });

                    if (!res.ok) throw new Error("Failed to save to database");

                    toast.success("Resolution saved to database.");
                    // Refresh resolutions list to update UI
                    fetchResolutions();
                } catch (e) {
                    console.error("Save Error:", e);
                    toast.error("Failed to save resolution to database.");
                }
            }
            return;
        }

        toast.info(`Action "${action}" triggered for group ${groupId}.`);
    };

    const refreshScan = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    return {
        customers,
        duplicateGroups,
        isLoading,
        isError,
        error,
        options,
        setOptions,
        handleResolve,
        refreshScan
    };
}
