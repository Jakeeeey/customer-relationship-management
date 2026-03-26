"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FileText, Download, Eye, ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SalesOrderAttachment } from "../types";

interface FileDetailsModalProps {
    item: SalesOrderAttachment | null;
    open: boolean;
    onClose: () => void;
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8056";

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateStr;
    }
}

type FileType = "image" | "pdf" | "other";

function getFileType(name: string): FileType {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
}

function getFileLabel(name: string): string {
    const ext = name.split(".").pop()?.toUpperCase();
    return ext ? `${ext} Document` : "Document";
}

export function FileDetailsModal({ item, open, onClose }: FileDetailsModalProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (showPreview && pdfLoading) {
            timerRef.current = setTimeout(() => setPdfLoading(false), 8000);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [showPreview, pdfLoading]);

    if (!item) return null;

    const fileType = getFileType(item.attachment_name);

    // Proxy for preview to avoid CORS/Headers issues
    const encodedName = encodeURIComponent(item.attachment_name);
    const proxyViewUrl = item.file_id
        ? `/api/crm/customer-hub/callsheet/file?id=${item.file_id}&filename=${encodedName}`
        : null;
    
    // Direct download link from Directus
    const downloadUrl = item.file_id
        ? `${DIRECTUS_URL}/assets/${item.file_id}?download`
        : null;

    const handleDownload = () => {
        if (!downloadUrl) return;
        window.open(downloadUrl, "_blank");
    };

    const handleClose = () => {
        setShowPreview(false);
        setPdfLoading(true);
        setPreviewError(null);
        onClose();
    };

    const handleViewDocument = async () => {
        if (!proxyViewUrl) return;
        setPdfLoading(true);
        setPreviewError(null);
        setShowPreview(true);
        try {
            const res = await fetch(proxyViewUrl, { method: "HEAD" });
            if (!res.ok) {
                setPreviewError(`File not available (${res.status}). It might have been moved or deleted.`);
                setPdfLoading(false);
            }
        } catch {
            setPreviewError("Could not reach the server. Please check your connection.");
            setPdfLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent
                className={
                    showPreview
                        ? "max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                        : "sm:max-w-[550px] p-0 gap-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                }
            >
                {showPreview ? (
                    /* ── Document Preview Mode ── */
                    <>
                        <div className="flex items-center gap-3 border-b bg-muted/30 px-6 py-4 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 h-9 px-3 hover:bg-background/50 transition-all active:scale-95"
                                onClick={() => { setShowPreview(false); setPdfLoading(true); setPreviewError(null); }}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="font-medium">Back</span>
                            </Button>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <DialogTitle className="text-sm font-semibold truncate leading-tight">
                                        {item.attachment_name}
                                    </DialogTitle>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                        {getFileLabel(item.attachment_name)}
                                    </div>
                                    <DialogDescription className="sr-only">
                                        Document details for {item.attachment_name}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="gap-2 h-9 px-4 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
                                    onClick={handleDownload}
                                    disabled={!downloadUrl}
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Download</span>
                                </Button>
                            </div>
                        </div>

                        <div className="relative flex-1 min-h-0 bg-muted/10 overflow-auto flex items-center justify-center">
                            {previewError ? (
                                <div className="flex flex-col items-center gap-4 p-12 text-center animate-in fade-in zoom-in duration-300">
                                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <AlertTriangle className="h-8 w-8 text-destructive" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-lg text-foreground">Document Unavailable</p>
                                        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{previewError}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                                        Return to details
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {pdfLoading && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm z-10 animate-in fade-in duration-300">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                            <p className="text-xs font-medium text-muted-foreground animate-pulse">Loading secure preview...</p>
                                        </div>
                                    )}

                                    {fileType === "image" && (
                                        <div className="relative w-full h-full p-8 flex items-center justify-center">
                                            <div className="relative w-full h-full max-w-4xl shadow-2xl rounded-xl overflow-hidden bg-white/50 border border-white/20">
                                                <Image
                                                    src={proxyViewUrl ?? ""}
                                                    alt={item.attachment_name}
                                                    fill
                                                    className="object-contain transition-opacity duration-500"
                                                    onLoadingComplete={() => setPdfLoading(false)}
                                                    onError={() => { setPdfLoading(false); setPreviewError("Failed to load image metadata."); }}
                                                    unoptimized
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {fileType === "pdf" && (
                                        <div className="absolute inset-0 bg-zinc-800/5 flex items-center justify-center p-4">
                                            <div className="w-full h-full max-w-5xl bg-white shadow-2xl rounded-lg overflow-hidden border border-border/50">
                                                <embed
                                                    src={proxyViewUrl ?? ""}
                                                    type="application/pdf"
                                                    className="w-full h-full"
                                                    onLoad={() => setPdfLoading(false)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {fileType === "other" && (
                                        <div className="flex flex-col items-center gap-6 p-12 text-center bg-background/50 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center shadow-inner">
                                                <FileText className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-lg font-bold">No Interactive Preview</p>
                                                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                                                    This file format ({getFileLabel(item.attachment_name)}) doesn't support direct in-browser previews. 
                                                    Please use the download button to view the file locally.
                                                </p>
                                            </div>
                                            <Button onClick={handleDownload} className="gap-2 px-8">
                                                <Download className="h-4 w-4" />
                                                Download Now
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    /* ── File Details Mode ── */
                    <div className="flex flex-col">
                        <div className="relative h-32 w-full bg-gradient-to-br from-primary/20 via-primary/5 to-background shrink-0 flex items-end px-8 pb-4">
                            <div className="absolute top-4 right-4 h-12 w-12 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                            <div className="z-10 flex items-center gap-5 w-full">
                                <div className="h-16 w-16 bg-background rounded-2xl shadow-xl flex items-center justify-center border border-white/20 rotate-3 transition-transform hover:rotate-0 duration-300">
                                    <FileText className="h-8 w-8 text-primary" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <DialogTitle className="font-bold text-xl tracking-tight text-foreground truncate">
                                        {item.attachment_name}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                            {getFileLabel(item.attachment_name)}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                        <span className="text-xs text-muted-foreground font-medium">Sales Order Fragment</span>
                                    </div>
                                    <DialogDescription className="sr-only">
                                        Attachment metadata and audit details.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-8 relative">
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50 hidden sm:block" />
                                
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">References</p>
                                        <div className="space-y-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Order Number</span>
                                                <span className="font-mono font-bold text-primary text-base">{item.sales_order_no}</span>
                                            </div>
                                            {item.sales_order_id && (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">Internal Sys ID</span>
                                                    <span className="font-mono font-semibold text-muted-foreground text-sm opacity-80">#{item.sales_order_id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Customer Details</p>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm leading-tight">{item.customer_name}</span>
                                            <span className="text-xs text-primary/70 font-mono mt-0.5">{item.customer_code}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Assignment</p>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Sales Executive</span>
                                            <span className="font-semibold text-foreground text-sm mt-0.5">{item.salesman_name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Audit Trail</p>
                                        <div className="space-y-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Creation Date</span>
                                                <span className="font-medium text-foreground text-sm mt-0.5">{formatDate(item.created_date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${item.status === 'pending' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : item.status === 'approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                                <span className="text-xs font-bold uppercase tracking-tight text-foreground">{item.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-border/50" />

                            <div className="flex gap-4">
                                <Button
                                    className="flex-1 gap-2.5 h-12 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0 rounded-xl"
                                    onClick={handleViewDocument}
                                    disabled={!proxyViewUrl}
                                >
                                    <Eye className="h-4 w-4" />
                                    <span className="font-bold">View Document</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 gap-2.5 h-12 hover:bg-muted/50 border-border/50 rounded-xl transition-all"
                                    onClick={handleDownload}
                                    disabled={!downloadUrl}
                                >
                                    <Download className="h-4 w-4 text-primary" />
                                    <span className="font-bold">Download</span>
                                </Button>
                            </div>
                        </div>

                        <div className="px-8 py-4 bg-muted/20 border-t flex justify-between items-center">
                            <p className="text-[10px] font-medium text-muted-foreground italic">
                                Attachment securely served via Directus Managed Assets
                            </p>
                            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 text-xs font-bold hover:bg-background">
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
