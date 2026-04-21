"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CustomerWithRelations, Customer, BankAccount, CustomersAPIResponse, ReferenceItem } from "../types";

interface UseCustomersReturn {
    customers: CustomerWithRelations[];
    bankAccounts: BankAccount[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    metadata: CustomersAPIResponse['metadata'];
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
    storeTypeFilter: string;      // 🚀 Added
    classificationFilter: string; // 🚀 Added
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (status: string) => void;
    setStoreTypeFilter: (type: string) => void;         // 🚀 Added
    setClassificationFilter: (classification: string) => void; // 🚀 Added
    userMapping: Record<number, string>;
    refetch: () => Promise<void>;
    createCustomer: (data: Partial<Customer>) => Promise<void>;
    updateCustomer: (id: number, data: Partial<Customer>) => Promise<void>;
}

export function useCustomers(): UseCustomersReturn {
    const [allCustomers, setAllCustomers] = useState<CustomerWithRelations[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [userMapping, setUserMapping] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [metadata, setMetadata] = useState<CustomersAPIResponse['metadata']>({
        total_count: 0,
        page: 1,
        pageSize: 10,
        lastUpdated: new Date().toISOString(),
    });

    // Pagination & Filter State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [storeTypeFilter, setStoreTypeFilter] = useState("all");       // 🚀 Added
    const [classificationFilter, setClassificationFilter] = useState("all"); // 🚀 Added

    const hasLoadedRef = useRef(false);

    const fetchData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading || !hasLoadedRef.current) {
                setIsLoading(true);
            }

            setIsError(false);
            setError(null);

            // 🚀 Wire up ALL filters to the API Request
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                q: searchQuery,
                status: statusFilter,
                storeType: storeTypeFilter,           // 🚀 Passed to Backend
                classification: classificationFilter, // 🚀 Passed to Backend
                t: Date.now().toString()
            });

            // Parallel fetch for customers and user mapping if not loaded
            const [customerRes, userRes] = await Promise.all([
                fetch(`/api/crm/customer?${params.toString()}`, { cache: "no-store" }),
                fetch("/api/crm/customer/references?type=user", { cache: "no-store" })
            ]);

            if (!customerRes.ok) {
                throw new Error(`API error: ${customerRes.status}`);
            }

            const data: CustomersAPIResponse = await customerRes.json();
            setAllCustomers(data.customers || []);
            setBankAccounts(data.bank_accounts || []);
            setMetadata(data.metadata);

            if (userRes.ok) {
                const userData = await userRes.json();
                const mapping: Record<number, string> = {};
                (userData.data || []).forEach((u: ReferenceItem) => {
                    const fullName = [u.user_fname, u.user_mname, u.user_lname].filter(Boolean).join(" ");
                    const uid = u.id || u.user_id;
                    if (uid) {
                        mapping[uid] = fullName || `User #${uid}`;
                    }
                });
                setUserMapping(mapping);
            }

            hasLoadedRef.current = true;

        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Customer fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, searchQuery, statusFilter, storeTypeFilter, classificationFilter]); // 🚀 Added to dependency array

    // 🚀 Reset to page 1 when any filter changes
    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, storeTypeFilter, classificationFilter]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // Handle window focus to keep data fresh (pattern from HRM)
    useEffect(() => {
        const handleFocus = () => fetchData(false);
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchData]);

    const createCustomer = useCallback(async (data: Partial<CustomerWithRelations>) => {
        try {
            const { bank_accounts, ...customerData } = data;
            const res = await fetch("/api/crm/customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(customerData),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            const newCustomerResponse = await res.json();
            const customerId = newCustomerResponse.id;

            if (!customerId) throw new Error("Failed to get customer ID after creation");

            // Save bank accounts if any
            if (bank_accounts && bank_accounts.length > 0) {
                await Promise.all(bank_accounts.map(async (account) => {
                    // Strip ID and metadata for new records to prevent Directus errors
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, created_at, updated_at, ...cleanedAccount } = account as BankAccount;
                    const baRes = await fetch("/api/crm/customer/bank-account", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...cleanedAccount, customer_id: customerId })
                    });
                    if (!baRes.ok) {
                        const errTxt = await baRes.text().catch(() => baRes.statusText);
                        throw new Error(`Failed to save bank account: ${errTxt}`);
                    }
                    return baRes.json();
                }));
            }

            await fetchData(true);
        } catch (err) {
            console.error('Create customer error:', err);
            throw err;
        }
    }, [fetchData]);

    const updateCustomer = useCallback(async (id: number, data: Partial<CustomerWithRelations>) => {
        try {
            const { bank_accounts: newAccounts, ...customerData } = data;

            // 1. Update primary customer data
            const res = await fetch("/api/crm/customer", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...customerData }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            // 2. Sync bank accounts if provided
            if (newAccounts) {
                // Get current accounts for this customer to find deletions
                const currentRes = await fetch(`/api/crm/customer/bank-account?customer_id=${id}`);
                const oldAccounts: BankAccount[] = currentRes.ok ? await currentRes.json() : [];

                // Identify Deletions
                const toDelete = oldAccounts.filter(old => !newAccounts.some(n => n.id === old.id));

                // Identify POST (new) and PATCH (existing)
                const toPost = newAccounts.filter(n => {
                    const isNew = !n.id || n.id === 0;
                    // If it's "new" but its account number already exists in the DB for this customer, it's not actually a POST
                    const alreadyExists = oldAccounts.some(old => old.account_number === n.account_number);
                    return isNew && !alreadyExists;
                });

                const toPatch = newAccounts.filter(n => {
                    const hasId = n.id && n.id !== 0;
                    const matchesOld = oldAccounts.some(old => old.account_number === n.account_number);
                    return hasId || matchesOld;
                }).map(n => {
                    // If it has no ID but matched an old account by number, attach the ID for patching
                    if (!n.id || n.id === 0) {
                        const oldMatch = oldAccounts.find(old => old.account_number === n.account_number);
                        return { ...n, id: oldMatch?.id };
                    }
                    return n;
                });

                // 3. Process Synchronization Sequentially
                // We use sequential processing instead of Promise.all to avoid 
                // overwhelming the network connection and hitting socket limits
                
                // DELETIONS
                for (const acc of toDelete) {
                    const delRes = await fetch(`/api/crm/customer/bank-account?id=${acc.id}`, { method: "DELETE", cache: "no-store" });
                    if (!delRes.ok) throw new Error(`Failed to delete bank account: ${delRes.statusText}`);
                }

                // CREATIONS
                for (const acc of toPost) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id: _id, created_at, updated_at, ...cleanedAccount } = acc as BankAccount;
                    const postRes = await fetch("/api/crm/customer/bank-account", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...cleanedAccount, customer_id: id })
                    });
                    if (!postRes.ok) {
                        const errTxt = await postRes.text().catch(() => postRes.statusText);
                        throw new Error(`Failed to create bank account: ${errTxt}`);
                    }
                }

                // UPDATES
                for (const acc of toPatch) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { created_at, updated_at, ...cleanedAccount } = acc as BankAccount;
                    const patchRes = await fetch("/api/crm/customer/bank-account", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(cleanedAccount)
                    });
                    if (!patchRes.ok) {
                        const errTxt = await patchRes.text().catch(() => patchRes.statusText);
                        throw new Error(`Failed to update bank account: ${errTxt}`);
                    }
                }
            }

            await fetchData(true);
        } catch (err) {
            console.error('Update customer error:', err);
            throw err;
        }
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        customers: allCustomers,
        bankAccounts,
        userMapping,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        storeTypeFilter,        // 🚀 Returned
        classificationFilter,   // 🚀 Returned
        setPage,
        setPageSize,
        setSearchQuery,
        setStatusFilter,
        setStoreTypeFilter,     // 🚀 Returned
        setClassificationFilter,// 🚀 Returned
        refetch,
        createCustomer,
        updateCustomer,
    };
}