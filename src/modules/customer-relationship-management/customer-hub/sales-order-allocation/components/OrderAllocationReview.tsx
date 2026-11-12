"use client";
import { useState } from "react";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allocationProvider } from "../providers/allocationProvider";
import { ReadTable } from "./ReadTable";
import type { AllocationOrder, ReportedInventory } from "../types";

export function OrderAllocationReview({ order, inventory, onClose }: { order: AllocationOrder | null; inventory: ReportedInventory[]; onClose: () => void }) {
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState("");
    async function preview() {
        if (!order) return;
        setChecking(true);
        setMessage("");
        try {
            await allocationProvider.preview(order.warehouseId, [order.id]);
            setMessage("Automatic proposals are not supported. No stock was reserved.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Proposal unavailable"); }
        finally { setChecking(false); }
    }
    return <Dialog open={!!order} onOpenChange={open => { if (!open) { setMessage(""); onClose(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
            <DialogHeader><DialogTitle className="text-xl font-black">Allocation review · {order?.number}</DialogTitle><DialogDescription>{order?.customer} · Workflow: {order?.workflow}. Original prices and quantities are read-only.</DialogDescription></DialogHeader>
            {order && <>
                <div className="flex flex-wrap gap-2"><Badge variant="outline">Manual plan / not reserved</Badge><Badge variant="secondary">{order.allocationState}</Badge></div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" />Existing allocation values are legacy summaries; their reservation ownership is not verified.</div>
                <ReadTable columns={["Product / SKU", "UOM", "Ordered", "Previously allocated", "Reported stock", "Proposed", "After confirmation", "Shortage", "Original net"]} empty="No order details." rows={order.lines.map(line => {
                    const matches = inventory.filter(row => row.productId === line.productId && row.supplierId === order.supplierId);
                    const stock = matches.length === 1 && !matches[0].ambiguous ? matches[0].reportedStock : null;
                    return [<div key={line.id} className="min-w-36 font-medium">{line.product}<div className="text-xs text-muted-foreground">{line.sku}</div></div>, line.unit, line.ordered, line.legacyAllocated, stock ?? "Unknown", "Unavailable", "Unchanged", "Unverified", line.orderedNet];
                })} />
                <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm"><p className="font-bold">Required before confirmation</p><ul className="list-disc space-y-1 pl-5 text-muted-foreground">{order.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul></div>
                {message && <p role="alert" className="whitespace-pre-line rounded-lg border p-3 text-sm text-amber-800">{message}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={preview} disabled={checking}>{checking ? "Checking…" : "Check proposal readiness"}</Button>
                    <Button disabled title="Requires an authoritative transaction, proposal/version check and durable idempotency"><LockKeyhole className="mr-2 h-4 w-4" />Confirm allocation unavailable</Button>
                </div>
            </>}
        </DialogContent>
    </Dialog>;
}
