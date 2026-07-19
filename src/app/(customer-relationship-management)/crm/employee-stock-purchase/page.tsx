import React from "react";
import { EmployeeStockPurchaseModule, EmployeeStockPurchaseProvider } from "@/modules/customer-relationship-management/employee-stock-purchase";

export default function EmployeeStockPurchasePage() {
    return (
        <EmployeeStockPurchaseProvider>
            <EmployeeStockPurchaseModule />
        </EmployeeStockPurchaseProvider>
    );
}
