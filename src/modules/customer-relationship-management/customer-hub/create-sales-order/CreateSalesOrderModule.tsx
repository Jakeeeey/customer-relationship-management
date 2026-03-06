"use client";

import { useSalesOrder } from "./hooks/useSalesOrder";
import { SalesOrderHeader } from "./components/SalesOrderHeader";
import { SalesOrderEncoding } from "./components/SalesOrderEncoding";
import { SalesOrderCheckout } from "./components/SalesOrderCheckout";
import { Loader2, PackagePlus } from "lucide-react";

export default function CreateSalesOrderModule() {
    const {
        salesmen, selectedSalesmanId, handleSalesmanChange, selectedSalesman,
        accounts, handleAccountChange, selectedAccount, loadingAccounts,
        customers, selectedCustomerId, handleCustomerChange, selectedCustomer, loadingCustomers,
        suppliers, selectedSupplierId, handleSupplierChange, selectedSupplier, loadingSuppliers,
        receiptTypes, selectedReceiptTypeId, setSelectedReceiptTypeId, selectedReceiptType,
        salesTypes, selectedSalesTypeId, setSelectedSalesTypeId, selectedSalesType,
        dueDate, setDueDate,
        deliveryDate, setDeliveryDate,
        poNo, setPoNo,
        priceType,
        supplierProducts, loadingProducts,
        lineItems, addProduct, removeLineItem, updateLineItemQty,
        summary, isValidAllocation,
        isCheckout, setIsCheckout, orderNo, enterCheckout, allocatedQuantities, updateAllocatedQty,
        orderRemarks, setOrderRemarks,
        handleSubmitOrder, submitting
    } = useSalesOrder();

    if (salesmen.length === 0 && !loadingAccounts) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-8 animate-in slide-in-from-bottom duration-700">
            {/* Standardized Module Header */}
            {!isCheckout && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <PackagePlus className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Create Sales Order</h1>
                            <p className="text-sm text-muted-foreground font-medium">Generate new sales transactions and manage allocation</p>
                        </div>
                    </div>
                </div>
            )}

            {isCheckout ? (
                <SalesOrderCheckout
                    orderNo={orderNo}
                    lineItems={lineItems}
                    allocatedQuantities={allocatedQuantities}
                    updateAllocatedQty={updateAllocatedQty}
                    summary={summary}
                    onBack={() => setIsCheckout(false)}
                    onConfirm={handleSubmitOrder}
                    submitting={submitting}
                    isValidAllocation={isValidAllocation}
                    orderRemarks={orderRemarks}
                    setOrderRemarks={setOrderRemarks}
                    header={{
                        salesman: salesmen.find(s => (s.user_id || s.id)?.toString() === selectedSalesmanId) || null,
                        account: selectedAccount || null,
                        customer: selectedCustomer || null,
                        supplier: selectedSupplier || null,
                        receiptType: selectedReceiptType || null,
                        salesType: selectedSalesType || null,
                        dueDate,
                        deliveryDate,
                        poNo
                    }}
                />
            ) : (
                <>
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

                        deliveryDate={deliveryDate}
                        onDeliveryDateChange={setDeliveryDate}

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
                            onSubmit={enterCheckout}
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
                </>
            )}
        </div>
    );
}
