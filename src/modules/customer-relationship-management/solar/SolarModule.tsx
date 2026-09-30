"use client";

import React, { useState } from "react";
import { useSolarCalculator } from "./hooks/useSolarCalculator";
import { useSolarQuotations } from "./hooks/useSolarQuotations";
import { CustomerSelector } from "./components/CustomerSelector";
import { SolarKPICards } from "./components/SolarKPICards";
import { SolarConfigCard } from "./components/SolarConfigCard";
import { SolarAnalyticsCard } from "./components/SolarAnalyticsCard";
import { SolarBOMSchedule } from "./components/SolarBOMSchedule";
import { SolarHistoryTable } from "./components/SolarHistoryTable";
import { SolarPrintView } from "./components/SolarPrintView";
import { CustomerOption, SolarQuotation } from "./types/solar.schema";
import { 
  Calculator, 
  Save, 
  RotateCcw, 
  Printer, 
  History, 
  Sun, 
  Sparkles, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function SolarModule() {
  const [activeTab, setActiveTab] = useState<string>("calculator");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const {
    formData,
    calculation,
    updateField,
    resetForm,
    loadQuotation,
  } = useSolarCalculator();

  const {
    quotations,
    isLoading: isLoadingQuotations,
    isSaving,
    refresh: refreshQuotations,
    saveQuotation,
    deleteQuotation,
  } = useSolarQuotations();

  const handleSelectCustomer = (cust: CustomerOption) => {
    setSelectedCustomer(cust);
    updateField("customerId", cust.id);
    toast.info(`Selected customer: ${cust.customer_name}`);
  };

  const handleSave = async () => {
    if (!formData.customerId) {
      toast.error("Please select a customer first before saving to database");
      return;
    }

    const res = await saveQuotation({
      input: formData,
      calculation,
      customer: selectedCustomer ? {
        customer_name: selectedCustomer.customer_name,
        customer_code: selectedCustomer.customer_code,
        store_name: selectedCustomer.store_name || "",
        city: selectedCustomer.city || "",
        province: selectedCustomer.province || "",
        contact_number: selectedCustomer.contact_number || "",
      } : undefined,
    });

    if (res) {
      setActiveTab("history");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLoadSavedQuotation = (q: SolarQuotation) => {
    loadQuotation({
      customerId: q.customer_id,
      inputMode: q.input_mode || "amount",
      billMonth1: q.bill_month_1 || 0,
      billMonth2: q.bill_month_2 || 0,
      billMonth3: q.bill_month_3 || 0,
      kwhMonth1: q.kwh_month_1 || 0,
      kwhMonth2: q.kwh_month_2 || 0,
      kwhMonth3: q.kwh_month_3 || 0,
      electricityRate: q.electricity_rate,
      designAllowance: q.design_allowance_percent,
      systemType: q.system_type,
      panelWattage: q.panel_wattage as 620 | 680 | 720,
      notes: q.notes || "",
    });

    setSelectedCustomer({
      id: q.customer_id,
      customer_code: q.customer_code || `CUST-${q.customer_id}`,
      customer_name: q.customer_name || `Customer #${q.customer_id}`,
      store_name: q.store_name,
      city: q.city,
      province: q.province,
      contact_number: q.contact_number,
    });

    setActiveTab("calculator");
    toast.success(`Loaded quotation ${q.quotation_code}`);
  };

  const handleFillDemo = () => {
    loadQuotation({
      billMonth1: 10000,
      billMonth2: 10000,
      billMonth3: 1000,
      electricityRate: 12.5,
      designAllowance: 30,
      systemType: "hybrid",
      panelWattage: 680,
    });
    toast.success("Loaded demo calculation data (₱10,000 / ₱10,000 / ₱1,000)");
  };

  const handleReset = () => {
    resetForm();
    setSelectedCustomer(null);
    toast.info("Calculator reset to clean state");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner / Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-6 sm:p-7 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Sun className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Solar Assessment & Engineering Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Custom sizing, storage analysis, Bill of Materials, and proposal generation for CRM accounts
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleFillDemo}
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            title="Load demo calculation values"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sample Demo</span>
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Assessment</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-xl h-11 w-full sm:w-auto inline-flex">
          <TabsTrigger
            value="calculator"
            className="rounded-lg px-4 font-bold text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <span>Assessment & Sizing Studio</span>
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="rounded-lg px-4 font-bold text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Saved Records</span>
            {quotations.length > 0 && (
              <span className="ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-black bg-primary text-primary-foreground">
                {quotations.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Studio */}
        <TabsContent value="calculator" className="space-y-6 focus-visible:outline-none">
          {/* Executive Top KPI Cards */}
          <SolarKPICards calc={calculation} />

          {/* Customer Selection Card */}
          <CustomerSelector
            selectedCustomerId={formData.customerId}
            onSelectCustomer={handleSelectCustomer}
            selectedCustomerData={selectedCustomer}
          />

          {/* Main 2-Column Assessment Studio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Configuration & Input */}
            <div className="lg:col-span-6 flex">
              <div className="w-full flex flex-col">
                <SolarConfigCard
                  formData={formData}
                  updateField={updateField}
                  selectedCustomer={selectedCustomer}
                />
              </div>
            </div>

            {/* Right Column: Engineering Yield & Financial Impact */}
            <div className="lg:col-span-6 flex">
              <div className="w-full flex flex-col">
                <SolarAnalyticsCard
                  calc={calculation}
                  electricityRate={formData.electricityRate}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section: Bill of Materials & Deployment Schedule */}
          <SolarBOMSchedule
            calc={calculation}
            designAllowance={formData.designAllowance}
            onPrint={handlePrint}
          />

          {/* Hidden Print Document Layout */}
          <SolarPrintView
            input={formData}
            calc={calculation}
            customer={selectedCustomer}
          />
        </TabsContent>

        {/* Tab 2: Saved Records History */}
        <TabsContent value="history" className="focus-visible:outline-none">
          <SolarHistoryTable
            quotations={quotations}
            isLoading={isLoadingQuotations}
            onRefresh={refreshQuotations}
            onLoadQuotation={handleLoadSavedQuotation}
            onDeleteQuotation={deleteQuotation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
