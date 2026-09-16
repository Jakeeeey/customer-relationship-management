import CustomerModule from "@/modules/customer-relationship-management/customer-management/customer/CustomerModule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function EmbedCustomerPage() {
    return (
        <div className="flex flex-col min-h-screen w-full bg-background overflow-hidden">
            <main className="flex-1 w-full overflow-y-auto p-4">
                <CustomerModule />
            </main>
        </div>
    );
}
