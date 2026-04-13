import React from "react";
import { DailyActionPlan } from "../types";
import { cn } from "@/lib/utils";
import { format, startOfMonth, getDay, isToday } from "date-fns";

interface TaskCalendarProps {
    days: Date[];
    getTasksForDay: (day: Date) => DailyActionPlan[];
    onDayClick: (day: Date) => void;
    selectedEmployeeId: string;
    selectedSalesmanId: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TaskCalendarComponent: React.FC<TaskCalendarProps> = ({
    days,
    getTasksForDay,
    onDayClick,
    selectedEmployeeId,
    selectedSalesmanId,
}) => {
    // Fill leading empty days
    const firstDayOfMonth = getDay(startOfMonth(days[0]));
    const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const getDayColor = (accomplished: number, total: number) => {
        if (total === 0) return "bg-background/20 border-border";
        const ratio = accomplished / total;
        if (ratio === 0) return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
        if (ratio < 0.5) return "bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300";
        if (ratio < 1) return "bg-emerald-500/40 border-emerald-500/60 text-emerald-900 dark:text-emerald-200";
        return "bg-emerald-500/70 border-emerald-500 text-white shadow-lg shadow-emerald-500/20";
    };

    return (
        <div className="w-full bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden glassmorphism">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
                {WEEKDAYS.map((day) => (
                    <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border/30">
                {padding.map((p) => (
                    <div key={`pad-${p}`} className="h-28 md:h-32 bg-muted/10 opacity-50" />
                ))}

                {days.map((day) => {
                    const tasks = getTasksForDay(day);
                    const total = tasks.length;
                    const accomplished = tasks.filter(t => t.is_completed === 1).length;
                    const colorClass = getDayColor(accomplished, total);
                    const isCurrentToday = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDayClick(day)}
                            className={cn(
                                "h-28 md:h-32 p-3 bg-card transition-all cursor-pointer group relative flex flex-col justify-between hover:z-10 hover:shadow-2xl",
                                isCurrentToday && "ring-2 ring-primary ring-inset"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <span className={cn(
                                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                    isCurrentToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    {format(day, "d")}
                                </span>
                            </div>

                            {selectedEmployeeId !== "all" && selectedSalesmanId !== "all" && (
                                <div className={cn(
                                    "mt-auto rounded-lg border p-2 flex flex-col gap-1 transition-all duration-300 group-hover:translate-y-[-2px]",
                                    colorClass
                                )}>
                                    <div className="text-[10px] uppercase font-heavy tracking-tighter opacity-80 leading-none">Status</div>
                                    <div className="text-sm font-black flex items-baseline gap-1">
                                        <span className="text-lg">{accomplished}</span>
                                        <span className="opacity-50 text-xs">/ {total}</span>
                                    </div>
                                    
                                    {total > 0 && (
                                        <div className="w-full h-1 bg-black/10 rounded-full mt-1 overflow-hidden">
                                            <div 
                                                className="h-full bg-current opacity-80" 
                                                style={{ width: `${(accomplished / total) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Hover micro-animation effect */}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-none" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const TaskCalendar = React.memo(TaskCalendarComponent);
TaskCalendar.displayName = "TaskCalendar";
