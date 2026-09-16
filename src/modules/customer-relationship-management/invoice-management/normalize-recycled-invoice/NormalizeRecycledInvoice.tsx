"use client";

import React from "react";
import { NormalizeInvoiceTable } from "./components/NormalizeInvoiceTable";

export default function NormalizeRecycledInvoice() {
    return (
        <div className="p-2 sm:p-4 w-full flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Normalize Recycled Invoice</h1>
                <p className="text-sm text-gray-500 mt-1">
                    View unfulfilled recycled invoices and request normalization.
                </p>
            </div>
            
            <NormalizeInvoiceTable />
        </div>
    );
}
