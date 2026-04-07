"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertTriangle, CheckCircle2, ChevronsUpDown, Search, Loader2, Check } from "lucide-react";
import { Salesman } from "../../types";
import { salesmanProvider } from "../../providers/fetchProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SuccessionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedSalesman: Salesman | null;
    customerCount: number;
    onSuccess: () => void;
}

export function SuccessionModal({
                                    open,
                                    onOpenChange,
                                    selectedSalesman,
                                    customerCount,
                                    onSuccess,
                                }: SuccessionModalProps) {
    const [activeSalesmenForSuccession, setActiveSalesmenForSuccession] = useState<Salesman[]>([]);
    const [loadingActive, setLoadingActive] = useState(false);
    const [reassignmentSalesmanId, setReassignmentSalesmanId] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    const loadActiveSalesmen = useCallback(async () => {
        setLoadingActive(true);
        try {
            const res = await salesmanProvider.getSalesmen(1, 500, "", true);
            setActiveSalesmenForSuccession(
                res.data.filter((s) => s.id !== selectedSalesman?.id)
            );
        } catch {
            toast.error("Failed to load active handlers");
        } finally {
            setLoadingActive(false);
        }
    }, [selectedSalesman]);

    useEffect(() => {
        if (open) {
            loadActiveSalesmen();
        } else {
            setActiveSalesmenForSuccession([]);
            setReassignmentSalesmanId("");
        }
    }, [open, loadActiveSalesmen]);

    const confirmDeactivation = async () => {
        if (!selectedSalesman) return;
        if (customerCount > 0 && !reassignmentSalesmanId) {
            toast.error("Successor required.");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await salesmanProvider.deactivateAndReassign(
                selectedSalesman.id,
                Number(reassignmentSalesmanId)
            );

            if (res.success) {
                toast.success(`Agent retired. Customers transferred.`);
                onOpenChange(false);
                onSuccess();
            } else {
                toast.error(res.error || "Deactivation failed");
            }
        } catch {
            toast.error("Critical error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                <DialogHeader className="p-8 border-b bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                                Succession Handover
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 leading-none">
                                Operational Continuity Protocol
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-8">
                    {customerCount > 0 ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        Retiring Salesman
                                    </p>
                                    <p className="text-[11px] font-black text-slate-900 uppercase truncate tracking-tight">
                                        {selectedSalesman?.salesman_name}
                                    </p>
                                </div>
                                <div className="space-y-1.5 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg shadow-slate-200">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        Impact Exposure
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[13px] font-black text-white tracking-tighter">
                                            {customerCount} ACCOUNTS
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                        Assign New Handler
                                    </Label>
                                    <Badge
                                        variant="outline"
                                        className="text-[8px] font-black text-primary border-primary/20 h-4 px-1.5"
                                    >
                                        REQUIRED
                                    </Badge>
                                </div>

                                <Popover modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-14 justify-between font-black uppercase text-[11px] tracking-widest border-2 border-slate-100 rounded-xl px-4 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm"
                                        >
                                            <div className="flex flex-col items-start min-w-0">
                        <span className="truncate opacity-50 text-[9px] font-bold tracking-normal leading-none mb-1">
                          Select Successor
                        </span>
                                                <span className="truncate leading-none">
                          {reassignmentSalesmanId
                              ? activeSalesmenForSuccession.find(
                                  (s) => s.id.toString() === reassignmentSalesmanId
                              )?.salesman_name
                              : loadingActive
                                  ? "RETRIEVING SALESMAN LIST..."
                                  : "SCAN FOR AVAILABLE SALESMEN..."}
                        </span>
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-[376px] p-0 shadow-2xl rounded-xl border-slate-100"
                                        align="start"
                                        sideOffset={8}
                                    >
                                        <Command className="rounded-xl overflow-hidden" onWheel={(e) => e.stopPropagation()}>
                                            <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                                                <CommandInput
                                                    placeholder="SEARCH ACTIVE SALESMEN..."
                                                    className="h-12 text-[11px] font-black uppercase tracking-widest bg-transparent border-none outline-none ring-0 focus:ring-0"
                                                />
                                            </div>
                                            <CommandList className="max-h-[280px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                                                {loadingActive ? (
                                                    <div className="py-12 flex flex-col items-center gap-2">
                                                        <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50" />
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                              Compiling active roster...
                            </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <CommandEmpty className="py-12 text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] text-center italic">
                                                            No operators identified.
                                                        </CommandEmpty>
                                                        <CommandGroup className="px-1 py-1">
                                                            {activeSalesmenForSuccession.map((s) => (
                                                                <CommandItem
                                                                    key={s.id}
                                                                    value={s.salesman_name}
                                                                    onSelect={() =>
                                                                        setReassignmentSalesmanId(s.id.toString())
                                                                    }
                                                                    className="flex items-center gap-3 py-3.5 px-3 rounded-lg font-black uppercase text-[11px] tracking-[0.1em] aria-selected:bg-slate-900 aria-selected:text-white transition-all cursor-pointer group"
                                                                >
                                                                    <div
                                                                        className={cn(
                                                                            "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                                            reassignmentSalesmanId === s.id.toString()
                                                                                ? "bg-white border-white"
                                                                                : "border-slate-200 group-aria-selected:border-white/30"
                                                                        )}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "h-2.5 w-2.5 text-slate-900 transition-all",
                                                                                reassignmentSalesmanId ===
                                                                                s.id.toString()
                                                                                    ? "opacity-100 scale-100"
                                                                                    : "opacity-0 scale-50"
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="truncate">{s.salesman_name}</span>
                                                                        <span
                                                                            className={cn(
                                                                                "text-[8px] font-bold tracking-normal opacity-40 mt-0.5",
                                                                                reassignmentSalesmanId === s.id.toString()
                                                                                    ? "text-white"
                                                                                    : "text-slate-500"
                                                                            )}
                                                                        >
                                      CODE: {s.salesman_code}
                                    </span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    ) : (
                        <div className="py-6 text-center flex flex-col items-center gap-6">
                            <div className="p-5 rounded-3xl bg-emerald-50 text-emerald-500 shadow-inner">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-base font-black text-slate-900 uppercase tracking-tight">
                                    Direct Deactivation
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                                    Zero customer impact detected. Salesman can be retired immediately.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 pt-0 flex gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-[2] font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-20 transition-all"
                        onClick={confirmDeactivation}
                        disabled={
                            isProcessing || (customerCount > 0 && !reassignmentSalesmanId)
                        }
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isProcessing
                            ? "PROCESSING TRANSFERS..."
                            : customerCount > 0
                                ? "CONFIRM SUCCESSION"
                                : "CONFIRM RETIREMENT"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}