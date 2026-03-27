// src/modules/financial-management/printables-management/product-printables/components/PrintablesTable.tsx
"use client";

import React from "react";
import type { ProductRow, PriceType, Unit } from "../types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Props = {
    rows: ProductRow[];
    loading: boolean;
    priceTypes: PriceType[];
    units: Unit[];
};

export default function PrintablesTable({ rows, loading, priceTypes, units }: Props) {
    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading products...</div>;
    if (rows.length === 0) return <div className="p-8 text-center text-muted-foreground">No products found.</div>;

    const unitMap = new Map(units.map(u => [Number(u.unit_id), u.unit_shortcut]));

    return (
        <div className="rounded-xl border border-border/50 overflow-hidden overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="font-semibold sticky left-0 bg-muted/30 z-10 min-w-[200px]">Product Name</TableHead>
                        <TableHead className="font-semibold">Code</TableHead>
                        <TableHead className="font-semibold">UOM</TableHead>
                        {priceTypes.slice(0, 5).map((pt, i) => (
                            <TableHead key={pt.price_type_id} className="font-semibold text-right">
                                {pt.price_type_name || `Price ${String.fromCharCode(65 + i)}`}
                            </TableHead>
                        ))}
                        <TableHead className="font-semibold text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.product_id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="font-medium sticky left-0 bg-background/50 backdrop-blur-sm z-10">{row.product_name}</TableCell>
                            <TableCell className="font-mono text-xs">{row.product_code || "—"}</TableCell>
                            <TableCell>{unitMap.get(Number(row.unit_of_measurement)) || row.unit_of_measurement || "—"}</TableCell>
                            <TableCell className="text-right">{row.priceA ? Number(row.priceA).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                            <TableCell className="text-right">{row.priceB ? Number(row.priceB).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                            <TableCell className="text-right">{row.priceC ? Number(row.priceC).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                            <TableCell className="text-right">{row.priceD ? Number(row.priceD).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                            <TableCell className="text-right">{row.priceE ? Number(row.priceE).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={row.isActive === 1 ? "default" : "secondary"} className="text-[10px] h-5">
                                    {row.isActive === 1 ? "Active" : "Inactive"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
