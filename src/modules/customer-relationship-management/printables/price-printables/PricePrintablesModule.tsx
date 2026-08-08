"use client";

import React from "react";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
    Printer, 
    FileText, 
    Loader2, 
    Users, 
    Truck,
    Layout,
    X,
    Download,
    Type,
    Tags,
    Briefcase,
    Barcode
} from "lucide-react";
import { usePricePrintables } from "./hooks/usePricePrintables";
import { Badge } from "@/components/ui/badge";
import { LocalSearchableSelect } from "./components/LocalSearchableSelect";
import { LocalMultiSearchableSelect } from "./components/LocalMultiSearchableSelect";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function PricePrintablesModule() {
    const {
        salesmen,
        suppliers,
        categories,
        segments,
        templates,
        selectedSalesmanId,
        setSelectedSalesmanId,
        selectedSupplierInput,
        setSelectedSupplierInput,
        selectedSegmentInput,
        setSelectedSegmentInput,
        selectedCategoryId,
        setSelectedCategoryId,
        selectedTemplateName,
        setSelectedTemplateName,
        pdfUrl,
        isPreviewOpen,
        closePreview,
        isLoading,
        isGenerating,
        customFilename,
        handleFilenameChange,
        handleGenerate,
        showBarcode,
        setShowBarcode,
        hasDivision1Supplier,
        hasSupplierConflict
    } = usePricePrintables();

    // Mapping for SearchableSelect
    const salesmanOptions = salesmen.map(s => ({
        value: String(s.id),
        label: `${s.salesman_name} (${s.salesman_code})`
    }));

    const supplierOptions = suppliers.map(s => ({
        value: String(s.id),
        label: s.supplier_name
    }));

    const segmentOptions = [
        { value: "All", label: "All" },
        ...segments.map(s => ({
            value: String(s.id),
            label: s.segment_name
        }))
    ];

    const categoryOptions = [
        { value: "All", label: "All" },
        ...categories.map(c => ({
            value: String(c.id),
            label: `${c.category_name} (${c.id})`
        }))
    ];

    const layoutOptions = templates
        .filter(t => {
            if (hasDivision1Supplier) {
                const name = t.name.toLowerCase();
                return name.includes("legal") || name.includes("a4");
            }
            return true;
        })
        .map(t => ({
            value: t.name,
            label: t.name
        }));

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                        <Layout className="text-white" size={24} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Price Printables</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium ml-12">Generate and print professional product price lists by salesman, supplier, segment, and category.</p>
            </header>

            <Card className="border-none shadow-2xl shadow-slate-200/60 dark:shadow-none rounded-[2.5rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-white dark:border-slate-800/50">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <FileText className="text-blue-500" size={20} />
                        Selection Criteria
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">Select the required details below to generate the price list</CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 pb-4 space-y-8">
                    {/* Row 1: Salesman & Supplier */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Users size={14} className="text-blue-400" />
                                Salesman <span className="text-red-500">*</span>
                            </Label>
                            <LocalSearchableSelect
                                options={salesmanOptions}
                                value={selectedSalesmanId}
                                onValueChange={setSelectedSalesmanId}
                                placeholder={isLoading ? "Loading salesmen..." : "Select Salesman"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 shadow-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Truck size={14} className="text-blue-400" />
                                Suppliers <span className="text-red-500">*</span>
                            </Label>
                            <LocalMultiSearchableSelect
                                options={supplierOptions}
                                value={selectedSupplierInput}
                                onValueChange={setSelectedSupplierInput}
                                placeholder={isLoading ? "Loading suppliers..." : "Select Suppliers"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Row 2: Segment & Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Briefcase size={14} className="text-blue-400" />
                                Segments <span className="text-red-500">*</span>
                            </Label>
                            <LocalMultiSearchableSelect
                                options={segmentOptions}
                                value={selectedSegmentInput}
                                onValueChange={setSelectedSegmentInput}
                                placeholder={isLoading ? "Loading segments..." : "Select Segments"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 shadow-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Tags size={14} className="text-blue-400" />
                                Categories <span className="text-red-500">*</span>
                            </Label>
                            <LocalMultiSearchableSelect
                                options={categoryOptions}
                                value={selectedCategoryId}
                                onValueChange={setSelectedCategoryId}
                                placeholder={isLoading ? "Loading categories..." : "Select Categories"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Layout/Template Selection & Filename */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Layout size={14} className="text-blue-400" />
                                PDF Template Layout
                            </Label>
                            <LocalSearchableSelect
                                options={layoutOptions}
                                value={selectedTemplateName}
                                onValueChange={setSelectedTemplateName}
                                placeholder={isLoading ? "Loading layouts..." : "Select Layout"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 shadow-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Type size={14} className="text-blue-400" />
                                Export File Name
                            </Label>
                            <Input
                                value={customFilename}
                                onChange={(e) => handleFilenameChange(e.target.value)}
                                placeholder="Enter custom filename..."
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 px-6 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Barcode size={16} className="text-blue-500" />
                                    Show Barcode
                                </Label>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Include product barcodes in the printout if available</p>
                            </div>
                            <Switch
                                checked={showBarcode}
                                onCheckedChange={setShowBarcode}
                                disabled={isLoading || isGenerating || hasDivision1Supplier}
                                className="data-[state=checked]:bg-blue-600"
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-blue-50/50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900 flex items-start gap-4">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900">
                            <Layout className="text-blue-500" size={18} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">Design Selection</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                                You can now choose from different <strong>PDF Template Layouts</strong> stored in the system. 
                                Each template provides a unique header and frame for your price list.
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100/50 dark:border-slate-800/50 flex justify-end">
                    <Button 
                        onClick={() => handleGenerate({ download: false })}
                        disabled={isGenerating || hasSupplierConflict || !selectedSalesmanId || !selectedTemplateName || selectedSupplierInput.length === 0 || selectedSegmentInput.length === 0 || selectedCategoryId.length === 0}
                        className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none dark:disabled:bg-slate-800"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 animate-spin" size={20} />
                                Preparing Print...
                            </>
                        ) : (
                            <>
                                <Printer className="mr-2" size={20} />
                                Print Price List
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                        <Badge variant="outline" className="bg-green-500 text-white border-none text-[10px] h-5">1</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Configure</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Pick a salesman, supplier, segment, and category.</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                        <Badge variant="outline" className="bg-blue-500 text-white border-none text-[10px] h-5">2</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Preview</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Review the price list in a live modal before printing.</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                        <Badge variant="outline" className="bg-purple-500 text-white border-none text-[10px] h-5">3</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Final Print</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Use the built-in PDF controls to print or save the document.</p>
                </div>
            </div>

            {/* Print Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Print Preview</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Exporting as: <span className="text-blue-600 font-bold">{customFilename}.pdf</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm"
                                    className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-2 px-6 h-10 shadow-lg shadow-blue-200 dark:shadow-none"
                                    onClick={() => handleGenerate({ download: true })}
                                >
                                    <Download size={16} />
                                    Download PDF
                                </Button>
                                <button 
                                    onClick={closePreview}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-red-500 active:scale-95"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-8 flex items-center justify-center relative">
                            {pdfUrl ? (
                                <iframe 
                                    src={pdfUrl} 
                                    className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-950"
                                    title="Price List Preview"
                                />
                            ) : (
                                <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
                                    <div className="h-20 w-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                        <Layout size={40} />
                                    </div>
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                                    <p className="text-sm font-bold">Preparing preview...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
