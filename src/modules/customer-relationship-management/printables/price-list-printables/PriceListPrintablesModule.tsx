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
    Type
} from "lucide-react";
import { usePriceList } from "./hooks/usePriceList";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";

export function PriceListPrintablesModule() {
    const {
        salesmen,
        suppliers,
        templates,
        selectedSalesmanId,
        setSelectedSalesmanId,
        selectedSupplierId,
        setSelectedSupplierId,
        selectedTemplateName,
        setSelectedTemplateName,
        pdfUrl,
        isPreviewOpen,
        closePreview,
        isLoading,
        isGenerating,
        customFilename,
        handleFilenameChange,
        handleGenerate
    } = usePriceList();

    // Mapping for SearchableSelect
    const salesmanOptions = salesmen.map(s => ({
        value: String(s.id),
        label: `${s.salesman_name} (${s.salesman_code})`
    }));

    const supplierOptions = suppliers.map(s => ({
        value: String(s.id),
        label: s.supplier_name
    }));

    const layoutOptions = templates.map(t => ({
        value: t.name,
        label: t.name
    }));

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <Layout className="text-white" size={24} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Price List Printables</h1>
                </div>
                <p className="text-slate-500 font-medium ml-12">Generate and print professional product price lists for specific salesmen and suppliers.</p>
            </header>

            <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-sm border border-white">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-500" size={20} />
                        Selection Criteria
                    </CardTitle>
                    <CardDescription>Select the required details below to generate the price list</CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 pb-4 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Salesman Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Users size={14} className="text-blue-400" />
                                Salesman
                            </Label>
                            <SearchableSelect
                                options={salesmanOptions}
                                value={selectedSalesmanId}
                                onValueChange={setSelectedSalesmanId}
                                placeholder={isLoading ? "Loading salesmen..." : "Select Salesman"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 transition-all hover:bg-white hover:border-blue-200 shadow-sm"
                            />
                        </div>

                        {/* Supplier Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Truck size={14} className="text-blue-400" />
                                Supplier
                            </Label>
                            <SearchableSelect
                                options={supplierOptions}
                                value={selectedSupplierId}
                                onValueChange={setSelectedSupplierId}
                                placeholder={isLoading ? "Loading suppliers..." : "Select Supplier"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 transition-all hover:bg-white hover:border-blue-200 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Layout/Template Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Layout size={14} className="text-blue-400" />
                                PDF Template Layout
                            </Label>
                            <SearchableSelect
                                options={layoutOptions}
                                value={selectedTemplateName}
                                onValueChange={setSelectedTemplateName}
                                placeholder={isLoading ? "Loading layouts..." : "Select Layout"}
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 transition-all hover:bg-white hover:border-blue-200 shadow-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Type size={14} className="text-blue-400" />
                                Export File Name
                            </Label>
                            <Input
                                value={customFilename}
                                onChange={(e) => handleFilenameChange(e.target.value)}
                                placeholder="Enter custom filename..."
                                disabled={isLoading || isGenerating}
                                className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-blue-500/20 px-6 font-bold text-slate-700 transition-all hover:bg-white hover:border-blue-200 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-blue-100">
                            <Layout className="text-blue-500" size={18} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-blue-900 text-sm">Design Selection</h4>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                You can now choose from different <strong>PDF Template Layouts</strong> stored in the system. 
                                Each template provides a unique header and frame for your price list.
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100/50 flex justify-end">
                    <Button 
                        onClick={() => handleGenerate({ download: false })}
                        disabled={isGenerating || !selectedSalesmanId || !selectedSupplierId || !selectedTemplateName}
                        className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:bg-slate-200 disabled:shadow-none"
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
                <div className="p-6 bg-white rounded-3xl shadow-lg shadow-slate-100 border border-slate-100 flex flex-col items-center text-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                        <Badge variant="outline" className="bg-green-500 text-white border-none text-[10px] h-5">1</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900">Configure</h3>
                    <p className="text-xs text-slate-400 font-medium">Pick a salesman, supplier, and your preferred layout.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl shadow-lg shadow-slate-100 border border-slate-100 flex flex-col items-center text-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Badge variant="outline" className="bg-blue-500 text-white border-none text-[10px] h-5">2</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900">Preview</h3>
                    <p className="text-xs text-slate-400 font-medium">Review the price list in a live modal before printing.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl shadow-lg shadow-slate-100 border border-slate-100 flex flex-col items-center text-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                        <Badge variant="outline" className="bg-purple-500 text-white border-none text-[10px] h-5">3</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900">Final Print</h3>
                    <p className="text-xs text-slate-400 font-medium">Use the built-in PDF controls to print or save the document.</p>
                </div>
            </div>

            {/* Print Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-6xl h-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Print Preview</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">Exporting as: <span className="text-blue-600 font-bold">{customFilename}.pdf</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm"
                                    className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-2 px-6 h-10 shadow-lg shadow-blue-200"
                                    onClick={() => handleGenerate({ download: true })}
                                >
                                    <Download size={16} />
                                    Download PDF
                                </Button>
                                <button 
                                    onClick={closePreview}
                                    className="p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-red-500 active:scale-95"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 p-4 md:p-8 flex items-center justify-center relative">
                            {pdfUrl ? (
                                <iframe 
                                    src={pdfUrl} 
                                    className="w-full h-full rounded-2xl border border-slate-200 shadow-xl bg-white"
                                    title="Price List Preview"
                                />
                            ) : (
                                <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
                                    <div className="h-20 w-20 bg-slate-200 rounded-full flex items-center justify-center">
                                        <Layout size={40} />
                                    </div>
                                    <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
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
