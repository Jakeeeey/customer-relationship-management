"use client";

import { useSalesOrder } from "./hooks/useSalesOrder";
import { SalesOrderHeader } from "./components/SalesOrderHeader";
import { SalesOrderEncoding } from "./components/SalesOrderEncoding";
import { Loader2 } from "lucide-react";

export default function CreateSalesOrderModule() {
    const {
        salesmen, selectedSalesmanId, handleSalesmanChange, selectedSalesman,
        accounts, selectedAccountId, handleAccountChange, selectedAccount, loadingAccounts,
        customers, selectedCustomerId, handleCustomerChange, selectedCustomer, loadingCustomers,
        suppliers, selectedSupplierId, handleSupplierChange, selectedSupplier, loadingSuppliers,
        receiptTypes, selectedReceiptTypeId, setSelectedReceiptTypeId,
        salesTypes, selectedSalesTypeId, setSelectedSalesTypeId,
        dueDate, setDueDate,
        poNo, setPoNo,
        priceType,
        supplierProducts, loadingProducts,
        lineItems, addProduct, removeLineItem, updateLineItemQty,
        summary, handleSubmitOrder, submitting
    } = useSalesOrder();

    if (salesmen.length === 0 && !loadingAccounts) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 flex flex-col gap-6 animate-in slide-in-from-bottom duration-700">
            {/* Header Section (Dropdowns & Metadata) */}
            <SalesOrderHeader
                salesmen={salesmen}
                selectedSalesman={selectedSalesman}
                onSalesmanChange={handleSalesmanChange}

                accounts={accounts}
                selectedAccount={selectedAccount}
                loadingAccounts={loadingAccounts}
                onAccountChange={handleAccountChange}

                customers={customers}
                selectedCustomer={selectedCustomer}
                loadingCustomers={loadingCustomers}
                onCustomerChange={handleCustomerChange}

                suppliers={suppliers}
                selectedSupplier={selectedSupplier}
                loadingSuppliers={loadingSuppliers}
                onSupplierChange={handleSupplierChange}

                receiptTypes={receiptTypes}
                selectedReceiptTypeId={selectedReceiptTypeId}
                onReceiptTypeChange={setSelectedReceiptTypeId}

                salesTypes={salesTypes}
                selectedSalesTypeId={selectedSalesTypeId}
                onSalesTypeChange={setSelectedSalesTypeId}

                dueDate={dueDate}
                onDueDateChange={setDueDate}

                poNo={poNo}
                onPoNoChange={setPoNo}

                priceType={priceType}
            />

            {/* Encoding & Cart Section */}
            {(selectedCustomerId && selectedSupplierId) ? (
                <SalesOrderEncoding
                    products={supplierProducts}
                    loadingProducts={loadingProducts}
                    lineItems={lineItems}
                    addProduct={addProduct}
                    removeLineItem={removeLineItem}
                    updateLineItemQty={updateLineItemQty}
                    summary={summary}
                    onSubmit={handleSubmitOrder}
                    submitting={submitting}
                />
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-xl bg-muted/10 opacity-60">
                    <div className="p-4 rounded-full bg-primary/10 mb-4">
                        <Loader2 className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Waiting for selection</h3>
                    <p className="text-xs text-muted-foreground mt-1">Please select an Account, Customer, and Supplier above to start encoding.</p>
                </div>
            )}
        </div>
    );
}
