import { Metadata } from "next";
import { StockPurchaseNewRecordPage } from "@/modules/customer-relationship-management/customer-hub/stock-purchase";

export const metadata: Metadata = {
    title: "Create Stock Purchase | CRM",
    description: "Generate a new stock purchase transaction and manage product allocation",
};

export default function Page() {
    return <StockPurchaseNewRecordPage />;
}
