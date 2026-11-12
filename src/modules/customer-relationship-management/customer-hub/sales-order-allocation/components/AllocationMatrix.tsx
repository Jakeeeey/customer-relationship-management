"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAllocationWorkspace } from "../hooks/useAllocationWorkspace";
import { quantity, quantityText } from "../domain/quantities";
import { groupCustomerColumns, paginateOrderColumns, sortAllocationOrders, type OrderSort } from "../domain/orderPagination";
import { canonicalUnit } from "../domain/units";
import type { AllocationSnapshot, AllocationOrder, ReportedInventory } from "../types";

export default function AllocationMatrix() {
    const workspace = useAllocationWorkspace();
    return <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-black">Sales Order Allocation</h1><p className="mt-1 text-sm text-muted-foreground">One row per product, with separate customer and sales-order columns.</p></div><Button variant="outline" disabled={workspace.loading} onClick={() => { if (!workspace.snapshot || window.confirm("Refresh orders and clear your unsaved quantities?")) workspace.refresh(); }}><RefreshCw className={`mr-2 h-4 w-4 ${workspace.loading ? "animate-spin" : ""}`} />Sync orders &amp; stock</Button></div>
        <div className="max-w-sm space-y-2"><label htmlFor="matrix-warehouse" className="text-sm font-medium">Warehouse</label><Select disabled={!workspace.context || workspace.loading} value={workspace.warehouseId === null ? "" : String(workspace.warehouseId)} onValueChange={value => { const next = value === "all" ? "all" : Number(value); if (next !== workspace.warehouseId && (!workspace.snapshot || window.confirm("Change warehouse and clear unsaved quantities?"))) workspace.changeWarehouse(next); }}><SelectTrigger id="matrix-warehouse"><SelectValue placeholder="Choose a warehouse" /></SelectTrigger><SelectContent><SelectItem value="all">All warehouses</SelectItem>{workspace.context?.warehouses.map(warehouse => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name}</SelectItem>)}</SelectContent></Select></div>
        {workspace.error && <p role="alert" className="text-sm text-destructive">{workspace.error}</p>}
        {workspace.loading && <p role="status" className="text-sm text-muted-foreground">Loading orders and inventory…</p>}
        {workspace.snapshot && <Matrix key={`${workspace.warehouseId}:${workspace.snapshot.readAt}`} snapshot={workspace.snapshot} warehouses={workspace.context?.warehouses || []} />}
    </div>;
}

interface ProductRow { key: string; warehouseId: number; productId: number; supplierId: number | null; product: string; sku: string; unit: string; supplier: string }
interface MatrixColumn { order: AllocationOrder; customer: string }

export function Matrix({ snapshot, warehouses }: { snapshot: AllocationSnapshot; warehouses: { id: number; name: string }[] }) {
    const [search, setSearch] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [salesmanFilter, setSalesmanFilter] = useState("all");
    const [warehouseFilter, setWarehouseFilter] = useState("all");
    const [destinationFilter, setDestinationFilter] = useState("all");
    const [sortBy, setSortBy] = useState<OrderSort>("latest");
    const [values, setValues] = useState<Record<number, string>>({});
    const [review, setReview] = useState(false);
    const [pageSize, setPageSize] = useState(10);
    const [pageIndex, setPageIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const warehouseName = (id: number) => id === 0 ? "Warehouse not assigned" : warehouses.find(row => row.id === id)?.name || `Warehouse ${id}`;

    const warehouseNames = useMemo(() => new Map(warehouses.map(warehouse => [warehouse.id, warehouse.name])), [warehouses]);
    const salesmanOptions = useMemo(() => [...new Set(snapshot.orders.map(order => order.salesman).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [snapshot.orders]);
    const destinationOptions = useMemo(() => [...new Set(snapshot.orders.map(order => order.destination).filter(value => value && value !== "Not specified"))].sort((a, b) => a.localeCompare(b)), [snapshot.orders]);
    const orders = useMemo(() => sortAllocationOrders(snapshot.orders.filter(order => (!start || order.orderDate.slice(0, 10) >= start) && (!end || order.orderDate.slice(0, 10) <= end)
        && (salesmanFilter === "all" || order.salesman === salesmanFilter)
        && (warehouseFilter === "all" || String(order.warehouseId) === warehouseFilter)
        && (destinationFilter === "all" || order.destination === destinationFilter)
        && (!search || [order.customer, order.customerCode, order.number, order.salesman, order.destination, ...order.lines.flatMap(line => [line.product, line.sku])].join(" ").toLowerCase().includes(search.toLowerCase())))
        , sortBy, warehouseNames), [snapshot.orders, start, end, search, salesmanFilter, warehouseFilter, destinationFilter, sortBy, warehouseNames]);

    const orderPage = paginateOrderColumns(orders, pageIndex, pageSize);
    const { pageCount, pageIndex: safePageIndex, startIndex: firstOrderIndex, items: visibleOrders } = orderPage;
    // Customer grouping is visual only. Individual orders remain distinct columns.
    const columns: MatrixColumn[] = visibleOrders.map(order => ({ order, customer: `${order.customer} (${order.customerCode})` }));
    const customerGroups = groupCustomerColumns(visibleOrders, firstOrderIndex, orders[firstOrderIndex - 1]);

    const rowMap = new Map<string, ProductRow>();
    for (const order of snapshot.orders) for (const line of order.lines) {
        const key = `${order.warehouseId}:${line.productId}:${order.supplierId ?? "unknown"}:${line.unit}`;
        if (!rowMap.has(key)) rowMap.set(key, { key, warehouseId: order.warehouseId, productId: line.productId, supplierId: order.supplierId, product: line.product, sku: line.sku, unit: line.unit, supplier: order.supplier });
    }
    const stockWarehouseId = (stock: ReportedInventory) => {
        const parts = stock.key.split(":");
        return Number(parts[0] === "demand" ? parts[1] : parts[0]);
    };
    const inventoryByRowKey = new Map<string, ReportedInventory[]>();
    for (const stock of snapshot.inventory) {
        const stockWarehouse = stockWarehouseId(stock);
        if (!Number.isSafeInteger(stockWarehouse)) continue;
        const key = `${stockWarehouse}:${stock.productId}:${stock.supplierId ?? "unknown"}:${canonicalUnit(stock.unit)}`;
        const matches = inventoryByRowKey.get(key);
        if (matches) matches.push(stock);
        else inventoryByRowKey.set(key, [stock]);
    }
    // The matrix contains demanded products only. Inventory-only products do not
    // add allocation choices, and must not create a huge product×order grid.
    const allRows = [...rowMap.values()].sort((a, b) => warehouseName(a.warehouseId).localeCompare(warehouseName(b.warehouseId)) || a.product.localeCompare(b.product) || a.unit.localeCompare(b.unit));
    const rows = allRows.filter(row => (warehouseFilter === "all" || String(row.warehouseId) === warehouseFilter)
        && (!search || `${row.product} ${row.sku} ${row.supplier} ${warehouseName(row.warehouseId)}`.toLowerCase().includes(search.toLowerCase())));

    let invalid = false;
    const summary: string[] = [];
    const competingByRow = new Map<string, { order: AllocationOrder; line: AllocationOrder["lines"][number] }[]>();
    for (const order of snapshot.orders) for (const line of order.lines) {
        const key = `${order.warehouseId}:${line.productId}:${order.supplierId ?? "unknown"}:${line.unit}`;
        competingByRow.set(key, [...(competingByRow.get(key) || []), { order, line }]);
    }
    const metricsByRow = new Map<string, { stock: bigint | null; planned: bigint; remaining: bigint | null; usedLines: number }>();
    for (const row of allRows) {
        const stockMatches = inventoryByRowKey.get(row.key) || [];
        const stock: bigint | null = stockMatches.length === 1 && !stockMatches[0].ambiguous && stockMatches[0].reportedStock !== null ? quantity(stockMatches[0].reportedStock) : null;
        const competing = competingByRow.get(row.key) || [];
        let planned = 0n;
        let usedLines = 0;
        for (const { order, line } of competing) {
            const raw = values[line.id] || "";
            if (!raw) continue;
            try {
                const assigned = quantity(raw);
                if (!/^\d+$/.test(raw) || line.unaccountedDemand === null || assigned > quantity(line.unaccountedDemand)) invalid = true;
                planned += assigned;
                usedLines++;
                summary.push(`${row.product} (${row.unit}) → ${order.customer}, ${order.number}: ${quantityText(assigned)}`);
            } catch { invalid = true; }
        }
        if (stock === null && planned > 0n || stock !== null && planned > stock) invalid = true;
        metricsByRow.set(row.key, { stock, planned, remaining: stock === null ? null : stock - planned, usedLines });
    }
    const rowVirtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 68, overscan: 8 });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const renderRow = (row: ProductRow, virtualIndex: number) => {
        const { stock, planned, remaining, usedLines } = metricsByRow.get(row.key) || { stock: null, planned: 0n, remaining: null, usedLines: 0 };
        const otherOwner = stock === null ? snapshot.inventory.filter(item => stockWarehouseId(item) === row.warehouseId && item.productId === row.productId && canonicalUnit(item.unit) === canonicalUnit(row.unit) && !item.ambiguous && item.reportedStock !== null) : [];
        const ownerMismatch = otherOwner.length === 1 && otherOwner[0].supplierId !== row.supplierId ? otherOwner[0] : null;
        return <tr key={row.key} data-index={virtualIndex} ref={rowVirtualizer.measureElement} className="border-b">
            <th scope="row" className="sticky left-0 z-10 min-w-52 border-r bg-background p-2 text-left font-medium"><span>{row.product}</span><span className="block text-xs font-normal text-muted-foreground">{row.sku} · {row.supplier}</span><span className="block text-[10px] font-normal text-muted-foreground">{warehouseName(row.warehouseId)}</span></th>
            <td className="sticky left-[208px] z-10 bg-background p-2 text-sm">{row.unit}</td>
            <td className="sticky left-[272px] z-10 bg-background p-2 text-right font-medium">{stock !== null ? quantityText(stock) : ownerMismatch ? <span title={`Reported under supplier ${ownerMismatch.supplier}; not verified for this order's supplier`} className="text-amber-700">{ownerMismatch.reportedStock}<span className="block text-[10px]">Different supplier</span></span> : <span className="text-amber-700">Unverified</span>}</td>
            {columns.map(({ order }) => {
                const lines = order.warehouseId === row.warehouseId && order.supplierId === row.supplierId ? order.lines.filter(line => line.productId === row.productId && line.unit === row.unit) : [];
                return <td key={order.id} className="min-w-32 border-l p-1.5">{lines.length ? lines.map(line => {
                    const inputLocked = stock === null || line.unaccountedDemand === null;
                    return <div key={line.id} className="space-y-1"><span className="block text-xs font-semibold">Ordered: {line.ordered}</span><span className="block text-[11px] text-muted-foreground">Previously allocated: {line.legacyAllocated}</span><Input aria-label={`Planned ${row.product} for ${order.customer}, order ${order.number}`} className="h-8 w-28 px-2 text-right" type="number" min="0" step="1" max={line.unaccountedDemand ?? "0"} disabled={inputLocked} placeholder="Plan qty" value={values[line.id] ?? ""} onChange={event => { setValues(previous => ({ ...previous, [line.id]: event.target.value })); setReview(false); }} /><span className="block text-[11px] text-muted-foreground">Need {line.unaccountedDemand ?? "unverified"}</span></div>;
                }) : <span className="px-2 text-muted-foreground">—</span>}</td>;
            })}
            <td className="whitespace-nowrap p-2 text-right font-semibold">{quantityText(planned)}</td>
            <td className={`whitespace-nowrap p-2 text-right ${remaining !== null && remaining < 0n ? "font-semibold text-destructive" : ""}`}>{remaining === null ? "Unknown" : remaining < 0n ? "Over plan" : quantityText(remaining)}</td>
            <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">{stock === null ? "Inventory unavailable" : usedLines ? `${usedLines} line(s) planned` : "No quantities entered"}</td>
        </tr>;
    };
    const topSpacer = virtualRows.length ? virtualRows[0].start : 0;
    const bottomSpacer = virtualRows.length ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;
    const plannedCellCount = Object.values(values).filter(value => value !== "").length;

    return <div className="space-y-4">
        <div className="flex flex-wrap gap-3 rounded-xl border p-3">
            <div className="min-w-56 flex-1 space-y-1"><label htmlFor="matrix-search" className="text-xs font-medium">Search products, customers or orders</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="matrix-search" className="h-9 pl-9" value={search} onChange={event => { setPageIndex(0); setSearch(event.target.value); }} placeholder="Search…" /></div></div>
            <div className="w-44 space-y-1"><label htmlFor="matrix-sort" className="text-xs font-medium">Sort orders</label><Select value={sortBy} onValueChange={value => { setSortBy(value as OrderSort); setPageIndex(0); }}><SelectTrigger id="matrix-sort" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="latest">Latest to earliest</SelectItem><SelectItem value="earliest">Earliest to latest</SelectItem><SelectItem value="salesman">Salesman</SelectItem><SelectItem value="warehouse">Warehouse</SelectItem><SelectItem value="destination">Destination</SelectItem><SelectItem value="customer">Customer</SelectItem></SelectContent></Select></div>
            <div className="w-44 space-y-1"><label htmlFor="matrix-salesman" className="text-xs font-medium">Salesman</label><Select value={salesmanFilter} onValueChange={value => { setSalesmanFilter(value); setPageIndex(0); }}><SelectTrigger id="matrix-salesman" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All salesmen</SelectItem>{salesmanOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-44 space-y-1"><label htmlFor="matrix-warehouse-filter" className="text-xs font-medium">Warehouse</label><Select value={warehouseFilter} onValueChange={value => { setWarehouseFilter(value); setPageIndex(0); }}><SelectTrigger id="matrix-warehouse-filter" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All warehouses</SelectItem>{warehouses.map(row => <SelectItem key={row.id} value={String(row.id)}>{row.name}</SelectItem>)}<SelectItem value="0">Warehouse not assigned</SelectItem></SelectContent></Select></div>
            <div className="w-44 space-y-1"><label htmlFor="matrix-destination" className="text-xs font-medium">Destination</label><Select value={destinationFilter} onValueChange={value => { setDestinationFilter(value); setPageIndex(0); }}><SelectTrigger id="matrix-destination" className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All destinations</SelectItem>{destinationOptions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><label htmlFor="matrix-from" className="text-xs font-medium">Order date from</label><Input id="matrix-from" className="h-9" type="date" value={start} onChange={event => { setPageIndex(0); setStart(event.target.value); }} /></div><div className="space-y-1"><label htmlFor="matrix-to" className="text-xs font-medium">To</label><Input id="matrix-to" className="h-9" type="date" value={end} onChange={event => { setPageIndex(0); setEnd(event.target.value); }} /></div>
            <div className="w-32 space-y-1"><label htmlFor="matrix-page-size" className="text-xs font-medium">Orders per page</label><Select value={String(pageSize)} onValueChange={value => { setPageSize(Number(value)); setPageIndex(0); }}><SelectTrigger id="matrix-page-size" className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 15].map(size => <SelectItem key={size} value={String(size)}>{size} orders</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p>{orders.length} matching orders · showing {orders.length ? firstOrderIndex + 1 : 0}–{Math.min(firstOrderIndex + pageSize, orders.length)} · {rows.length} product / UOM rows. Warehouse is shown beneath each product.</p><Badge variant="outline">Manual planning</Badge></div>
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Planning only.</strong> This list uses the same Draft status filter as Sales Order Draft, across all warehouses. Orders without an assigned warehouse cannot use inventory. Stock figures are reported stock, not verified available-to-promise. Blank cells mean no plan entered. Quantities entered here remain unsaved. Nothing is reserved.</div></div>
        {snapshot.inventoryError && <p role="alert" className="text-sm text-destructive">Some warehouse inventory could not be verified. Quantities for affected rows are disabled.</p>}
        <OrderPagination pageIndex={safePageIndex} pageCount={pageCount} pageSize={pageSize} total={orders.length} onPage={setPageIndex} />
        <div ref={scrollRef} className="max-h-[68vh] overflow-auto rounded-xl border"><table className="w-full min-w-max border-separate border-spacing-0 text-sm"><thead className="sticky top-0 z-20 bg-muted"><tr className="bg-muted"><th rowSpan={2} className="sticky left-0 z-40 w-52 min-w-52 border-b border-r bg-muted p-2 text-left">Product / SKU</th><th rowSpan={2} className="sticky left-[208px] z-40 w-16 min-w-16 border-b bg-muted p-2 text-left">UOM</th><th rowSpan={2} className="sticky left-[272px] z-40 w-24 min-w-24 border-b bg-muted p-2 text-right">Reported INV</th>{customerGroups.map((group, index) => <th key={`${group.customer}-${index}`} colSpan={group.count} className="min-w-32 border-b border-l bg-muted p-2 text-center">{group.customer}{group.continued ? " (continued)" : ""}</th>)}<th rowSpan={2} className="min-w-24 border-b bg-muted p-2 text-right">Planned · all pages</th><th rowSpan={2} className="min-w-24 border-b bg-muted p-2 text-right">Left in plan</th><th rowSpan={2} className="min-w-36 border-b bg-muted p-2 text-left">Validation</th></tr><tr className="bg-muted/80">{columns.map(({ order }) => <th key={order.id} className="min-w-32 border-b border-l bg-muted/80 p-2 text-left"><span className="block font-semibold">{order.number}</span><span className="block text-[11px] font-normal text-muted-foreground">{order.orderDate.slice(0, 10)} · {order.workflow}</span><span className="block text-[10px] font-normal text-muted-foreground">{order.salesman} · {order.destination}</span></th>)}</tr></thead><tbody>
            {topSpacer > 0 && <tr><td colSpan={6 + columns.length} style={{ height: topSpacer, padding: 0, border: 0 }} /> </tr>}
            {virtualRows.map(virtualRow => renderRow(rows[virtualRow.index], virtualRow.index))}
            {bottomSpacer > 0 && <tr><td colSpan={6 + columns.length} style={{ height: bottomSpacer, padding: 0, border: 0 }} /></tr>}
            {!rows.length && <tr><td colSpan={6 + columns.length} className="p-10 text-center text-muted-foreground">No matching products or orders.</td></tr>}
        </tbody></table></div>
        <OrderPagination pageIndex={safePageIndex} pageCount={pageCount} pageSize={pageSize} total={orders.length} onPage={setPageIndex} />
        {invalid && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">One or more planned quantities exceed known demand or reported stock. Check red-highlighted rows.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{plannedCellCount} planned cell(s) across all pages and filters · totals remain separated by warehouse, product, supplier and UOM.</p><div className="flex gap-2"><Button variant="outline" disabled={!plannedCellCount} onClick={() => { setValues({}); setReview(false); }}>Clear plan</Button><Button disabled={invalid || !plannedCellCount} onClick={() => setReview(true)}>Review global plan</Button></div></div>
        {review && <div className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Review unsaved plan</h2><ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm">{summary.map((text, index) => <li key={index}>{text}</li>)}</ul><Button disabled>Save allocation — reservation backend required</Button><p className="text-xs text-muted-foreground">This is a temporary manual plan only. Unit conversions and reservation availability are not verified.</p></div>}
    </div>;
}

function OrderPagination({ pageIndex, pageCount, pageSize, total, onPage }: { pageIndex: number; pageCount: number; pageSize: number; total: number; onPage: (page: number) => void }) {
    return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{total ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, total)} of ${total} orders` : "0 orders"} · Page {pageIndex + 1} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pageIndex === 0} onClick={() => onPage(pageIndex - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={pageIndex + 1 >= pageCount} onClick={() => onPage(pageIndex + 1)}>Next</Button></div></div>;
}
