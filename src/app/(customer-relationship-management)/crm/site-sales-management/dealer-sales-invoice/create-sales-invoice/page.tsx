import { Metadata } from "next";
import { DealerSalesInvoiceNewRecordPage } from "@/modules/customer-relationship-management/site-sales-management/dealer-sales-invoice";

export const metadata: Metadata = {
    title: "Create Dealer Sales Invoice | CRM",
    description: "Generate a new dealer sales invoice and manage product allocation",
};

export default function Page() {
    return <DealerSalesInvoiceNewRecordPage />;
}
