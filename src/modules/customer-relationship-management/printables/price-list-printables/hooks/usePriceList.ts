"use client";

import { useState, useEffect } from "react";
import { Salesman, Supplier } from "../types";
import { fetchProvider } from "../providers/fetchProvider";
import { toast } from "sonner";
import { generatePriceListPDF } from "../utils/generatePriceListPDF";
import { PdfTemplate, pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";

export function usePriceList() {
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [templates, setTemplates] = useState<PdfTemplate[]>([]);
    
    // Selection state
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
    
    // Modal/Preview state
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Filename state
    const [customFilename, setCustomFilename] = useState<string>("");
    const [isFilenameEdited, setIsFilenameEdited] = useState(false);

    // Update default filename when supplier changes
    useEffect(() => {
        if (!isFilenameEdited && selectedSupplierId && suppliers.length > 0) {
            const supplier = suppliers.find(s => s.id === Number(selectedSupplierId));
            if (supplier) {
                const shortcut = supplier.supplier_shortcut || supplier.supplier_name;
                setCustomFilename(`${shortcut} Pricelist Booking`);
            }
        }
    }, [selectedSupplierId, suppliers, isFilenameEdited]);

    const handleFilenameChange = (val: string) => {
        setCustomFilename(val);
        setIsFilenameEdited(true);
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [sData, suppData, tpls] = await Promise.all([
                    fetchProvider.getSalesmen(),
                    fetchProvider.getSuppliers(),
                    pdfTemplateService.fetchTemplates()
                ]);
                
                setSalesmen(sData);
                setSuppliers(suppData);
                setTemplates(tpls);
                
                if (tpls.length > 0) {
                    setSelectedTemplateName(tpls[0].name);
                }
            } catch (error) {
                console.error("Error loading selection data:", error);
                toast.error("Failed to load salesmen, suppliers, or templates");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleGenerate = async (options?: { download?: boolean }) => {
        if (!selectedSalesmanId || !selectedSupplierId || !selectedTemplateName) {
            toast.warning("Please select a salesman, supplier, and layout");
            return;
        }

        setIsGenerating(true);
        try {
            const data = await fetchProvider.getPriceList(Number(selectedSalesmanId), Number(selectedSupplierId));
            
            if (!data || data.length === 0) {
                toast.info("No price data found for the selected criteria");
                return;
            }

            const salesman = salesmen.find(s => s.id === Number(selectedSalesmanId));
            const supplier = suppliers.find(s => s.id === Number(selectedSupplierId));

            const doc = await generatePriceListPDF({
                items: data,
                templateName: selectedTemplateName,
                salesmanName: salesman?.salesman_name || "",
                salesmanCode: salesman?.salesman_code || "",
                supplierName: supplier?.supplier_name || ""
            });

            // Handle Download if requested
            if (options?.download) {
                doc.save(`${customFilename || "PriceList"}.pdf`);
            }

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            
            // Set URL and open preview modal
            setPdfUrl(url);
            setIsPreviewOpen(true);
            
            if (options?.download) {
                toast.success("Price list downloaded and ready for preview");
            } else {
                toast.success("Price list generated for preview");
            }
        } catch (error) {
            console.error("Error generating price list:", error);
            toast.error("Failed to generate price list");
        } finally {
            setIsGenerating(false);
        }
    };

    const closePreview = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(null);
        setIsPreviewOpen(false);
    };

    return {
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
    };
}
