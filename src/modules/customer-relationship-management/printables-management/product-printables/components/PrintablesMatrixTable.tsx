// src/modules/financial-management/printables-management/product-printables/components/PrintablesMatrixTable.tsx
"use client";

import React from "react";
import type { MatrixRow, PriceType, Unit } from "../types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
    rows: MatrixRow[];
    loading: boolean;
    priceTypes: PriceType[];
    units: Unit[];
    usedUnitIds: Set<number>;
    selectedPriceTypeIds?: string[];
};

export default function PrintablesMatrixTable({ 
    rows, 
    loading, 
    priceTypes, 
    units, 
    usedUnitIds,
    selectedPriceTypeIds = []
}: Props) {
    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading spreadsheet matrix...</div>;
    if (rows.length === 0) return <div className="p-8 text-center text-muted-foreground">No products found.</div>;

    const visibleUnits = units.filter(u => usedUnitIds.has(Number(u.unit_id)));
    
    // Filter price types based on selection
    const activePriceTypes = priceTypes.filter(pt => {
        if (selectedPriceTypeIds.length === 0) return pt.sort != null && pt.sort <= 5; // Default to first 5
        return selectedPriceTypeIds.includes(String(pt.price_type_id));
    });

    const totalMatrixCols = activePriceTypes.length * (visibleUnits.length || 1);

    // Defined colors for groups (matching spreadsheet aesthetic)
    const groupColors = [
        "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]", // List Price (Gray)
        "bg-[#EAF4FF] text-[#1E4D8C] border-[#B8D1F3]", // Group 1 (Blue)
        "bg-[#F0FFF4] text-[#1D5C2E] border-[#C6F6D5]", // Group 2 (Green)
        "bg-[#FFF9E6] text-[#8C6D1E] border-[#FCEFB4]", // Group 3 (Yellow)
        "bg-[#FFF5F5] text-[#8C1E1E] border-[#FED7D7]", // Group 4 (Red)
        "bg-[#F7F0FF] text-[#4D1E8C] border-[#E9D8FD]", // Group 5 (Purple)
    ];

    return (
        <div className="rounded-xl border border-[#D1D5DB] overflow-hidden overflow-x-auto shadow-md">
            <Table className="border-collapse border-hidden">
                <TableHeader className="bg-[#F9FAFB]">
                    {/* Level 1: Global Header */}
                    <TableRow className="border-b border-[#D1D5DB]">
                        <TableHead colSpan={3} className="border-r border-[#D1D5DB] sticky left-0 z-30 bg-[#F9FAFB]"></TableHead>
                        <TableHead 
                            colSpan={totalMatrixCols || 1} 
                            className="text-center font-bold text-[11px] uppercase tracking-[0.2em] text-[#4B5563] py-2 border-r border-[#D1D5DB]"
                        >
                            Price Type
                        </TableHead>
                    </TableRow>
                    
                    {/* Level 2: Price Tiers (Selected) */}
                    <TableRow className="border-b border-[#D1D5DB]">
                        <TableHead className="font-bold sticky left-0 z-30 bg-[#F9FAFB] border-r border-[#D1D5DB] min-w-[180px] text-[10px] uppercase text-[#374151]">Product Name</TableHead>
                        <TableHead className="font-bold sticky left-[180px] z-30 bg-[#F9FAFB] border-r border-[#D1D5DB] min-w-[120px] text-[10px] uppercase text-[#374151]">Category</TableHead>
                        <TableHead className="font-bold sticky left-[300px] z-30 bg-[#F9FAFB] border-r border-[#D1D5DB] min-w-[120px] text-[10px] uppercase text-[#374151]">Brand</TableHead>
                        {activePriceTypes.map((pt, i) => (
                            <TableHead 
                                key={pt.price_type_id} 
                                colSpan={visibleUnits.length || 1} 
                                className={cn(
                                    "text-center font-black text-xs border-r border-[#D1D5DB] py-1.5",
                                    groupColors[i % groupColors.length]
                                )}
                            >
                                {pt.price_type_name}
                            </TableHead>
                        ))}
                    </TableRow>

                    {/* Level 3: Units (BOX, PCS, etc.) */}
                    <TableRow className="border-b border-[#D1D5DB]">
                        <TableHead className="sticky left-0 z-30 bg-[#F9FAFB] border-r border-[#D1D5DB]"></TableHead>
                        <TableHead className="sticky left-[180px] z-30 bg-[#F9FAFB] border-r border-[#D1D5DB]"></TableHead>
                        <TableHead className="sticky left-[300px] z-30 bg-[#F9FAFB] border-r border-[#D1D5DB]"></TableHead>
                        {activePriceTypes.map((pt) => (
                            <React.Fragment key={pt.price_type_id}>
                                {visibleUnits.length > 0 ? visibleUnits.map((u) => (
                                    <TableHead 
                                        key={u.unit_id} 
                                        className="text-center font-bold text-[9px] uppercase text-[#6B7280] py-1 border-r border-[#E5E7EB] min-w-[70px]"
                                    >
                                        {u.unit_shortcut}
                                    </TableHead>
                                )) : (
                                    <TableHead className="min-w-[70px] border-r border-[#E5E7EB]">—</TableHead>
                                )}
                            </React.Fragment>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.group_id} className="hover:bg-[#F3F4F6] transition-colors border-b border-[#E5E7EB]">
                            <TableCell className="font-semibold sticky left-0 bg-white z-10 border-r border-[#D1D5DB] py-2 text-[11px] text-[#111827]">
                                {row.display.product_name}
                            </TableCell>
                            <TableCell className="sticky left-[180px] bg-white z-10 border-r border-[#D1D5DB] py-2 text-[10px] text-[#4B5563]">
                                {row.category_name}
                            </TableCell>
                            <TableCell className="sticky left-[300px] bg-white z-10 border-r border-[#D1D5DB] py-2 text-[10px] text-[#4B5563]">
                                {row.brand_name}
                            </TableCell>
                            {activePriceTypes.map((pt, i) => {
                                // If synthetic List Price (ID -1), use ListPrice key
                                // Otherwise, calculate its A-E mapping based on its position among non-synthetic price types
                                const nonSyntheticIndex = activePriceTypes.slice(0, i).filter(p => p.price_type_id !== -1).length;
                                const ptSuffix = pt.price_type_id === -1 ? "ListPrice" : (["A", "B", "C", "D", "E"][nonSyntheticIndex] || "A");
                                
                                return (
                                    <React.Fragment key={pt.price_type_id}>
                                        {visibleUnits.length > 0 ? visibleUnits.map((u) => {
                                            const variant = row.variantsByUnitId[Number(u.unit_id)];
                                            const price = (variant?.tiers as Record<string, number | null>)?.[ptSuffix];

                                            return (
                                                <TableCell 
                                                    key={u.unit_id} 
                                                    className={cn(
                                                        "text-right border-r border-[#E5E7EB] px-3 py-2 font-mono text-[10px]",
                                                        price == null ? "bg-[#F9FAFB]/50" : ""
                                                    )}
                                                >
                                                    {price != null ? (
                                                        <span className="font-bold text-[#374151]">
                                                            {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[#D1D5DB]">—</span>
                                                    )}
                                                </TableCell>
                                            );
                                        }) : (
                                            <TableCell className="border-r border-[#E5E7EB] bg-[#F9FAFB]/50">—</TableCell>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
