"use client";

import React, { useState } from "react";
import { useServiceInvoicing } from "./hooks/useServiceInvoicing";
import { ServiceInvoicingHeader } from "./components/ServiceInvoicingHeader";
import { ServiceInvoicingLineItems } from "./components/ServiceInvoicingLineItems";
import { ServiceInvoicesHistoryTable } from "./components/ServiceInvoicesHistoryTable";
import { ReceiptText, Plus, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceInvoiceHeaderRecord } from "./types";

export default function ServiceInvoicingModule() {
    const [viewMode, setViewMode] = useState<"list" | "form">("list");

    const {
        salesmen,
        selectedSalesman,
        handleSalesmanChange,

        accounts,
        selectedAccount,
        loadingAccounts,
        handleAccountChange,

        customers,
        selectedCustomer,
        loadingCustomers,
        handleCustomerChange,
        customerSearch,
        setCustomerSearch,
        hasMoreCustomers,
        loadingMoreCustomers,
        loadMoreCustomers,

        branches,
        selectedBranchId,
        setSelectedBranchId,

        receiptTypes,
        selectedReceiptTypeId,
        setSelectedReceiptTypeId,

        salesTypes,
        selectedSalesTypeId,
        setSelectedSalesTypeId,

        priceTypeId,
        priceTypeModels,
        handlePriceTypeIdChange,

        paymentTerms,
        setPaymentTerms,
        paymentTermsList,

        customerReceivable,
        loadingReceivable,

        invoiceDate,
        setInvoiceDate,
        dueDate,
        setDueDate,
        dispatchDate,
        setDispatchDate,
        orderId,
        setOrderId,
        invoiceNo,
        setInvoiceNo,
        invoiceNoExists,
        checkingInvoiceNo,
        generateSuggestedInvoiceNo,
        invoiceRemarks,
        setInvoiceRemarks,

        vatMode,
        setVatMode,
        ewtRate,
        setEwtRate,

        lineItems,
        addLineItem,
        removeLineItem,
        duplicateLineItem,
        updateLineItem,
        summary,

        editingInvoiceId,
        submitting,
        handleSubmitInvoice,
        resetForm,
        loadInvoiceForEdit,
        handlePostInvoice,
        serviceInvoices,
        loadingInvoices,
        invoiceSearch,
        setInvoiceSearch,
        fetchServiceInvoices,
    } = useServiceInvoicing();

    const handleOpenNewInvoice = () => {
        resetForm();
        setViewMode("form");
    };

    const handleOpenEditInvoice = async (record: ServiceInvoiceHeaderRecord) => {
        await loadInvoiceForEdit(record);
        setViewMode("form");
    };

    const handleBackToList = () => {
        resetForm();
        setViewMode("list");
    };

    const handleSaveInvoice = async () => {
        const ok = await handleSubmitInvoice();
        if (ok) {
            setViewMode("list");
        }
    };

    return (
        <div className="w-full flex flex-col gap-8 animate-in slide-in-from-bottom duration-700">
            {/* Module Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <ReceiptText className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-3xl font-black tracking-tighter text-foreground">
                                {viewMode === "form"
                                    ? editingInvoiceId
                                        ? "Update Service Invoice"
                                        : "Add Service Invoice"
                                    : "Service Invoicing"}
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                Dynamic Lines
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            {viewMode === "form"
                                ? "Fill in the Sales Order header details and encode dynamic service line items"
                                : "Manage service and non-catalog invoices with dynamic line items"}
                        </p>
                    </div>
                </div>

                {viewMode === "list" ? (
                    <Button
                        type="button"
                        onClick={handleOpenNewInvoice}
                        className="h-10 px-5 font-bold gap-2 shadow-sm shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Service Invoice</span>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackToList}
                        className="h-10 px-4 font-bold gap-2 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to List</span>
                    </Button>
                )}
            </div>

            {viewMode === "list" ? (
                /* 1. Service Invoices List View */
                <ServiceInvoicesHistoryTable
                    invoices={serviceInvoices}
                    loading={loadingInvoices}
                    search={invoiceSearch}
                    onSearchChange={setInvoiceSearch}
                    onRefresh={() => fetchServiceInvoices(invoiceSearch)}
                    onAddInvoice={handleOpenNewInvoice}
                    onEditInvoice={handleOpenEditInvoice}
                    onPostInvoice={handlePostInvoice}
                />
            ) : (
                /* 2. Add / Edit Service Invoice Form View */
                <>
                    <ServiceInvoicingHeader
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
                        customerSearch={customerSearch}
                        onCustomerSearchChange={setCustomerSearch}
                        loadingMoreCustomers={loadingMoreCustomers}
                        onLoadMoreCustomers={loadMoreCustomers}
                        hasMoreCustomers={hasMoreCustomers}
                        receiptTypes={receiptTypes}
                        selectedReceiptTypeId={selectedReceiptTypeId}
                        onReceiptTypeChange={setSelectedReceiptTypeId}
                        salesTypes={salesTypes}
                        selectedSalesTypeId={selectedSalesTypeId}
                        onSalesTypeChange={setSelectedSalesTypeId}
                        invoiceDate={invoiceDate}
                        onInvoiceDateChange={setInvoiceDate}
                        dueDate={dueDate}
                        onDueDateChange={setDueDate}
                        dispatchDate={dispatchDate}
                        onDispatchDateChange={setDispatchDate}
                        orderId={orderId}
                        onOrderIdChange={setOrderId}
                        invoiceNo={invoiceNo}
                        onInvoiceNoChange={setInvoiceNo}
                        invoiceNoExists={invoiceNoExists}
                        checkingInvoiceNo={checkingInvoiceNo}
                        onGenerateInvoiceNo={generateSuggestedInvoiceNo}
                        branches={branches}
                        selectedBranchId={selectedBranchId}
                        onBranchChange={setSelectedBranchId}
                        priceTypeId={priceTypeId}
                        priceTypeModels={priceTypeModels}
                        onPriceTypeChange={handlePriceTypeIdChange}
                        paymentTerms={paymentTerms}
                        onPaymentTermsChange={setPaymentTerms}
                        paymentTermsList={paymentTermsList}
                        customerReceivable={customerReceivable}
                        loadingReceivable={loadingReceivable}
                        editingInvoiceId={editingInvoiceId}
                    />

                    <ServiceInvoicingLineItems
                        lineItems={lineItems}
                        onAddLine={addLineItem}
                        onRemoveLine={removeLineItem}
                        onDuplicateLine={duplicateLineItem}
                        onUpdateLine={updateLineItem}
                        summary={summary}
                        vatMode={vatMode}
                        onVatModeChange={setVatMode}
                        ewtRate={ewtRate}
                        onEwtRateChange={setEwtRate}
                        invoiceRemarks={invoiceRemarks}
                        onInvoiceRemarksChange={setInvoiceRemarks}
                        onSubmit={handleSaveInvoice}
                        onReset={handleBackToList}
                        submitting={submitting}
                        editingInvoiceId={editingInvoiceId}
                    />
                </>
            )}
        </div>
    );
}


