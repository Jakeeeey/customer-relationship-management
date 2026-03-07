"use client";

import { useCallSheetForm } from "./hooks/useCallSheetForm";
import { CallSheetFilterCard } from "./components/CallSheetFilterCard";
import { PrintableTable } from "./components/PrintableTable";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { generateCallSheetPDF } from "./utils/generatePDF";
import { useEffect, useState } from "react";

export default function CallSheetPrintableModule() {
    const [printDate, setPrintDate] = useState<string>("");

    useEffect(() => {
        // Fix for React Hydration Error: set date only on client mount
        // Use a small delay/microtask to avoid synchronous setState warning in effect
        const timer = setTimeout(() => {
            setPrintDate(new Date().toLocaleString());
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const {
        salesmen,
        selectedSalesman,
        accounts,
        selectedAccount,
        loadingAccounts,
        customers,
        selectedCustomer,
        loadingCustomers,
        suppliers,
        selectedSupplier,
        loadingSuppliers,
        products,
        loadingProducts,
        moAvgData,
        handleSalesmanChange,
        handleAccountChange,
        handleCustomerChange,
        handleSupplierChange
    } = useCallSheetForm();

    const handlePreview = () => {
        if (!selectedCustomer || !selectedSupplier) return;
        const doc = generateCallSheetPDF({
            customer: selectedCustomer,
            supplier: selectedSupplier,
            products,
            moAvgData,
            salesman: selectedSalesman,
            account: selectedAccount
        });
        const url = doc.output("bloburl");
        setPreviewUrl(url ? url.toString() : null);
        setPreviewOpen(true);
    };

    const handleDownload = () => {
        if (!selectedCustomer || !selectedSupplier) return;
        const doc = generateCallSheetPDF({
            customer: selectedCustomer,
            supplier: selectedSupplier,
            products,
            salesman: selectedSalesman,
            account: selectedAccount
        });
        doc.save(`Callsheet_${selectedCustomer.customer_code}.pdf`);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* INVISIBLE PRINT HEADER */}
            <div className="hidden print:flex justify-between items-start mb-4 border-b pb-4 border-black">
                <div>
                    <h1 className="text-xl font-bold uppercase">{selectedCustomer?.customer_name || "CUSTOMER NAME"}</h1>
                    <p className="text-sm">CODE: {selectedCustomer?.customer_code || "N/A"}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-bold uppercase">CALLSHEET PRINTABLE</h2>
                    <p className="text-xs text-muted-foreground">Date Printed: {printDate}</p>
                </div>
            </div>

            <CallSheetFilterCard
                salesmen={salesmen}
                selectedSalesman={selectedSalesman}
                accounts={accounts}
                selectedAccount={selectedAccount}
                loadingAccounts={loadingAccounts}
                customers={customers}
                selectedCustomer={selectedCustomer}
                loadingCustomers={loadingCustomers}
                suppliers={suppliers}
                selectedSupplier={selectedSupplier}
                loadingSuppliers={loadingSuppliers}
                onSalesmanChange={handleSalesmanChange}
                onAccountChange={handleAccountChange}
                onCustomerChange={handleCustomerChange}
                onSupplierChange={handleSupplierChange}
                onPreview={handlePreview}
                onPrint={handleDownload}
            />

            <PrintableTable
                supplier={selectedSupplier}
                products={products}
                loadingProducts={loadingProducts}
                moAvgData={moAvgData}
            />

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-[80vw] h-[90vh] flex flex-col p-4">
                    <DialogHeader>
                        <DialogTitle>Callsheet PDF Preview</DialogTitle>
                    </DialogHeader>
                    {previewUrl && (
                        <iframe src={previewUrl} className="w-full h-full border rounded-md" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
