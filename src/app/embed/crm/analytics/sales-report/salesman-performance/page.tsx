import { SalesmanPerformanceModule } from "@/modules/customer-relationship-management/analytics/sales-report/salesman-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function EmbedSalesmanPerformancePage() {
    return (
        <div className="flex flex-col min-h-screen w-full bg-background overflow-hidden">
            <main className="flex-1 w-full overflow-y-auto p-4">
                <SalesmanPerformanceModule />
            </main>
        </div>
    );
}
