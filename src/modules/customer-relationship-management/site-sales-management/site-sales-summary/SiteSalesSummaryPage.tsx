"use client";

import React, { useEffect } from 'react';
import { useSiteSalesSummary } from './hooks/useSiteSalesSummary';
import { Separator } from '@/components/ui/separator';
import { WorklistFilters } from './types';
import { SiteSalesSummaryList } from './components/SiteSalesSummaryList';


export const SiteSalesSummaryPage = () => {
    const { 
        worklist, 
        isLoading, 
        fetchWorklist, 
        fetchUtilityData, 
        salesmen, 
        customers,
        salesTypes
    } = useSiteSalesSummary();

    useEffect(() => {
        fetchUtilityData();
    }, [fetchUtilityData]);

    const handleFilterChange = React.useCallback((filters: WorklistFilters) => {
        fetchWorklist(filters);
    }, [fetchWorklist]);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-slate-50/50 dark:bg-[#020617] dark:bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] dark:from-slate-900/20 dark:via-slate-950 dark:to-slate-950 min-h-screen transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Site Sales Summary</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Historical record of all site sales transactions.</p>
                <Separator className="mt-2 bg-slate-200 dark:bg-slate-800" />
            </div>
            
            <SiteSalesSummaryList 
                data={worklist} 
                isLoading={isLoading} 
                salesmen={salesmen}
                customers={customers}
                salesTypes={salesTypes}
                onFilterChange={handleFilterChange}
            />
        </div>
    );
};
