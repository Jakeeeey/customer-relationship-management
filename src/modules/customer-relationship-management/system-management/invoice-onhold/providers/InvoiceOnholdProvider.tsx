"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useInvoiceOnhold } from "../hooks/useInvoiceOnhold";
import { InvoiceOnholdData } from "../types/invoice-onhold.schema";

interface InvoiceOnholdContextValue {
  orders: InvoiceOnholdData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  putOnHold: (id: string | number) => Promise<void>;
  isPuttingOnHold: boolean;
}

const InvoiceOnholdContext = createContext<InvoiceOnholdContextValue | undefined>(undefined);

export function InvoiceOnholdProvider({ children }: { children: ReactNode }) {
  const hookState = useInvoiceOnhold();

  return (
    <InvoiceOnholdContext.Provider value={hookState}>
      {children}
    </InvoiceOnholdContext.Provider>
  );
}

export function useInvoiceOnholdContext() {
  const context = useContext(InvoiceOnholdContext);
  if (context === undefined) {
    throw new Error("useInvoiceOnholdContext must be used within a InvoiceOnholdProvider");
  }
  return context;
}
