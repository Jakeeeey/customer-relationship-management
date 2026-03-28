"use client";
import type { Supplier, Product } from "../hooks/useCallSheetForm";

interface PrintableTableProps {
    supplier: Supplier | null;
    products: Product[];
    loadingProducts: boolean;
    moAvgData?: Record<number, number>;
}

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PrintableTable({ supplier, products, loadingProducts, moAvgData = {} }: PrintableTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 25;

    if (!supplier) return null;

    const totalPages = Math.ceil(products.length / pageSize);
    const currentProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="rounded-md border bg-card text-card-foreground print:border-none print:bg-transparent">
            {/* PRINT ONLY: Supplier Name above table */}
            <div className="hidden print:block mb-2 font-semibold">
                Supplier: {supplier.supplier_name}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse print:text-[10px]">
                    <thead className="bg-muted/50 print:bg-transparent">
                        <tr className="print:border-b-2 print:border-black">
                            <th className="p-3 font-medium print:p-1 w-[40%]">PRODUCTS</th>
                            <th className="p-3 font-medium print:p-1 text-center border-l print:border-l-0">MO AVG</th>
                            <th className="p-0 font-medium border-l print:border-l-0">
                                <div className="border-b print:border-b-0 text-center p-1 h-[28px]"></div>
                                <div className="flex w-full">
                                    <div className="w-1/2 text-center p-1 border-r text-xs text-blue-600 print:text-black">Qty</div>
                                    <div className="w-1/2 text-center p-1 text-xs text-blue-600 print:text-black">Inv</div>
                                </div>
                            </th>
                            <th className="p-0 font-medium border-l print:border-black">
                                <div className="border-b print:border-b-0 text-center p-1 h-[28px]"></div>
                                <div className="flex w-full">
                                    <div className="w-1/2 text-center p-1 border-r text-xs text-blue-600 print:text-black">Qty</div>
                                    <div className="w-1/2 text-center p-1 text-xs text-blue-600 print:text-black">Inv</div>
                                </div>
                            </th>
                            <th className="p-0 font-medium border-l print:border-black">
                                <div className="border-b print:border-b-0 text-center p-1 h-[28px]"></div>
                                <div className="flex w-full">
                                    <div className="w-1/2 text-center p-1 border-r text-xs text-blue-600 print:text-black">Qty</div>
                                    <div className="w-1/2 text-center p-1 text-xs text-blue-600 print:text-black">Inv</div>
                                </div>
                            </th>
                            <th className="p-0 font-medium border-l print:border-black">
                                <div className="border-b print:border-b-0 text-center p-1 h-[28px]"></div>
                                <div className="flex w-full">
                                    <div className="w-1/2 text-center p-1 border-r text-xs text-blue-600 print:text-black">Qty</div>
                                    <div className="w-1/2 text-center p-1 text-xs text-blue-600 print:text-black">Inv</div>
                                </div>
                            </th>
                            <th className="p-3 font-medium print:p-1 text-center border-l print:border-black">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingProducts ? (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-muted-foreground">Loading products...</td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-muted-foreground">No products found for this supplier.</td>
                            </tr>
                        ) : (
                            currentProducts.map((p, i) => (
                                <tr key={p.product_id || i} className="border-t print:border-gray-300">
                                    <td className="p-3 print:p-1 max-w-[200px] truncate" title={p.display_name}>
                                        <div className="font-medium">{p.display_name || "Unnamed Product"}</div>
                                    </td>
                                    <td className="p-3 print:p-1 text-center border-l print:border-l-0">
                                        {(moAvgData[p.product_id] || 0).toFixed(2)}
                                    </td>
                                    <td className="p-0 border-l print:border-black">
                                        <div className="flex w-full h-full min-h-[40px]">
                                            <div className="w-1/2 border-r print:border-gray-300"></div>
                                            <div className="w-1/2"></div>
                                        </div>
                                    </td>
                                    <td className="p-0 border-l print:border-black">
                                        <div className="flex w-full h-full min-h-[40px]">
                                            <div className="w-1/2 border-r print:border-gray-300"></div>
                                            <div className="w-1/2"></div>
                                        </div>
                                    </td>
                                    <td className="p-0 border-l print:border-black">
                                        <div className="flex w-full h-full min-h-[40px]">
                                            <div className="w-1/2 border-r print:border-gray-300"></div>
                                            <div className="w-1/2"></div>
                                        </div>
                                    </td>
                                    <td className="p-0 border-l print:border-black">
                                        <div className="flex w-full h-full min-h-[40px]">
                                            <div className="w-1/2 border-r print:border-gray-300"></div>
                                            <div className="w-1/2"></div>
                                        </div>
                                    </td>
                                    <td className="p-3 print:p-1 border-l print:border-black"></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls - Hidden on Print */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t print:hidden">
                    <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, products.length)} of {products.length} entries
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
