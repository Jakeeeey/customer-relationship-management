"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

import type { SalesOrder } from "../hooks/useSalesOrderApproval";

interface ApprovalTableProps {
    orders: SalesOrder[];
    loading: boolean;
    onApprove: (id: string | number) => void;
    onReject: (id: string | number) => void;
}

export function ApprovalTable({ orders, loading, onApprove, onReject }: ApprovalTableProps) {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-48 border rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex justify-center items-center h-48 border rounded-md text-muted-foreground whitespace-break-spaces">
                {"No pending sales orders found to approve."}
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-center w-[200px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                        <TableRow key={order.order_id}>
                            <TableCell className="font-medium">{order.order_id}</TableCell>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">₱{order.total_amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                                <div className="flex gap-2 justify-center">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 h-8"
                                        onClick={() => onApprove(order.order_id)}
                                    >
                                        <Check className="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-8"
                                        onClick={() => onReject(order.order_id)}
                                    >
                                        <X className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
