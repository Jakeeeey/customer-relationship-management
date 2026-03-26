"use client";

import React from "react";
import SalesOrderDraftModule from "@/modules/customer-relationship-management/customer-hub/sales-order-draft/SalesOrderDraftModule";

export default function SalesOrderDraftPage() {
    return (
        <div className="flex h-full w-full flex-col">
            {/* ✅ Only content scrolls inside RIGHT column */}
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4">
                <SalesOrderDraftModule />
            </main>
        </div>
    );
}
