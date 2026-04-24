import { useState, useMemo, useEffect } from "react";
import { InventoryItem, GroupedInventoryItem, InventoryReportMode } from "../types";
import { fetchInventoryData } from "../providers/fetchProvider";

export const useInventoryReport = () => {
    const [data, setData] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<InventoryReportMode>("Breakdown");
    const [search, setSearch] = useState("");
    const [selectedBranch, setSelectedBranch] = useState<string>("all");
    const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const result = await fetchInventoryData();
                setData(result);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Extract unique branches and suppliers for filters
    const branches = useMemo(() => {
        const unique = Array.from(new Set(data.map(i => i.branch))).filter(Boolean);
        return [{ value: "all", label: "All Branches" }, ...unique.map(b => ({ value: b, label: b }))];
    }, [data]);

    const suppliers = useMemo(() => {
        const unique = Array.from(new Set(data.map(i => i.supplier))).filter(Boolean);
        return [{ value: "all", label: "All Suppliers" }, ...unique.map(s => ({ value: s, label: s }))];
    }, [data]);

    // 1. Group data based on product (Only re-runs when raw data changes)
    const groupedData = useMemo(() => {
        const groupedMap = new Map<string, GroupedInventoryItem & { targetUnitCount?: number }>();

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            // Group by name components instead of ID to handle cases where IDs might differ for same products
            const key = `${item.supplier.trim()}|${item.branch.trim()}|${item.brand.trim()}|${item.category.trim()}|${item.products.trim()}`;
            
            let g = groupedMap.get(key);
            if (!g) {
                g = {
                    supplier: item.supplier,
                    branch: item.branch,
                    brand: item.brand,
                    category: item.category,
                    products: item.products,
                    productId: item.productId,
                    units: [],
                    box: 0,
                    piece: 0,
                    targetUnitCount: 1
                };
                groupedMap.set(key, g);
            }

            g.units.push({
                unit: item.unit,
                // Breakdown computation: running_inventory / unit_count
                runningInventory: item.runningInventory / (item.unitCount || 1),
                unitCount: item.unitCount,
                barcode: item.barcode
            });

            // For Piece/Box views, we keep summing the RAW runningInventory (total pieces)
            g.piece += item.runningInventory;

            if (item.unit.toUpperCase().includes("BOX") && item.unitCount > 1) {
                g.targetUnitCount = item.unitCount;
            }
        }

        const result: GroupedInventoryItem[] = [];
        groupedMap.forEach(item => {
            result.push({
                ...item,
                box: item.piece / (item.targetUnitCount || 1)
            });
        });

        return result;
    }, [data]);

    // 2. Filter grouped data (Much faster because grouped dataset is smaller)
    const displayData = useMemo(() => {
        let filtered = groupedData;

        // Apply Branch Filter
        if (selectedBranch !== "all") {
            filtered = filtered.filter(item => item.branch === selectedBranch);
        }

        // Apply Supplier Filter
        if (selectedSupplier !== "all") {
            filtered = filtered.filter(item => item.supplier === selectedSupplier);
        }

        // Apply Search Filter
        if (search) {
            const lowSearch = search.toLowerCase();
            filtered = filtered.filter(item => 
                item.products.toLowerCase().includes(lowSearch) ||
                item.brand.toLowerCase().includes(lowSearch) ||
                item.supplier.toLowerCase().includes(lowSearch) ||
                item.category.toLowerCase().includes(lowSearch)
            );
        }

        return filtered;
    }, [groupedData, search, selectedBranch, selectedSupplier]);

    return {
        data: displayData,
        loading,
        error,
        mode,
        setMode,
        search,
        setSearch,
        selectedBranch,
        setSelectedBranch,
        selectedSupplier,
        setSelectedSupplier,
        branches,
        suppliers,
        rawCount: data.length
    };
};
