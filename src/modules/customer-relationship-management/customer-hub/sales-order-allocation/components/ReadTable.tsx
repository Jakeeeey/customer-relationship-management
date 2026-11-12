"use client";
import { useState, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function ReadTable({ columns, rows, empty, paginated = true }: { columns: string[]; rows: ReactNode[][]; empty: string; paginated?: boolean }) {
    const [page, setPage] = useState(0);
    const pages = Math.max(1, Math.ceil(rows.length / 20));
    const visiblePage = Math.min(page, pages - 1);
    const visible = paginated ? rows.slice(visiblePage * 20, (visiblePage + 1) * 20) : rows;
    return <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto"><Table>
            <TableHeader className="bg-muted/50"><TableRow>{columns.map(column => <TableHead key={column} className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wide">{column}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{visible.length ? visible.map((row, index) => <TableRow key={index}>{row.map((cell, column) => <TableCell key={column} className="px-4 py-4 align-top text-sm">{cell}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">{empty}</TableCell></TableRow>}</TableBody>
        </Table></div>
        {paginated && rows.length > 20 && <div className="flex items-center justify-between gap-3 border-t p-3 text-xs text-muted-foreground">
            <span>{rows.length} rows · Page {visiblePage + 1} of {pages}</span><div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!visiblePage} onClick={() => setPage(visiblePage - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={visiblePage + 1 >= pages} onClick={() => setPage(visiblePage + 1)}>Next</Button>
            </div>
        </div>}
    </div>;
}
