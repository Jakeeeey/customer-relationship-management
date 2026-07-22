"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useEmployeeStockPurchase } from "../hooks/useEmployeeStockPurchase";

type EmployeeStockPurchaseContextType = ReturnType<typeof useEmployeeStockPurchase>;

const EmployeeStockPurchaseContext = createContext<EmployeeStockPurchaseContextType | undefined>(undefined);

export function EmployeeStockPurchaseProvider({ children }: { children: ReactNode }) {
    const stockPurchase = useEmployeeStockPurchase();

    return (
        <EmployeeStockPurchaseContext.Provider value={stockPurchase}>
            {children}
        </EmployeeStockPurchaseContext.Provider>
    );
}

export function useEmployeeStockPurchaseContext() {
    const context = useContext(EmployeeStockPurchaseContext);
    if (context === undefined) {
        throw new Error("useEmployeeStockPurchaseContext must be used within an EmployeeStockPurchaseProvider");
    }
    return context;
}
