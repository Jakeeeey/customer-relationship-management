"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Clock3, Layers3, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAllocationWorkspace } from "./hooks/useAllocationWorkspace";
import { OrderAllocationReview } from "./components/OrderAllocationReview";
import { ReadTable } from "./components/ReadTable";
import type { AllocationOrder } from "./types";

function displayTime(value: string) {
    // Existing audit timestamps may be timezone-less. Do not silently assert UTC.
    if (!/[Zz]$|[+-]\d\d:\d\d$/.test(value)) return `${value} (source timezone unverified)`;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(date) : "Unverified time";
}

export default function SalesOrderAllocationModule() {
    const workspace = useAllocationWorkspace();
    const { snapshot, context, loading, error, warehouseId } = workspace;
    const [search, setSearch] = useState("");
    const [supplier, setSupplier] = useState("all");
    const [status, setStatus] = useState("all");
    const [date, setDate] = useState("");
    const [selected, setSelected] = useState<AllocationOrder | null>(null);
    const suppliers = useMemo(() => [...new Map((snapshot?.orders || []).filter(row => row.supplierId).map(row => [String(row.supplierId), row.supplier])).entries()], [snapshot]);
    const filtered = (snapshot?.orders || []).filter(order => {
        const query = search.trim().toLowerCase();
        return (supplier === "all" || String(order.supplierId) === supplier) && (status === "all" || order.allocationState === status)
            && (!date || order.orderDate.slice(0, 10) === date)
            && (!query || [order.number, order.customer, order.customerCode, order.salesman, ...order.lines.flatMap(line => [line.product, line.sku])].join(" ").toLowerCase().includes(query));
    });
    const stockRows = (snapshot?.inventory || []).filter(row => (supplier === "all" || String(row.supplierId) === supplier) && (!search || `${row.product} ${row.sku} ${row.supplier}`.toLowerCase().includes(search.toLowerCase())));
    const metrics = [
        { label: "Orders to reconcile", value: snapshot?.summary.orders, icon: Clock3 },
        { label: "Legacy full summaries", value: snapshot?.summary.fullLegacy, icon: PackageCheck },
        { label: "Legacy partial summaries", value: snapshot?.summary.partialLegacy, icon: Layers3 },
        { label: "Unallocated summaries", value: snapshot?.summary.unallocated, icon: Boxes },
    ];
    return <div className="flex w-full flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Boxes className="h-7 w-7" /></div><div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Sales Order Allocation</h1><p className="text-sm text-muted-foreground">Warehouse demand, allocation review and shortage reconciliation</p></div></div><Badge variant="outline" className="gap-1.5 py-2"><ShieldCheck className="h-4 w-4" />Read-only · shadow workspace</Badge></div>
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950"><p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />No inventory is reserved by this workspace.</p><p className="mt-1">Allocation is planned manually. Reservation ownership and atomic confirmation are not yet available. Unknown stock and shortages are never displayed as zero. Legacy allocation summaries are not confirmed reservations.</p></div>
        <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-6">
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="allocation-warehouse">Warehouse</label><Select value={warehouseId?.toString() || ""} onValueChange={value => { setSelected(null); setSupplier("all"); workspace.changeWarehouse(Number(value)); }} disabled={!context || loading}><SelectTrigger id="allocation-warehouse"><SelectValue placeholder="Authorized warehouse" /></SelectTrigger><SelectContent>{context?.warehouses.map(row => <SelectItem key={row.id} value={String(row.id)}>{row.name}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="allocation-supplier">Supplier / stock owner</label><Select value={supplier} onValueChange={setSupplier}><SelectTrigger id="allocation-supplier"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All suppliers</SelectItem>{suppliers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="allocation-state">Legacy allocation state</label><Select value={status} onValueChange={setStatus}><SelectTrigger id="allocation-state"><SelectValue /></SelectTrigger><SelectContent>{["all", "Legacy full", "Legacy partial", "Unallocated"].map(value => <SelectItem key={value} value={value}>{value === "all" ? "All summaries" : value}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="allocation-date">Order date</label><Input id="allocation-date" type="date" value={date} onChange={event => setDate(event.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-semibold" htmlFor="allocation-search">Order, customer or SKU</label><Input id="allocation-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search…" /></div>
            <div className="flex items-end"><Button className="w-full" variant="outline" disabled={!warehouseId || loading} onClick={() => { setSelected(null); workspace.refresh(); }}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
        </CardContent></Card>
        {error && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</div>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Reading authorized warehouse data…</p>}
        <Tabs defaultValue="overview" className="w-full"><TabsList className="h-auto w-full flex-wrap justify-start gap-1"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="queue">Allocation Queue</TabsTrigger><TabsTrigger value="inventory">Inventory &amp; Shortages</TabsTrigger><TabsTrigger value="history">Allocation History</TabsTrigger></TabsList>
            <TabsContent value="overview" className="mt-5 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => <Card key={metric.label}><CardContent className="flex items-start justify-between pt-6"><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className="mt-2 text-3xl font-black">{metric.value ?? "—"}</p></div><metric.icon className="h-5 w-5 text-primary/60" /></CardContent></Card>)}</div>
                <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Allocation readiness</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="font-medium">Manual planning is available; saving and confirmation are unavailable.</p><ul className="list-disc space-y-2 pl-5 text-muted-foreground">{snapshot?.blockers.map(reason => <li key={reason}>{reason}</li>) || <li>Authenticate and select an authorized warehouse to inspect live data.</li>}</ul></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-base">Legacy quantities by UOM</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{snapshot ? <><div className="flex flex-wrap gap-2">{Object.entries(snapshot.summary.allocatedByUnit).map(([unit, amount]) => <Badge key={unit} variant="secondary">{amount} {unit}</Badge>)}</div><p className="text-muted-foreground">{snapshot.summary.excludedDrafts} Drafts and {snapshot.summary.excludedClosed} closed/cancelled orders excluded. These quantities are not an authoritative reservation balance.</p><p className="text-xs text-muted-foreground">Read {displayTime(snapshot.readAt)} · Asia/Manila. REST reads are not a transactional snapshot.</p></> : <p className="text-muted-foreground">No verified warehouse snapshot loaded.</p>}</CardContent></Card></div>
            </TabsContent>
            <TabsContent value="queue" className="mt-5 space-y-3"><p className="text-sm text-muted-foreground">Review and plan allocations manually. The order sequence is for display only.</p>
                <ReadTable columns={["Sales order", "Customer", "Salesman", "Submitted", "Workflow", "Lines", "Allocation summary", "Action"]} empty={snapshot ? "No matching Draft orders in this warehouse." : "Load an authorized warehouse to view orders."} rows={filtered.map(order => [<div key="order" className="font-semibold">{order.number}<div className="text-xs font-normal text-muted-foreground">{order.supplier}</div></div>, order.customer, order.salesman, "Not recorded", order.workflow, order.lines.length, <Badge key="state" variant="secondary">{order.allocationState}</Badge>, <Button key="review" size="sm" variant="outline" onClick={() => setSelected(order)}>Review</Button>])} />
            </TabsContent>
            <TabsContent value="inventory" className="mt-5 space-y-3"><p className="text-sm text-muted-foreground">Running stock is reported by Spring, not verified ATP. Reserved stock, usable stock and true shortages remain unknown. Candidate demand includes only lines with no legacy allocation quantities.</p>{snapshot?.inventoryError && <p role="alert" className="text-sm text-destructive">{snapshot.inventoryError}</p>}
                <ReadTable columns={["Warehouse", "Product / SKU", "Supplier", "UOM", "Reported running stock", "Reserved", "Allocatable (ATP)", "Candidate demand", "Shortage"]} empty="No reported inventory rows loaded. This does not establish zero stock." rows={stockRows.map(row => [snapshot?.warehouse.name, <div key="product" className="font-medium">{row.product}<div className="text-xs text-muted-foreground">{row.sku}</div></div>, row.supplier, row.unit, row.reportedStock ?? "Unknown / ambiguous", "Unverified", "Unverified", row.candidateDemand, "Unverified"])} />
            </TabsContent>
            <TabsContent value="history" className="mt-5 space-y-3"><p className="text-sm text-muted-foreground">Existing allocation-field audit only. This is not a confirmed reservation ledger; no allocation batch, confirmation, release or consumption is fabricated.</p>{snapshot?.history.error && <p role="alert" className="text-sm text-destructive">{snapshot.history.error}</p>}
                <ReadTable paginated={false} columns={["Timestamp", "Source", "Order / line", "Field", "Before", "After", "Actor", "Batch / reservation"]} empty="No legacy allocation-field audit entries found. Confirmed reservation history is not integrated." rows={(snapshot?.history.rows || []).map(row => [displayTime(row.timestamp), "Legacy field audit", `${row.orderNumber} / ${row.lineId}`, row.field, row.before, row.after, row.actorId ?? "Unknown", "Not recorded"])} />
                <div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={loading || workspace.historyPage === 1} onClick={() => workspace.setHistoryPage(value => value - 1)}>Previous</Button><span className="self-center text-sm">Page {workspace.historyPage}</span><Button variant="outline" size="sm" disabled={loading || !snapshot?.history.hasMore} onClick={() => workspace.setHistoryPage(value => value + 1)}>Next</Button></div>
            </TabsContent>
        </Tabs>
        <OrderAllocationReview key={selected?.id || "closed"} order={selected} inventory={snapshot?.inventory || []} onClose={() => setSelected(null)} />
    </div>;
}
