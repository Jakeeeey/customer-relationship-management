import { create } from 'zustand';

interface SiteSalesStore {
    search: string;
    customer: string;
    salesman: string;
    dateFrom: string;
    dateTo: string;
    isDispatched: boolean;
    isPaid: boolean;
    
    setSearch: (val: string) => void;
    setCustomer: (val: string) => void;
    setSalesman: (val: string) => void;
    setDateFrom: (val: string) => void;
    setDateTo: (val: string) => void;
    setIsDispatched: (val: boolean) => void;
    setIsPaid: (val: boolean) => void;
    
    reset: () => void;
}

export const useSiteSalesStore = create<SiteSalesStore>((set) => ({
    search: "",
    customer: "all",
    salesman: "all",
    dateFrom: "",
    dateTo: "",
    isDispatched: false,
    isPaid: false,
    
    setSearch: (search) => set({ search }),
    setCustomer: (customer) => set({ customer }),
    setSalesman: (salesman) => set({ salesman }),
    setDateFrom: (dateFrom) => set({ dateFrom }),
    setDateTo: (dateTo) => set({ dateTo }),
    setIsDispatched: (isDispatched) => set({ isDispatched }),
    setIsPaid: (isPaid) => set({ isPaid }),
    
    reset: () => set({
        search: "",
        customer: "all",
        salesman: "all",
        dateFrom: "",
        dateTo: "",
        isDispatched: false,
        isPaid: false,
    })
}));
