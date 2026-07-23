"use client";

import { useEmployeeStockPurchaseSummary } from "../hooks/useEmployeeStockPurchaseSummary";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function SummaryDataTable() {
    const { rawData, isLoading } = useEmployeeStockPurchaseSummary();

    const getStatusBadge = (status: string) => {
        const lower = status.toLowerCase();
        if (lower === "pending") return <Badge variant="outline" className="text-yellow-600 bg-yellow-50">{status}</Badge>;
        if (lower === "approved" || lower === "completed") return <Badge variant="outline" className="text-green-600 bg-green-50">{status}</Badge>;
        if (lower === "rejected" || lower === "cancelled") return <Badge variant="destructive">{status}</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    };

    if (isLoading && rawData.length === 0) {
        return null;
    }

    return (
        <div className="px-4 mb-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Detailed Purchases List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Invoice No.</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rawData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No purchases found for the selected filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rawData.map((item) => (
                                        <TableRow key={item.purchase_id}>
                                            <TableCell className="whitespace-nowrap">
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>{item.company_name || 'N/A'}</TableCell>
                                            <TableCell className="font-medium">{item.employee_name || 'N/A'}</TableCell>
                                            <TableCell>{item.manual_invoice_no || item.invoice_id || 'N/A'}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
