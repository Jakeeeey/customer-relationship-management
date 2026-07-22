"use client";

import React, { useEffect } from 'react';
import { useStockPurchase } from './hooks/useStockPurchase';
import { Separator } from '@/components/ui/separator';
import { WorklistFilters } from './types';

import { StockPurchaseList } from './components/StockPurchaseList';

export const StockPurchasePostingPage = () => {
    const { 
        worklist, 
        isLoading, 
        fetchWorklist, 
        fetchUtilityData, 
        salesmen, 
        customers,
        salesTypes,
        totalCount
    } = useStockPurchase();

    useEffect(() => {
        fetchUtilityData();
    }, [fetchUtilityData]);

    const handleFilterChange = React.useCallback((filters: WorklistFilters) => {
        fetchWorklist(filters);
    }, [fetchWorklist]);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-slate-50/50 dark:bg-[#020617] min-h-screen transition-colors duration-300 relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Stock Purchase</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Audit and manage stock purchase transactions before final settlement.</p>
                <Separator className="mt-2 bg-slate-200 dark:bg-slate-800" />
            </div>
            
            <StockPurchaseList 
                data={worklist} 
                isLoading={isLoading} 
                salesmen={salesmen}
                customers={customers}
                salesTypes={salesTypes}
                totalCount={totalCount}
                onFilterChange={handleFilterChange}
            />
        </div>
    );
};
