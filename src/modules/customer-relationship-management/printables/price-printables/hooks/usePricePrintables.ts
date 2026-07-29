"use client";

import { useState, useEffect } from "react";
import { Salesman, Supplier, Category, Segment } from "../types";
import { fetchProvider } from "../providers/fetchProvider";
import { toast } from "sonner";
import { generatePricePrintablesPDF } from "../utils/generatePricePrintablesPDF";
import { PdfTemplate, pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";

export function usePricePrintables() {
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [templates, setTemplates] = useState<PdfTemplate[]>([]);
    
    // Selection state
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");
    const [selectedSupplierInput, setSelectedSupplierInput] = useState<string>("All");
    const [selectedSegmentInput, setSelectedSegmentInput] = useState<string>("All");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
    
    // Modal/Preview state
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    // Barcode state
    const [showBarcode, setShowBarcode] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Filename state
    const [customFilename, setCustomFilename] = useState<string>("");
    const [isFilenameEdited, setIsFilenameEdited] = useState(false);

    // Update default filename when supplier changes
    useEffect(() => {
        if (!isFilenameEdited) {
            if (selectedSupplierInput !== "All") {
                const supplier = suppliers.find(s => String(s.id) === selectedSupplierInput);
                const name = supplier?.supplier_name || "Supplier";
                setCustomFilename(`${name} Pricelist Booking`);
            } else {
                setCustomFilename("Price List Booking");
            }
        }
    }, [selectedSupplierInput, suppliers, isFilenameEdited]);

    const handleFilenameChange = (val: string) => {
        setCustomFilename(val);
        setIsFilenameEdited(true);
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [sData, suppData, catData, segData, tpls] = await Promise.all([
                    fetchProvider.getSalesmen(),
                    fetchProvider.getSuppliers(),
                    fetchProvider.getCategories(),
                    fetchProvider.getSegments(),
                    pdfTemplateService.fetchTemplates()
                ]);
                
                setSalesmen(sData);
                setSuppliers(suppData);
                setCategories(catData);
                setSegments(segData);
                setTemplates(tpls);
                
                if (tpls.length > 0) {
                    setSelectedTemplateName(tpls[0].name);
                }
            } catch (error) {
                console.error("Error loading selection data:", error);
                toast.error("Failed to load selection data");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleGenerate = async (options?: { download?: boolean }) => {
        if (!selectedSalesmanId || !selectedTemplateName) {
            toast.warning("Please select a salesman and layout");
            return;
        }

        setIsGenerating(true);
        try {
            const data = await fetchProvider.getPriceList(
                Number(selectedSalesmanId), 
                selectedSupplierInput,
                selectedSegmentInput,
                selectedCategoryId === "All" ? "All" : Number(selectedCategoryId)
            );
            
            if (!data || data.length === 0) {
                toast.info("No price data found for the selected criteria");
                return;
            }

            const salesman = salesmen.find(s => s.id === Number(selectedSalesmanId));
            const supplier = selectedSupplierInput !== "All" ? suppliers.find(s => String(s.id) === selectedSupplierInput) : null;
            const segment = selectedSegmentInput !== "All" ? segments.find(s => String(s.id) === selectedSegmentInput) : null;
            const category = selectedCategoryId !== "All" ? categories.find(c => c.id === Number(selectedCategoryId)) : null;

            const doc = await generatePricePrintablesPDF({
                items: data,
                templateName: selectedTemplateName,
                salesmanName: salesman?.salesman_name || "",
                salesmanCode: salesman?.salesman_code || "",
                supplierName: supplier?.supplier_name || "All",
                segmentName: segment?.segment_name || "All",
                categoryName: category?.category_name || "All",
                showBarcode
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
        setShowBarcode
    };
}
