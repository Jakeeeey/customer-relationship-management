"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllocationWorkspace } from "../hooks/useAllocationWorkspace";
import { allocationProvider } from "../providers/allocationProvider";
import type { AllocationOrder, ReportedInventory } from "../types";

export default function OrderQueue() {
    const workspace = useAllocationWorkspace();
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const snapshot = workspace.snapshot;
    const selected = snapshot?.orders.find(order => order.id === selectedId) || null;
    const orders = useMemo(() => (snapshot?.orders || []).filter(order => `${order.number} ${order.customer} ${order.customerCode} ${order.salesman}`.toLowerCase().includes(query.toLowerCase())), [snapshot, query]);
    return <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-black tracking-tight">Sales Order Allocation</h1><p className="mt-1 text-sm text-muted-foreground">Review Draft orders from all salesmen for the selected warehouse.</p></div><Button variant="outline" disabled={!workspace.warehouseId || workspace.loading} onClick={() => { setSelectedId(null); workspace.refresh(); }}><RefreshCw className={`mr-2 h-4 w-4 ${workspace.loading ? "animate-spin" : ""}`} />Refresh</Button></div>
        <div className="flex flex-wrap items-end gap-4 rounded-xl border p-4"><div className="w-full max-w-sm space-y-2"><label className="text-sm font-medium" htmlFor="queue-warehouse">Warehouse</label><Select value={workspace.warehouseId === null ? "" : String(workspace.warehouseId)} disabled={!workspace.context || workspace.loading} onValueChange={value => { setSelectedId(null); workspace.changeWarehouse(value === "all" ? "all" : Number(value)); }}><SelectTrigger id="queue-warehouse"><SelectValue placeholder="Choose a warehouse" /></SelectTrigger><SelectContent><SelectItem value="all">All warehouses</SelectItem>{workspace.context?.warehouses.map(warehouse => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name}</SelectItem>)}</SelectContent></Select></div><div className="w-full max-w-sm space-y-2"><label className="text-sm font-medium" htmlFor="queue-search">Search orders or customers</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="queue-search" className="pl-9" placeholder="Order number, customer…" value={query} onChange={event => setQuery(event.target.value)} /></div></div></div>
        {workspace.error && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{workspace.error}</div>}
        {workspace.loading && <p role="status" className="text-sm text-muted-foreground">Loading orders…</p>}
        {snapshot && <>
            <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Orders awaiting allocation</h2><p className="text-sm text-muted-foreground">{orders.length} open order{orders.length === 1 ? "" : "s"} from all salesmen · allocation is manual</p></div></div>
        <div className="rounded-xl border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Sales order / customer</TableHead><TableHead>Salesman</TableHead><TableHead>Warehouse</TableHead><TableHead>Destination</TableHead><TableHead>Order date</TableHead><TableHead>Items</TableHead><TableHead>Allocation status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{orders.map(order => <TableRow key={order.id}><TableCell><p className="font-semibold">{order.number}</p><p className="text-xs text-muted-foreground">{order.customer} · {order.customerCode}</p></TableCell><TableCell>{order.salesman}</TableCell><TableCell>{workspace.context?.warehouses.find(warehouse => warehouse.id === order.warehouseId)?.name || `Warehouse ${order.warehouseId}`}</TableCell><TableCell>{order.destination}</TableCell><TableCell>{order.orderDate.slice(0, 10)}</TableCell><TableCell>{order.lines.length}</TableCell><TableCell><Badge variant="secondary">{order.workflow} · blocked</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setSelectedId(order.id)}>Review order</Button></TableCell></TableRow>)}{!orders.length && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">{snapshot.orders.length ? "No orders match your search." : "No open orders in the selected warehouse scope."}</TableCell></TableRow>}</TableBody></Table></div></div>
            </section>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Allocation is planning-only</p><p className="mt-1">Manual plans are not saved or reserved. Confirmation requires an authoritative inventory reservation service.</p></div>
        </>}
        <OrderDetails order={selected} inventory={snapshot?.inventory || []} onClose={() => setSelectedId(null)} />
    </div>;
}

function OrderDetails({ order, inventory, onClose }: { order: AllocationOrder | null; inventory: ReportedInventory[]; onClose: () => void }) {
    const [checking, setChecking] = useState(false);
    const [proposalMessage, setProposalMessage] = useState("");
    async function refreshProposal() {
        if (!order) return;
        setChecking(true);
        setProposalMessage("");
        try { await allocationProvider.preview(order.warehouseId, [order.id]); }
        catch (error) { setProposalMessage(error instanceof Error ? error.message : "A verified proposal is unavailable."); }
        finally { setChecking(false); }
    }
    return <Dialog open={Boolean(order)} onOpenChange={open => { if (!open) { setProposalMessage(""); onClose(); } }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>Review order · {order?.number}</DialogTitle><DialogDescription>{order?.customer} · {order?.salesman} · {order?.workflow}</DialogDescription></DialogHeader>{order && <div className="space-y-5">
        <div className="flex flex-wrap gap-2"><Badge variant="outline">Warehouse {order.warehouseId}</Badge><Badge variant="secondary">Manual planning</Badge><Badge variant="secondary">Proposal unavailable</Badge></div>
        {order.workflow.toLowerCase() === "draft" && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">This order is saved as Draft. It is shown here for manual allocation planning.</div>}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Available stock cannot be verified for this order’s products. Allocation confirmation is unavailable.</div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Order lines</p><p className="font-semibold">{order.lines.length}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Coverage status</p><p className="font-semibold">Unavailable until reservations are verified</p></div></div>
        <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Unit</TableHead><TableHead>Ordered</TableHead><TableHead>Previously allocated</TableHead><TableHead>Available to allocate</TableHead><TableHead>Proposed</TableHead><TableHead>Shortage</TableHead></TableRow></TableHeader><TableBody>{order.lines.map(line => {
            const matches = inventory.filter(row => row.productId === line.productId && row.supplierId === order.supplierId && row.unit === line.unit);
            const reported = matches.length === 1 && !matches[0].ambiguous ? matches[0].reportedStock : null;
            return <TableRow key={line.id}><TableCell><p className="font-medium">{line.product}</p><p className="text-xs text-muted-foreground">{line.sku}</p></TableCell><TableCell>{line.unit}</TableCell><TableCell>{line.ordered}</TableCell><TableCell>{line.legacyAllocated}</TableCell><TableCell>{reported === null ? "Unverified" : `${reported} reported · ATP unverified`}</TableCell><TableCell>Unavailable</TableCell><TableCell>Unverified</TableCell></TableRow>;
        })}{!order.lines.length && <TableRow><TableCell colSpan={7} className="py-8 text-center">No order lines found.</TableCell></TableRow>}</TableBody></Table></div>
        {proposalMessage && <p role="alert" className="whitespace-pre-line rounded-lg border p-3 text-sm text-amber-900">{proposalMessage}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={checking} onClick={refreshProposal}><RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />{checking ? "Checking…" : "Refresh proposal"}</Button><Button disabled title="Requires authoritative stock reservation transaction">Confirm allocation</Button></div>
        <p className="text-xs text-muted-foreground">Order quantities and prices are unchanged. This order has no persisted allocation timestamp or verified reservation data; no allocation has been made.</p>
    </div>}</DialogContent></Dialog>;
}
