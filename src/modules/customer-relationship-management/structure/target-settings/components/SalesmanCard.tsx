"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mail, TrendingUp, Target } from "lucide-react";
import { SalesmanWithTarget } from "../types";

interface SalesmanCardProps {
    salesman: SalesmanWithTarget;
    onEditTarget: (salesman: SalesmanWithTarget) => void;
}

export function SalesmanCard({ salesman, onEditTarget }: SalesmanCardProps) {
    const target = salesman.current_target;

    const calculateProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    };

    const getOverallProgress = (salesman: SalesmanWithTarget) => {
        if (!salesman.current_target) return 0;

        const metrics = [];
        if (salesman.operation === 1) { // Booking
            metrics.push(calculateProgress(salesman.current_volume || 0, salesman.current_target.volume || 0));
            metrics.push(calculateProgress(salesman.current_frequency || 0, salesman.current_target.frequency || 0));
        } else { // Site Sales
            metrics.push(calculateProgress(salesman.current_volume || 0, salesman.current_target.volume || 0));
            metrics.push(calculateProgress(salesman.current_new_accounts || 0, salesman.current_target.new_accounts || 0));
        }

        const average = metrics.reduce((a, b) => a + b, 0) / (metrics.length || 1);
        return Math.round(average);
    };

    const progress = getOverallProgress(salesman);
    const volumeProgress = target ? calculateProgress(salesman.current_volume || 0, target.volume || 0) : 0;
    const secondaryProgress = target ? (
        salesman.operation === 1
            ? calculateProgress(salesman.current_frequency || 0, target.frequency || 0)
            : calculateProgress(salesman.current_new_accounts || 0, target.new_accounts || 0)
    ) : 0;

    const secondaryLabel = salesman.operation === 1 ? "Frequency" : "New Accounts";
    const secondaryCurrent = salesman.operation === 1 ? (salesman.current_frequency || 0) : (salesman.current_new_accounts || 0);
    const secondaryTarget = target ? (salesman.operation === 1 ? (target.frequency || 0) : (target.new_accounts || 0)) : 0;

    return (
        <Card className="shadow-sm hover:shadow-md transition-all border border-muted/60 overflow-hidden">
            <CardContent className="p-5 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg leading-none">{salesman.salesman_name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                            <Mail className="w-3 h-3" /> {salesman.email}
                        </div>
                    </div>
                    <Badge variant="secondary" className="px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wide uppercase">
                        {salesman.operation === 1 ? "Booking" : "Sites Sales"}
                    </Badge>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
                            <span className="font-bold">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-muted" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Volume</span>
                            <span className="font-mono text-[10px] font-bold">
                                {target ? `${(salesman.current_volume || 0).toLocaleString()} / ${(target.volume || 0).toLocaleString()}` : "No target"}
                            </span>
                        </div>
                        <Progress value={volumeProgress} className="h-1 bg-muted" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{secondaryLabel}</span>
                            <span className="font-mono text-[10px] font-bold">
                                {target ? `${secondaryCurrent.toLocaleString()} / ${secondaryTarget.toLocaleString()}` : "No target"}
                            </span>
                        </div>
                        <Progress value={secondaryProgress} className="h-1 bg-muted" />
                    </div>
                </div>

                <div className="pt-2 border-t flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        {target ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                                <div className="w-4 h-4 rounded-full border border-emerald-500/30 flex items-center justify-center">
                                    <TrendingUp className="w-2.5 h-2.5" />
                                </div>
                                On Track
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground/50 font-bold text-[10px] uppercase italic">
                                <Target className="w-3 h-3" />
                                No target set for this month
                            </div>
                        )}
                    </div>

                    {target ? (
                        <Button
                            variant="outline"
                            className="w-full rounded-lg h-9 gap-2 text-xs font-bold border-muted/50 hover:bg-muted/30"
                            onClick={() => onEditTarget(salesman)}
                        >
                            <Target className="w-3.5 h-3.5" /> Update Target
                        </Button>
                    ) : (
                        <Button
                            className="w-full rounded-lg h-9 gap-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                            onClick={() => onEditTarget(salesman)}
                        >
                            <Target className="w-3.5 h-3.5" /> Set Target
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
