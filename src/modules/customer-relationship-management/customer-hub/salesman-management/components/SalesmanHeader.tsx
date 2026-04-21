"use client";

import { Users } from "lucide-react";

export function SalesmanHeader() {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <Users className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        Salesman Management
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        Configure logistics, territory access, and account succession
                    </p>
                </div>
            </div>
        </div>
    );
}