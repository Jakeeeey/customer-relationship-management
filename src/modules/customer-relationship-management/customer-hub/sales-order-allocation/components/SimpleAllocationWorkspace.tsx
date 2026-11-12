"use client";

import { useState } from "react";
import { Boxes, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllocationWorkspace } from "../hooks/useAllocationWorkspace";
import { quantity, quantityText } from "../domain/quantities";
import type { AllocationSnapshot } from "../types";

export default function SimpleAllocationWorkspace() {
    const workspace = useAllocationWorkspace();
    return <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Boxes className="h-6 w-6" />Allocate items</h1><p className="mt-1 text-sm text-muted-foreground">Choose an item and enter how much each customer should receive.</p></div>
            <Button variant="outline" disabled={workspace.loading} onClick={() => { if (!workspace.snapshot || window.confirm("Refresh inventory? Your unsaved quantities will be cleared.")) workspace.refresh(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh stock</Button>
        </div>
        <div className="max-w-sm space-y-2"><label htmlFor="simple-warehouse" className="text-sm font-medium">Warehouse</label><Select value={String(workspace.warehouseId || "")} disabled={workspace.loading} onValueChange={value => { if (Number(value) !== workspace.warehouseId && (!workspace.snapshot || window.confirm("Change warehouse? Your unsaved quantities will be cleared."))) workspace.changeWarehouse(Number(value)); }}><SelectTrigger id="simple-warehouse"><SelectValue placeholder="Choose warehouse" /></SelectTrigger><SelectContent>{workspace.context?.warehouses.map(row => <SelectItem key={row.id} value={String(row.id)}>{row.name}</SelectItem>)}</SelectContent></Select></div>
        {workspace.error && <p role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">{workspace.error}</p>}
        {workspace.loading && <p role="status" className="text-sm text-muted-foreground">Loading items and customers…</p>}
        {workspace.snapshot && <AllocationEditor key={`${workspace.snapshot.warehouse.id}:${workspace.snapshot.readAt}`} snapshot={workspace.snapshot} />}
    </div>;
}

function AllocationEditor({ snapshot }: { snapshot: AllocationSnapshot }) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState("");
    const [amounts, setAmounts] = useState<Record<number, string>>({});
    const [reviewing, setReviewing] = useState(false);
    // Inventory dimensions stay separate; never merge stock from different owners/UOMs.
    const items = [...snapshot.inventory];
    for (const order of snapshot.orders) for (const line of order.lines) {
        if (!items.some(item => item.productId === line.productId && item.supplierId === order.supplierId)) items.push({ key: `unverified:${line.productId}:${order.supplierId}`, productId: line.productId, product: line.product, sku: line.sku, unit: line.unit, supplierId: order.supplierId, supplier: order.supplier, reportedStock: null, availableToPromise: null, reserved: null, candidateDemand: "0", shortage: null, ambiguous: true });
    }
    const item = items.find(row => row.key === selected);
    const matches = items.filter(row => `${row.product} ${row.sku} ${row.supplier}`.toLowerCase().includes(search.toLowerCase()));
    const demands = item ? snapshot.orders.flatMap(order => order.lines.filter(line => line.productId === item.productId && order.supplierId === item.supplierId).map(line => ({ order, line }))) : [];
    // Reported running stock is a planning ceiling ONLY, not verified available stock.
    const stock = item && !item.ambiguous && item.reportedStock !== null ? quantity(item.reportedStock) : null;
    let total = 0n;
    let invalid = false;
    const selectedRows = demands.filter(({ line }) => {
        try { const raw = amounts[line.id] || "0"; const value = quantity(raw); total += value; if (!/^\d+$/.test(raw) || value > quantity(line.unaccountedDemand || "0")) invalid = true; return value > 0n; }
        catch { invalid = true; return false; }
    });
    const overStock = stock !== null && total > stock;
    function edit(id: number, value: string) { setAmounts(previous => ({ ...previous, [id]: value })); setReviewing(false); }
    return <>
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">Planning only: quantities are adjustable but are not saved or reserved. Verified available stock and saving require the inventory reservation service.</p>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <Card><CardHeader><CardTitle className="text-base">1. Choose an item</CardTitle><Input aria-label="Find an item" placeholder="Search item or SKU…" value={search} onChange={event => setSearch(event.target.value)} /></CardHeader><CardContent className="max-h-[550px] space-y-2 overflow-y-auto">
                {matches.slice(0, 100).map(row => <button type="button" key={row.key} aria-pressed={row.key === selected} onClick={() => { if (row.key !== selected) { setSelected(row.key); setAmounts({}); setReviewing(false); } }} className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${row.key === selected ? "border-primary bg-primary/5" : ""}`}><span className="block text-sm font-semibold">{row.product}</span><span className="block text-xs text-muted-foreground">{row.sku} · {row.supplier} · {row.unit}</span><span className="mt-2 block text-xs">Reported stock: {row.reportedStock ?? "Unknown"} {row.unit}</span></button>)}
                {!matches.length && <p className="text-sm text-muted-foreground">No items found.</p>}{matches.length > 100 && <p className="text-xs text-muted-foreground">Showing 100 items. Search to narrow the list.</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">2. Adjust customer quantities</CardTitle><p className="text-sm text-muted-foreground">{item ? `${item.product} · ${item.unit}` : "Select an item on the left to see customers who ordered it."}</p></CardHeader><CardContent className="space-y-4">
                {item && <>
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-4 text-sm"><div><p className="text-xs text-muted-foreground">Reported stock</p><p className="mt-1 font-bold">{stock === null ? "Unknown" : quantityText(stock)}</p></div><div><p className="text-xs text-muted-foreground">Your plan</p><p className="mt-1 font-bold">{quantityText(total)}</p></div><div><p className="text-xs text-muted-foreground">Left in plan</p><p className="mt-1 font-bold">{stock === null ? "Unknown" : overStock ? "Over stock" : quantityText(stock - total)}</p></div></div>
                    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Customer / order</TableHead><TableHead>Still needed</TableHead><TableHead className="w-32">Give quantity</TableHead></TableRow></TableHeader><TableBody>{demands.map(({ order, line }) => <TableRow key={line.id}><TableCell><p className="font-medium">{order.customer}</p><p className="text-xs text-muted-foreground">{order.number}</p></TableCell><TableCell>{line.unaccountedDemand ?? "Needs reconciliation"}</TableCell><TableCell><Input aria-label={`Quantity for ${order.customer}, ${order.number}`} type="number" min="0" step="1" max={line.unaccountedDemand ?? "0"} disabled={stock === null || line.unaccountedDemand === null} value={amounts[line.id] ?? ""} placeholder="0" onChange={event => edit(line.id, event.target.value)} /></TableCell></TableRow>)}{!demands.length && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No open customer orders for this item and stock owner.</TableCell></TableRow>}</TableBody></Table></div>
                    {stock === null && <p className="text-sm text-amber-800">Stock is unknown or ambiguous for this item. Quantities cannot be planned until stock is verified.</p>}
                    {snapshot.inventoryError && <p role="alert" className="text-sm text-amber-800">Inventory could not be loaded. Refresh stock to try again.</p>}
                    {(invalid || overStock) && <p role="alert" className="text-sm text-destructive">Use positive whole quantities within each customer’s demand and the reported stock.</p>}
                    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={!Object.keys(amounts).length} onClick={() => { setAmounts({}); setReviewing(false); }}>Clear quantities</Button><Button disabled={stock === null || invalid || overStock || total === 0n} onClick={() => setReviewing(true)}>Review plan</Button></div>
                    {reviewing && <div className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">3. Review your plan</h3>{selectedRows.map(({ order, line }) => <p key={line.id} className="flex justify-between gap-3 text-sm"><span>{order.customer} · {order.number}</span><strong>{amounts[line.id]} {item.unit}</strong></p>)}<p className="border-t pt-3 text-sm">Total: <strong>{quantityText(total)} {item.unit}</strong> across {new Set(selectedRows.map(row => row.order.customerCode)).size} customer(s).</p><Button disabled>Save allocation — backend not connected</Button><p className="text-xs text-muted-foreground">This plan is unsaved. Refreshing or leaving clears it. No inventory has been reserved.</p></div>}
                </>}
            </CardContent></Card>
        </div>
        <details className="rounded-lg border p-4 text-sm"><summary className="cursor-pointer font-medium">Technical details</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">{snapshot.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul></details>
    </>;
}
