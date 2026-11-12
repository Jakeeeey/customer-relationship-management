import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import SalesOrderAllocationModule from "@/modules/customer-relationship-management/customer-hub/sales-order-allocation/components/AllocationMatrix";

export const dynamic = "force-dynamic";

export default function Page() {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex h-14 shrink-0 items-center border-b bg-background px-4 shadow-sm sm:h-16">
            <SidebarTrigger className="-ml-1 shrink-0" /><Separator orientation="vertical" className="mx-3 h-4" />
            <Breadcrumb><BreadcrumbList><BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="#">Customer Hub</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator className="hidden md:block" /><BreadcrumbItem><BreadcrumbPage>Sales Order Allocation</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8"><SalesOrderAllocationModule /></main>
    </div>;
}
