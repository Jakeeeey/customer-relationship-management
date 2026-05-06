import { Metadata } from "next";
import SiteSalesNewRecordPage from "@/modules/customer-relationship-management/site-sales-management/site-sales-posting/SiteSalesNewRecordPage";

export const metadata: Metadata = {
    title: "Create Sales Invoice | CRM",
    description: "Generate a new sales invoice and manage product allocation",
};

export default function Page() {
    return <SiteSalesNewRecordPage />;
}
