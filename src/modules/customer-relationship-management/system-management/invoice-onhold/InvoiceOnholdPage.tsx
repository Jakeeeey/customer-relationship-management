"use client";

import React from "react";
import { InvoiceOnholdProvider } from "./providers/InvoiceOnholdProvider";
import { InvoiceOnholdDataTable } from "./components/data-table/InvoiceOnholdDataTable";

export default function InvoiceOnholdPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice Onhold</h1>
        <p className="text-muted-foreground">
          Manage sales orders that are waiting to be invoiced and place them on hold if necessary.
        </p>
      </div>

      <InvoiceOnholdProvider>
        <InvoiceOnholdDataTable />
      </InvoiceOnholdProvider>
    </div>
  );
}
