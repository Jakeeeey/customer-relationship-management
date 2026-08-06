"use client";

import { useState, useEffect, useMemo } from "react";
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
    const [selectedSupplierInput, setSelectedSupplierInput] = useState<string[]>([]);
    const [selectedSegmentInput, setSelectedSegmentInput] = useState<string[]>(["All"]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string[]>(["All"]);
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
            if (selectedSupplierInput.length > 0) {
                const names = selectedSupplierInput
                    .map(id => suppliers.find(s => String(s.id) === id)?.supplier_name)
                    .filter(Boolean);
                const name = names.length > 0 ? names.join(", ") : "Supplier";
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

    const hasDivision1Supplier = useMemo(() => {
        return selectedSupplierInput.some(id => {
            const s = suppliers.find(sup => String(sup.id) === id);
            const divId = s && typeof s.division_id === 'object' && s.division_id !== null
                ? ((s.division_id as Record<string, unknown>).id ?? (s.division_id as Record<string, unknown>).division_id)
                : s?.division_id;
            return Number(divId) === 1;
        });
    }, [selectedSupplierInput, suppliers]);

    useEffect(() => {
        if (hasDivision1Supplier && templates.length > 0) {
            const legalTemplate = templates.find(t => t.name.toLowerCase().includes("legal"));
            const a4Template = templates.find(t => t.name.toLowerCase().includes("a4"));
            const targetTemplate = legalTemplate || a4Template;
            
            if (targetTemplate) {
                setSelectedTemplateName((prev) => prev !== targetTemplate.name ? targetTemplate.name : prev);
            }
        }
    }, [hasDivision1Supplier, templates]);

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

        if (selectedSupplierInput.length === 0 || selectedSegmentInput.length === 0 || selectedCategoryId.length === 0) {
            toast.warning("Please select at least one supplier, segment, and category");
            return;
        }

        const hasNonDivision1Supplier = selectedSupplierInput.some(id => {
            const s = suppliers.find(sup => String(sup.id) === id);
            const divId = s && typeof s.division_id === 'object' && s.division_id !== null
                ? ((s.division_id as Record<string, unknown>).id ?? (s.division_id as Record<string, unknown>).division_id)
                : s?.division_id;
            return Number(divId) !== 1;
        });

        if (hasDivision1Supplier && hasNonDivision1Supplier) {
            toast.error("Cannot combine these suppliers. The selected suppliers require completely different printable layouts.");
            return;
        }

        setIsGenerating(true);
        try {
            const data = await fetchProvider.getPriceList(
                Number(selectedSalesmanId), 
                selectedSupplierInput.join(","),
                selectedSegmentInput.join(","),
                selectedCategoryId.join(",")
            );
            
            if (!data || data.length === 0) {
                toast.info("No price data found for the selected criteria");
                return;
            }

            const salesman = salesmen.find(s => s.id === Number(selectedSalesmanId));
            const supplierNames = selectedSupplierInput
                .map(id => suppliers.find(s => String(s.id) === id)?.supplier_name)
                .filter(Boolean)
                .join(", ");
            const segmentNames = selectedSegmentInput.includes("All")
                ? "All"
                : selectedSegmentInput
                    .map(id => segments.find(s => String(s.id) === id)?.segment_name)
                    .filter(Boolean)
                    .join(", ");
            const categoryNames = selectedCategoryId.includes("All")
                ? "All"
                : selectedCategoryId
                    .map(id => categories.find(c => String(c.id) === id)?.category_name)
                    .filter(Boolean)
                    .join(", ");

            console.log("Suppliers list data loaded:", suppliers);
            console.log("Price list products data returned:", data);


            const isSerializedLayout = hasDivision1Supplier;

            console.log("Layout switch evaluations - isSerializedLayout:", isSerializedLayout);

            const finalTemplateName = selectedTemplateName;

            const doc = await generatePricePrintablesPDF({
                items: data,
                templateName: finalTemplateName,
                salesmanName: salesman?.salesman_name || "",
                salesmanCode: salesman?.salesman_code || "",
                supplierName: supplierNames || "None",
                segmentName: segmentNames || "None",
                categoryName: categoryNames || "None",
                showBarcode,
                isSerializedLayout
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
        setShowBarcode,
        hasDivision1Supplier
    };
}
