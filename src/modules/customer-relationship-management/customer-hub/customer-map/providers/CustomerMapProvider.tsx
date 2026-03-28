import React, { createContext, useContext, ReactNode } from "react";
import { useCustomerMap } from "../hooks/useCustomerMap";
import { CustomerMapFilter, CustomerMapRecord } from "../types/customer-map.schema";

interface CustomerMapContextType {
  data: CustomerMapRecord[];
  isLoading: boolean;
  error: string | null;
  filters: CustomerMapFilter;
  options: {
    clusters: string[];
    storeTypes: string[];
    classifications: string[];
    salesmen: string[];
  };
  updateFilters: (filters: CustomerMapFilter) => void;
  refreshMap: () => void;
}

const CustomerMapContext = createContext<CustomerMapContextType | undefined>(undefined);

export function CustomerMapProvider({ children }: { children: ReactNode }) {
  const mapState = useCustomerMap();

  return (
    <CustomerMapContext.Provider value={mapState}>
      {children}
    </CustomerMapContext.Provider>
  );
}

export function useCustomerMapContext() {
  const context = useContext(CustomerMapContext);
  if (context === undefined) {
    throw new Error("useCustomerMapContext must be used within a CustomerMapProvider");
  }
  return context;
}
