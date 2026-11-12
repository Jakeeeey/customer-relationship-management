"use client";
import { useEffect, useState, type SetStateAction } from "react";
import { allocationProvider } from "../providers/allocationProvider";
import type { AllocationContext, AllocationSnapshot } from "../types";

export function useAllocationWorkspace() {
    const [context, setContext] = useState<AllocationContext | null>(null);
    const [warehouseId, setWarehouseId] = useState<number | "all" | null>(null);
    const [snapshot, setSnapshot] = useState<AllocationSnapshot | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    useEffect(() => {
        const controller = new AbortController();
        allocationProvider.context(controller.signal).then(result => {
            if (controller.signal.aborted) return;
            setContext(result);
            setWarehouseId("all");
        }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message); setLoading(false); } });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        if (warehouseId === null) return;
        const controller = new AbortController();
        allocationProvider.snapshot(warehouseId, historyPage, controller.signal).then(result => { if (!controller.signal.aborted) setSnapshot(result); })
            .catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [warehouseId, refreshKey, historyPage]);
    function changeWarehouse(id: number | "all") {
        setLoading(true);
        setError("");
        setSnapshot(null);
        setWarehouseId(id);
        setHistoryPage(1);
    }
    function refresh() {
        setLoading(true);
        setError("");
        setSnapshot(null);
        setRefreshKey(value => value + 1);
    }
    function changeHistoryPage(value: SetStateAction<number>) {
        setLoading(true);
        setError("");
        setSnapshot(null);
        setHistoryPage(value);
    }
    return { context, warehouseId, changeWarehouse, snapshot, error, loading, historyPage, setHistoryPage: changeHistoryPage, refresh };
}
