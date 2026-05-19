"use client";

import { useEffect } from "react";
import { useDealerInvoiceStore } from "@/modules/customer-relationship-management/site-sales-management/dealer-sales-invoice/store";

export default function DealerSalesInvoiceLayout({ children }: { children: React.ReactNode }) {
    const reset = useDealerInvoiceStore((state) => state.reset);
    
    useEffect(() => {
        // When this layout unmounts (meaning the user left the dealer-sales-invoice module),
        // we reset the filters so they don't persist on their next visit.
        return () => {
            reset();
        };
    }, [reset]);

    return <>{children}</>;
}
