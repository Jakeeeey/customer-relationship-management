"use client";

import { useEmployeeStockPurchaseSummary } from "../hooks/useEmployeeStockPurchaseSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from "recharts";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export function SummaryCharts() {
    const { rawData, isLoading } = useEmployeeStockPurchaseSummary();

    const timeSeriesData = useMemo(() => {
        const grouped = new Map<string, number>();
        rawData.forEach(item => {
            // Group by day (YYYY-MM-DD)
            const dateStr = item.created_at ? item.created_at.split('T')[0] : "Unknown";
            const current = grouped.get(dateStr) || 0;
            grouped.set(dateStr, current + (Number(item.amount) || 0));
        });
        
        return Array.from(grouped.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically
    }, [rawData]);

    const companyDistributionData = useMemo(() => {
        const grouped = new Map<string, number>();
        rawData.forEach(item => {
            const company = item.company_name || "Unknown Company";
            const current = grouped.get(company) || 0;
            grouped.set(company, current + 1); // Count by company, or could be amount. The prompt says "pie chart for the company dr" which implies count or amount. We will use Amount for better visualization of stock purchase weight. Wait, let's use Amount.
        });
        
        return Array.from(grouped.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort descending
    }, [rawData]);

    if (isLoading || rawData.length === 0) {
        return null; // Handle loading or empty state gracefully without flickering
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 mb-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Purchases Over Time</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" strokeOpacity={0.2} />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                                tick={{ fontSize: 12 }} 
                                tickLine={false} 
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={{ r: 4, strokeWidth: 2 }} 
                                activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Company Distribution (By Amount)</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={companyDistributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {companyDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
