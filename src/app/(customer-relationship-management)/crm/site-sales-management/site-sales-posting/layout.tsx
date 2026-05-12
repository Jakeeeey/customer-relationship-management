"use client";

import { useEffect } from "react";
import { useSiteSalesStore } from "@/modules/customer-relationship-management/site-sales-management/site-sales-posting/store";

export default function SiteSalesPostingLayout({ children }: { children: React.ReactNode }) {
    const reset = useSiteSalesStore((state) => state.reset);
    
    useEffect(() => {
        // When this layout unmounts (meaning the user left the site-sales-posting module),
        // we reset the filters so they don't persist on their next visit.
        return () => {
            reset();
        };
    }, [reset]);

    return <>{children}</>;
}
