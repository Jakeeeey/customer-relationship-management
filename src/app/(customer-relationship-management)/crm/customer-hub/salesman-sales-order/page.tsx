import { Suspense } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { NavUser } from "@/components/shared/app-sidebar/nav-user";
import SalesmanSalesOrderModule from "@/modules/customer-relationship-management/customer-hub/salesman-sales-order/SalesmanSalesOrderModule";
import { resolveSalesmanContext, type SalesmanContext } from "@/app/api/crm/customer-hub/salesman-sales-order/context";

export const dynamic = "force-dynamic";

export default async function Page() {
    let context: SalesmanContext;
    try {
        context = await resolveSalesmanContext();
    } catch (error) {
        return <div role="alert" className="p-8">{error instanceof Error ? error.message : "Salesman access denied"}</div>;
    }
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16 overflow-hidden">
            <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:px-4 overflow-hidden">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="hidden sm:block mr-2 data-[orientation=vertical]:h-4 shrink-0" />
                <Breadcrumb><BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="#">Customer Hub</BreadcrumbLink></BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem><BreadcrumbPage className="truncate">Salesman Sales Order</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList></Breadcrumb>
            </div>
            <div className="flex h-full items-center px-2 sm:px-4 shrink-0 max-w-[48vw] sm:max-w-none overflow-hidden">
                <NavUser user={{ name: `${context.user.user_fname} ${context.user.user_lname}`.trim(), email: "", avatar: "/avatars/shadcn.jpg" }} />
            </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6 sm:p-8">
            <Suspense fallback={<p>Loading sales order…</p>}><SalesmanSalesOrderModule /></Suspense>
        </main>
    </div>;
}
