"use client";

import { useOPSDashboard } from "./hooks/useOPSDashboard";
import { StatusColumn } from "./components/StatusColumn";
import { Button } from "@/components/ui/button";
import { RefreshCcw, LayoutDashboard, Clock, AlertCircle, Play, Pause, ChevronsUpDown, ChevronsDownUp, Timer } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { BulkAction } from "./types";

export default function OPSDashboardModule() {
    const { data, isLoading, lastUpdated, error, refresh } = useOPSDashboard();
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [resumeCountdown, setResumeCountdown] = useState(0);
    const [bulkAction, setBulkAction] = useState<BulkAction>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollDirection = useRef(1); // 1 = right, -1 = left
    const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const triggerPause = useCallback(() => {
        if (!isAutoScrolling) return;

        setIsPaused(true);
        setResumeCountdown(10);

        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        countdownIntervalRef.current = setInterval(() => {
            setResumeCountdown((prev) => {
                if (prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        pauseTimerRef.current = setTimeout(() => {
            setIsPaused(false);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }, 10000);
    }, [isAutoScrolling]);

    // Handle global keyboard interactions
    useEffect(() => {
        const handleKeyDown = () => {
            if (isAutoScrolling) triggerPause();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAutoScrolling, triggerPause]);

    // Reset pause state when auto-scroll is manually toggled
    useEffect(() => {
        if (!isAutoScrolling) {
            // Use setTimeout to avoid synchronous setState in effect warning
            const timer = setTimeout(() => {
                setIsPaused(false);
                setResumeCountdown(0);
            }, 0);
            
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            
            return () => clearTimeout(timer);
        }
    }, [isAutoScrolling]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoScrolling && !isPaused && scrollRef.current) {
            interval = setInterval(() => {
                if (scrollRef.current) {
                    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                    const maxScroll = scrollWidth - clientWidth;

                    if (scrollDirection.current === 1 && scrollLeft >= maxScroll - 1) {
                        scrollDirection.current = -1;
                    } else if (scrollDirection.current === -1 && scrollLeft <= 1) {
                        scrollDirection.current = 1;
                    }

                    scrollRef.current.scrollLeft += scrollDirection.current * 1.5; // Speed adjustment
                }
            }, 30);
        }
        return () => clearInterval(interval);
    }, [isAutoScrolling, isPaused]);

    if (error) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-6 space-y-4">
                <Alert variant="destructive" className="max-w-md shadow-lg border-2">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-bold">Fetch Failed</AlertTitle>
                    <AlertDescription className="text-sm opacity-90 italic">
                        {error}
                    </AlertDescription>
                </Alert>
                <Button onClick={refresh} className="font-bold shadow-md hover:scale-105 transition-transform">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    RETRY CONNECTION
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-background/50 border rounded-lg overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* Header */}
            <header className="flex items-center justify-between p-4 bg-background border-b shadow-sm z-30 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shadow-inner">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                            Operations Dashboard
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold mt-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>LAST SYNC: {format(lastUpdated, "HH:mm:ss")}</span>
                            <Badge variant="outline" className="text-[11px] h-4.5 font-black">2m Auto-Sync</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-2 px-3 py-1 bg-secondary/30 rounded-full border border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBulkAction({ type: 'expand', id: Date.now() })}
                            className="font-black text-[10px] h-7 px-2 hover:bg-primary/10 hover:text-primary transition-all active:scale-95 flex items-center gap-1"
                        >
                            <ChevronsUpDown className="h-3.5 w-3.5" />
                            EXPAND ALL
                        </Button>
                        <div className="w-[1px] h-3 bg-border/50" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBulkAction({ type: 'collapse', id: Date.now() })}
                            className="font-black text-[10px] h-7 px-2 hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 flex items-center gap-1"
                        >
                            <ChevronsDownUp className="h-3.5 w-3.5" />
                            COLLAPSE ALL
                        </Button>
                    </div>

                    <Button
                        variant={isAutoScrolling ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                        className={cn(
                            "font-black h-10 px-4 border-2 shadow-sm transition-all hover:scale-102 active:scale-95 min-w-[160px]",
                            isAutoScrolling && !isPaused && "bg-primary text-primary-foreground animate-pulse",
                            isAutoScrolling && isPaused && "bg-amber-500 border-amber-600 text-white animate-none"
                        )}
                    >
                        {isAutoScrolling ? (
                            isPaused ? (
                                <>
                                    <Timer className="mr-2 h-4 w-4" />
                                    PAUSED ({resumeCountdown}s)
                                </>
                            ) : (
                                <>
                                    <Pause className="mr-2 h-4 w-4 fill-current" />
                                    STOP AUTO-SCROLL
                                </>
                            )
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4 fill-current" />
                                START AUTO-SCROLL
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refresh}
                        disabled={isLoading}
                        className="font-black h-10 px-4 border-2 shadow-sm hover:bg-secondary/80 transition-all hover:scale-102 active:scale-95 disabled:scale-100"
                    >
                        <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        {isLoading ? "SYNCING..." : "FORCE REFRESH"}
                    </Button>
                </div>
            </header>

            {/* Kanban Board */}
            <div 
                className="flex-1 relative overflow-hidden"
                onWheel={triggerPause}
                onMouseDown={triggerPause}
            >
                <div 
                    ref={scrollRef}
                    className="absolute inset-0 overflow-x-auto overflow-y-hidden flex scroll-smooth selection:bg-transparent"
                    style={{ scrollbarWidth: 'thin' }}
                    onScroll={() => {
                        // Only trigger pause on manual scroll (when not being scrolled by auto-scroll)
                        // This is hard to detect perfectly without tracking delta, but onWheel handles most mouse cases.
                    }}
                >
                    <div className="flex h-full w-fit">
                        {isLoading && data.length === 0 ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <StatusColumnSkeleton key={i} />
                            ))
                        ) : (
                            data.map((statusGroup) => (
                                <StatusColumn 
                                    key={statusGroup.status} 
                                    statusGroup={statusGroup} 
                                    bulkAction={bulkAction}
                                />
                            ))
                        )}
                    </div>
                </div>
                
                {/* Visual indicator for loading when we already have data */}
                {isLoading && data.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-40">
                        <div className="h-full bg-primary animate-progress-indeterminate w-1/3"></div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusColumnSkeleton() {
    return (
        <div className="flex flex-col h-full min-w-[280px] w-[280px] border-x bg-background/30 p-3 space-y-4">
            <Skeleton className="h-8 w-full mb-4 opacity-50" />
            <Skeleton className="h-32 w-full opacity-30" />
            <Skeleton className="h-32 w-full opacity-20" />
            <Skeleton className="h-32 w-full opacity-10" />
        </div>
    );
}
