"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Package2 } from "lucide-react";

export function SalesOrderSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                        <Package2 className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
            </div>

            {/* Form Fields Skeleton */}
            <section className="bg-card rounded-xl border p-6 shadow-sm space-y-8">
                {/* Unified Search Section Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                </div>

                {/* Date Filters Section Skeleton */}
                <div className="space-y-4 pt-6 border-t">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-11 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main Content Area Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
                {/* Table Skeleton */}
                <section className="space-y-4 xl:col-span-3 order-2 xl:order-1">
                    <div className="flex items-center justify-between px-1">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="rounded-md border bg-card overflow-hidden">
                        <div className="h-12 border-b bg-muted/50 p-4">
                            <Skeleton className="h-4 w-full" />
                        </div>
                        <div className="p-0">
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} className="flex border-b p-4 gap-4">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <Skeleton key={j} className="h-4 flex-1" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Summary Section Skeleton */}
                <section className="bg-card rounded-xl border p-6 shadow-sm xl:col-span-1 order-1 xl:order-2 space-y-8 self-start">
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-dashed space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="pt-4 flex flex-col items-center gap-4">
                        <Skeleton className="h-8 w-32 rounded-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </section>
            </div>

            <div className="h-8" />
        </div>
    );
}
