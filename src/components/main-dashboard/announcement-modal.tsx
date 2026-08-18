"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Announcement } from "@/types/announcement";

export interface AnnouncementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    announcements: Announcement[];
    mode?: "popup" | "view-only";
}

export function AnnouncementModal({
    open,
    onOpenChange,
    announcements,
    mode = "popup"
}: AnnouncementModalProps) {
    const announcementsList = announcements || [];
    const [activeTabIndex, setActiveTabIndex] = React.useState(0);
    const [acknowledgedMemoIds, setAcknowledgedMemoIds] = React.useState<Record<number, boolean>>({});

    const activeAnnouncement = announcementsList[activeTabIndex];

    // Get format and URL for the active attachment
    const attachment = activeAnnouncement?.attachments?.[0];
    const fileName = attachment?.file_name || "";
    const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
    const isWord = /\.(docx?|xlsx?|pptx?)$/i.test(fileName);

    let attachmentUrl = "";
    if (attachment) {
        const fileUrl = attachment.file_url;
        if (fileUrl) {
            const base = fileUrl.startsWith("http") ? fileUrl : `${activeAnnouncement.directusBaseUrl}/assets/${fileUrl}`;
            
            // Append #toolbar=0 to PDF and &wdToolbar=0 to Word viewer URLs to hide toolbar
            if (/\.pdf$/i.test(fileName)) {
                attachmentUrl = `${base}#toolbar=0`;
            } else if (isWord) {
                attachmentUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(base)}&wdToolbar=0`;
            } else {
                attachmentUrl = base;
            }
        }
    }

    // Turn off global Lenis smooth scrolling when modal is open to restore native modal scrolling
    React.useEffect(() => {
        const globalWindow = typeof window !== "undefined" ? (window as unknown as { lenis?: { stop: () => void; start: () => void } }) : null;
        if (open && globalWindow && globalWindow.lenis) {
            globalWindow.lenis.stop();
            return () => {
                if (globalWindow.lenis) {
                    globalWindow.lenis.start();
                }
            };
        }
    }, [open]);

    // Reset active index and checked states on state changes
    React.useEffect(() => {
        if (!open) {
            setActiveTabIndex(0);
            if (mode === "popup") {
                setAcknowledgedMemoIds({});
            }
        }
    }, [open, mode]);

    if (announcementsList.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                showCloseButton={mode === "view-only"} 
                className={cn(
                    "w-[96vw] h-[96vh] flex flex-col p-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl mx-auto",
                    announcementsList.length >= 2 ? "sm:max-w-[96vw]" : "sm:max-w-[850px]"
                )}
            >
                <DialogHeader className="border-b border-slate-100 dark:border-white/5 pb-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 mb-0.5">
                        <Icons.Megaphone className="h-4 w-4 animate-bounce" />
                        <span className="text-[9px] font-black tracking-[0.35em] uppercase">OFFICIAL ANNOUNCEMENT</span>
                    </div>
                    <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none">
                        {activeAnnouncement?.memo?.subject || "New Announcement"}
                    </DialogTitle>
                </DialogHeader>

                {/* Content Container (Split-Pane Sidebar if 2+ announcements) */}
                <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row gap-4">
                    {/* Sidebar Left Column */}
                    {announcementsList.length >= 2 && (
                        <div className="w-full md:w-1/3 flex flex-col gap-2 overflow-y-auto max-h-[30vh] md:max-h-full md:border-r border-slate-100 dark:border-white/5 md:pr-4 shrink-0">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 px-1">
                                Announcements ({announcementsList.length})
                            </h4>
                            {announcementsList.map((ann: Announcement, index: number) => {
                                const isCurrent = index === activeTabIndex;
                                const isChecked = mode === "view-only" || !!acknowledgedMemoIds[ann.memo.id];
                                return (
                                    <button
                                        key={ann.memo.id}
                                        onClick={() => setActiveTabIndex(index)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3",
                                            isCurrent 
                                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold" 
                                                : "bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs uppercase tracking-wide line-clamp-2 leading-snug">
                                                {ann.memo.subject || "Announcement"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-1">
                                                Memo ID: {ann.memo.memo_id || "N/A"}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center mt-0.5">
                                            {mode === "view-only" ? (
                                                <Icons.Eye className="h-4 w-4 text-cyan-500" />
                                            ) : isChecked ? (
                                                <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Content Right Column */}
                    <div className="flex-1 min-h-0 h-full overflow-y-auto pr-1">
                        {/* 1. Memo Rich Text Body or Text Description */}
                        {activeAnnouncement?.memo?.body ? (
                            <div 
                                className="mb-4 p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 text-sm text-slate-800 dark:text-slate-200 leading-relaxed break-words [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_li]:mb-1 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2"
                                dangerouslySetInnerHTML={{ 
                                    __html: activeAnnouncement.memo.body.replace(/&nbsp;/g, " ") 
                                }}
                            />
                        ) : activeAnnouncement?.memo?.description ? (
                            <div className="mb-4 p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                {activeAnnouncement.memo.description}
                            </div>
                        ) : null}

                        {/* 2. Memo Attachment Preview */}
                        {attachmentUrl && (
                            <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950">
                                {isImage ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={attachmentUrl}
                                        className="w-full h-auto max-h-[650px] object-contain mx-auto"
                                        alt={fileName}
                                    />
                                ) : (
                                    <iframe
                                        src={attachmentUrl}
                                        className="w-full h-[650px] border-none"
                                        title="Announcement Attachment"
                                    />
                                )}
                            </div>
                        )}

                        {!activeAnnouncement?.memo?.body && !activeAnnouncement?.memo?.description && !attachmentUrl && (
                            <div className="h-full flex items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                                <p className="text-sm text-slate-400">No content available for this announcement.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t border-slate-100 dark:border-white/5 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {mode === "popup" && activeAnnouncement ? (
                        <>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!acknowledgedMemoIds[activeAnnouncement.memo.id]}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setAcknowledgedMemoIds(prev => ({
                                            ...prev,
                                            [activeAnnouncement.memo.id]: checked
                                        }));
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 dark:border-white/10 text-cyan-600 focus:ring-cyan-500/20 focus:ring-2 focus:ring-offset-2 dark:bg-slate-800"
                                />
                                <span>I have read and understood this announcement</span>
                            </label>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                {announcementsList.length >= 2 && (
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
                                        Progress: {Object.values(acknowledgedMemoIds).filter(Boolean).length} / {announcementsList.length} Checked
                                    </div>
                                )}
                                <Button
                                    onClick={() => {
                                        onOpenChange(false);
                                    }}
                                    disabled={
                                        !announcementsList.every(ann => !!acknowledgedMemoIds[ann.memo.id])
                                    }
                                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 font-black uppercase tracking-widest text-xs h-10 px-6 rounded-xl transition-all w-full sm:w-auto"
                                >
                                    Acknowledge & Close
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="hidden sm:block text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                View-Only Mode
                            </div>
                            <Button
                                onClick={() => onOpenChange(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-950 font-black uppercase tracking-widest text-xs h-10 px-6 rounded-xl transition-all w-full sm:w-auto"
                            >
                                Close
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
