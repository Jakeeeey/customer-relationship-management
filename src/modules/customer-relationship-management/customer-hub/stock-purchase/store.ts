"use client";

import { create } from 'zustand';

interface StockPurchaseStore {
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

const getLocalDateStr = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

const getTodayStr = () => getLocalDateStr(new Date());

const getThirtyDaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateStr(d);
};

export const useStockPurchaseStore = create<StockPurchaseStore>((set) => ({
    search: "",
    customer: "all",
    salesman: "all",
    dateFrom: getThirtyDaysAgoStr(),
    dateTo: getTodayStr(),
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
        dateFrom: getThirtyDaysAgoStr(),
        dateTo: getTodayStr(),
        isDispatched: false,
        isPaid: false,
    })
}));
