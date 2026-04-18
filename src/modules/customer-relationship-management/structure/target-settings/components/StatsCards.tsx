"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, TrendingUp } from "lucide-react";

interface StatsCardsProps {
    totalSalesmen: number;
    targetsSet: number;
    completionRate: number;
}

export function StatsCards({ totalSalesmen, targetsSet, completionRate }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm border border-muted/50 rounded-2xl h-[120px]">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Salesmen</p>
                        <p className="text-3xl font-black">{totalSalesmen}</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Users className="w-7 h-7 text-blue-500" />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border border-muted/50 rounded-2xl h-[120px]">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Targets Set</p>
                        <p className="text-3xl font-black">{targetsSet}</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <Target className="w-7 h-7 text-emerald-500" />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border border-muted/50 rounded-2xl h-[120px]">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Completion Rate</p>
                        <p className="text-3xl font-black">{completionRate}%</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <TrendingUp className="w-7 h-7 text-purple-500" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
