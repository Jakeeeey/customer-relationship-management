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

    const handleGenerate = async () => {
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

            const doc = await generatePriceListPDF({
                items: data,
                priceType: data[0]?.priceType || salesman?.price_type || "A",
                templateName: selectedTemplateName // Pass the selected template
            });

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            
            // Set URL and open preview modal
            setPdfUrl(url);
            setIsPreviewOpen(true);
            
            toast.success("Price list generated for preview");
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
        handleGenerate
    };
}
