//src/modules/business-intelligence-analytics/sales-report/components/SalesInvoicesTable.tsx
"use client";

import * as React from "react";
import type { SalesInvoiceRow } from "../types";
import { formatNumber } from "../utils/format";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function InvoicesTableSkeletonRows(props: { rows?: number }) {
  const rows = props.rows ?? 6;

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`inv-sk-${i}`} className="whitespace-nowrap">
          <TableCell className="border-r border-border">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[320px]" />
              <Skeleton className="h-3 w-50" />
            </div>
          </TableCell>

          <TableCell className="border-r border-border">
            <Skeleton className="h-4 w-35" />
          </TableCell>

          <TableCell className="border-r border-border">
            <Skeleton className="h-4 w-40" />
          </TableCell>

          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-37.5" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function SalesInvoicesTable(props: { rows: SalesInvoiceRow[]; loading?: boolean }) {
  const { rows, loading } = props;

  return (
    <Card className="border-muted">
      <CardContent className="p-0">
        <div className="px-4 pt-4 pb-2">
          <div className="text-base font-semibold">Invoices</div>
          <div className="text-sm text-muted-foreground">
            Customer, PO Date, Sales Invoice Date, Net Amount (SI - SR)
          </div>
        </div>

        {/* ✅ Hard boundary so PAGE won't horizontally scroll */}
        <div className="w-full min-w-0 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="whitespace-nowrap">
                    <TableHead className="min-w-105 border-r border-border">CUSTOMER</TableHead>
                    <TableHead className="min-w-40 border-r border-border">PO DATE</TableHead>
                    <TableHead className="min-w-45 border-r border-border">
                      SALES INVOICE DATE
                    </TableHead>
                    <TableHead className="min-w-50 text-right">NET AMOUNT (SI - SR)</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <InvoicesTableSkeletonRows rows={7} />
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No content in table
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r, idx) => (
                      <TableRow key={idx} className="whitespace-nowrap">
                        <TableCell className="font-medium border-r border-border">{r.customer}</TableCell>
                        <TableCell className="text-muted-foreground border-r border-border">
                          {r.po_date}
                        </TableCell>
                        <TableCell className="text-muted-foreground border-r border-border">
                          {r.si_date}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(r.net_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ✅ shadcn horizontal scrollbar */}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
