//src/modules/business-intelligence-analytics/sales-report/components/SalesReportTable.tsx
"use client";

import * as React from "react";
import type { SalesReportRow } from "../types";
import { formatNumber } from "../utils/format";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function ReportTableSkeletonRows(props: { rows?: number }) {
  const rows = props.rows ?? 6;

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`sk-${i}`} className="whitespace-nowrap">
          <TableCell className="border-r border-border">
            <div className="space-y-2">
              <Skeleton className="h-4 w-45" />
              <Skeleton className="h-3 w-30" />
            </div>
          </TableCell>

          <TableCell className="border-r border-border">
            <Skeleton className="h-4 w-65" />
          </TableCell>

          {/* FREQ 1 */}
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-27.5" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-35" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-27.5" />
          </TableCell>
          <TableCell className="border-r border-border">
            <Skeleton className="h-4 w-35" />
          </TableCell>

          {/* FREQ 2 */}
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-27.5" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-35" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-27.5" />
          </TableCell>
          <TableCell className="border-r border-border">
            <Skeleton className="h-4 w-35" />
          </TableCell>

          {/* TOTAL */}
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-30" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// Treat these values as "no classification"
function hasClassification(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  const lowered = s.toLowerCase();
  return lowered !== "-" && lowered !== "—" && lowered !== "n/a" && lowered !== "na" && lowered !== "none";
}

export function SalesReportTable(props: { rows: SalesReportRow[]; loading?: boolean }) {
  const { rows, loading } = props;

  // ✅ Prioritize rows that have classification (stable order within each group)
  const sortedRows = React.useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => {
      const aHas = hasClassification((a as Record<string, unknown>).classification);
      const bHas = hasClassification((b as Record<string, unknown>).classification);
      if (aHas === bHas) return 0; // keep original relative order (stable in modern JS engines)
      return aHas ? -1 : 1; // classified first
    });
  }, [rows]);

  return (
    <Card className="border-muted">
      <CardContent className="p-0">
        <div className="w-full min-w-0 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="whitespace-nowrap">
                    <TableHead rowSpan={2} className="min-w-50 align-middle border-r border-border">
                      CLASSIFICATION
                    </TableHead>
                    <TableHead rowSpan={2} className="min-w-[320px] align-middle border-r border-border">
                      CUSTOMER NAME
                    </TableHead>

                    <TableHead colSpan={4} className="text-center border-r border-border">
                      FREQ 1 ( 1 - 15 )
                    </TableHead>
                    <TableHead colSpan={4} className="text-center border-r border-border">
                      FREQ 2 ( 16 - END )
                    </TableHead>

                    <TableHead rowSpan={2} className="min-w-35 text-right align-middle">
                      TOTAL (SI)
                    </TableHead>
                  </TableRow>

                  <TableRow className="whitespace-nowrap">
                    <TableHead className="text-right min-w-35">Allocated (SO)</TableHead>
                    <TableHead className="min-w-35">SO Date</TableHead>
                    <TableHead className="text-right min-w-35">Net Sales (SI)</TableHead>
                    <TableHead className="min-w-35 border-r border-border">SI Date</TableHead>

                    <TableHead className="text-right min-w-35">Allocated (SO)</TableHead>
                    <TableHead className="min-w-35">SO Date</TableHead>
                    <TableHead className="text-right min-w-35">Net Sales (SI)</TableHead>
                    <TableHead className="min-w-35 border-r border-border">SI Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <ReportTableSkeletonRows rows={7} />
                  ) : sortedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        No content in table
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRows.map((r, idx) => {
                      const rc = r as Record<string, unknown>;
                      return (
                      <TableRow key={idx} className="whitespace-nowrap">
                        <TableCell className="font-medium border-r border-border">
                          {hasClassification(rc.classification) ? (rc.classification as string) : "—"}
                        </TableCell>
                        <TableCell className="font-medium border-r border-border">{r.customer_name}</TableCell>

                        <TableCell className="text-right">{formatNumber(r.so_1_15)}</TableCell>
                        <TableCell className="text-muted-foreground">{r.so_1_15_date}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.si_1_15)}</TableCell>
                        <TableCell className="text-muted-foreground border-r border-border">{r.si_1_15_date}</TableCell>

                        <TableCell className="text-right">{formatNumber(r.so_16_eom)}</TableCell>
                        <TableCell className="text-muted-foreground">{r.so_16_eom_date}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.si_16_eom)}</TableCell>
                        <TableCell className="text-muted-foreground border-r border-border">{r.si_16_eom_date}</TableCell>

                        <TableCell className="text-right font-semibold">{formatNumber(r.total_si)}</TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
