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

const FILE_SERVER_BASE =
    process.env.NEXT_PUBLIC_FILE_SERVER_URL ?? "http://localhost:7002";

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
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

    // Safety fallback: clear loading spinner after 8 s in case onLoad never fires
    // ⚠️ Must be ABOVE the early return to satisfy Rules of Hooks
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (showPreview && pdfLoading) {
            timerRef.current = setTimeout(() => setPdfLoading(false), 8000);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [showPreview, pdfLoading]);

    if (!item) return null;

    const fileType = getFileType(item.attachment_name);

    // Use the same-origin API proxy so the iframe is never blocked
    // by X-Frame-Options or CSP from the external file server.
    const encodedName = encodeURIComponent(item.attachment_name);
    const proxyViewUrl = item.file_id
        ? `/api/crm/customer-hub/callsheet/file?id=${item.file_id}&filename=${encodedName}`
        : null;
    const downloadUrl = item.file_id
        ? `${FILE_SERVER_BASE}/files/${item.file_id}/download`
        : null;

    const handleDownload = () => {
        if (!downloadUrl) return;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = item.attachment_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleClose = () => {
        setShowPreview(false);
        setPdfLoading(true);
        setPreviewError(null);
        onClose();
    };

    // Pre-flight check before opening preview — avoids showing raw JSON error in embed
    const handleViewDocument = async () => {
        if (!proxyViewUrl) return;
        setPdfLoading(true);
        setPreviewError(null);
        setShowPreview(true);
        try {
            const res = await fetch(proxyViewUrl, { method: "HEAD" });
            if (!res.ok) {
                setPreviewError(`File not available (${res.status}). The document may not have been uploaded yet.`);
                setPdfLoading(false);
            }
        } catch {
            setPreviewError("Could not reach the file server. Please check your connection.");
            setPdfLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent
                className={
                    showPreview
                        ? "max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0"
                        : "sm:max-w-[520px]"
                }
            >
                {showPreview ? (
                    /* ── PDF Preview Mode ── */
                    <>
                        {/* Preview header bar */}
                        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 h-8"
                                onClick={() => { setShowPreview(false); setPdfLoading(true); setPreviewError(null); }}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate">
                                    {item.attachment_name}
                                </span>
                            </div>
                            <div className="ml-auto shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 h-8"
                                    onClick={handleDownload}
                                    disabled={!downloadUrl}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                </Button>
                            </div>
                        </div>

                        {/* File preview — type-aware renderer */}
                        <div className="relative flex-1 min-h-0 bg-muted/20 overflow-auto flex items-center justify-center">
                            {/* Error state — shown when file is not accessible */}
                            {previewError ? (
                                <div className="flex flex-col items-center gap-3 p-8 text-center">
                                    <AlertTriangle className="h-12 w-12 text-destructive" />
                                    <p className="text-sm font-semibold text-destructive">Document Not Available</p>
                                    <p className="text-xs text-muted-foreground max-w-xs">{previewError}</p>
                                </div>
                            ) : (
                                <>
                                    {pdfLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        </div>
                                    )}

                                    {fileType === "image" && (
                                        <div className="relative w-full h-full p-4">
                                            <Image
                                                src={proxyViewUrl ?? ""}
                                                alt={item.attachment_name}
                                                fill
                                                className="object-contain"
                                                onLoadingComplete={() => setPdfLoading(false)}
                                                onError={() => { setPdfLoading(false); setPreviewError("Failed to load image."); }}
                                                unoptimized
                                            />
                                        </div>
                                    )}

                                    {fileType === "pdf" && (
                                        <div className="absolute inset-0 bg-white">
                                            <embed
                                                src={proxyViewUrl ?? ""}
                                                type="application/pdf"
                                                className="w-full h-full"
                                                onLoad={() => setPdfLoading(false)}
                                            />
                                        </div>
                                    )}

                                    {fileType === "other" && (
                                        <div className="flex flex-col items-center gap-3 p-8 text-center">
                                            <FileText className="h-12 w-12 text-muted-foreground" />
                                            <p className="text-sm font-medium">Preview not available</p>
                                            <p className="text-xs text-muted-foreground">
                                                This file type cannot be previewed. Use the Download button instead.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    /* ── File Details Mode ── */
                    <>
                        <DialogHeader>
                            <DialogTitle>File Details</DialogTitle>
                            <DialogDescription>Sales order file information</DialogDescription>
                        </DialogHeader>

                        {/* File Card */}
                        <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-background">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-semibold leading-tight">{item.attachment_name}</p>
                                <p className="text-sm text-muted-foreground">Sales Order Document</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Sales Order No.</p>
                                <p className="font-mono font-medium text-primary">{item.sales_order_no}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Salesman</p>
                                <p className="font-medium">{item.salesman_name}</p>
                            </div>
                            <div>
                                <p className="font-medium">{item.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{item.customer_code}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">File Type</p>
                                <p className="font-medium">{getFileLabel(item.attachment_name)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                                <p className="font-medium capitalize">{item.status}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Date Created</p>
                                <p className="font-medium text-primary">{formatDate(item.created_date)}</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                className="flex-1 gap-2"
                                onClick={handleViewDocument}
                                disabled={!proxyViewUrl}
                            >
                                <Eye className="h-4 w-4" />
                                View Document
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={handleDownload}
                                disabled={!downloadUrl}
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={handleClose}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
