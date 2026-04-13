"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Attachment {
    name: string;
    url: string;
}

export function DocumentViewerClient({ attachments }: { attachments: Attachment[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        setRotation(0);
    }, [currentIndex]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, attachments]);

    const currentDoc = attachments[currentIndex];
    if (!currentDoc) return null;

    const isPdf = currentDoc.name.toLowerCase().endsWith(".pdf") || currentDoc.url.toLowerCase().includes(".pdf");

    const handleNext = () => {
        if (currentIndex < attachments.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleRotate = () => {
        if (!isPdf) setRotation(prev => prev + 90);
    };

    return (
        <div className="fixed inset-0 h-full w-full bg-black/95 flex flex-col overflow-hidden text-white font-sans selection:bg-primary/30">
            {/* Header Actions */}
            <div className="flex items-center justify-between p-4 border-b border-border/10 bg-black/60 backdrop-blur-xl z-20 absolute top-0 w-full shrink-0 shadow-sm">
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm tracking-tight truncate max-w-[300px] sm:max-w-[500px]">
                        {currentDoc.name}
                    </span>
                    {attachments.length > 1 && (
                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest">
                            Document {currentIndex + 1} of {attachments.length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!isPdf && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-white hover:bg-white/20 hover:text-white rounded-xl transition-all"
                            onClick={handleRotate}
                            title="Rotate Image"
                        >
                            <RotateCw className="h-5 w-5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-white hover:bg-white/20 hover:text-white rounded-xl transition-all"
                        onClick={() => window.open(`${currentDoc.url}&download=true`, "_blank")}
                        title="Download"
                    >
                        <Download className="h-5 w-5" />
                    </Button>
                    <div className="w-px h-6 bg-white/20 mx-2" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-white hover:bg-destructive hover:text-white rounded-xl transition-all"
                        onClick={() => window.close()}
                        title="Close Tab"
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 relative flex items-center justify-center pt-20 pb-4 px-4 sm:px-16 overflow-hidden">
                
                {/* Navigation Buttons */}
                {attachments.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute left-2 sm:left-6 z-20 h-14 w-14 rounded-full bg-black/60 text-white hover:bg-black hover:text-white hover:scale-110 border border-white/10 shadow-2xl transition-all backdrop-blur-sm",
                                currentIndex === 0 && "opacity-20 pointer-events-none scale-100"
                            )}
                            onClick={handlePrev}
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute right-2 sm:right-6 z-20 h-14 w-14 rounded-full bg-black/60 text-white hover:bg-black hover:text-white hover:scale-110 border border-white/10 shadow-2xl transition-all backdrop-blur-sm",
                                currentIndex === attachments.length - 1 && "opacity-20 pointer-events-none scale-100"
                            )}
                            onClick={handleNext}
                        >
                            <ChevronRight className="h-8 w-8" />
                        </Button>
                    </>
                )}

                {/* Content Display */}
                <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
                    {isPdf ? (
                        <iframe 
                            src={currentDoc.url} 
                            className="w-full h-full bg-white rounded-xl shadow-2xl border border-white/10"
                            title={currentDoc.name}
                        />
                    ) : (
                        <div className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300 ease-in-out" style={{ transform: `rotate(${rotation}deg)` }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentDoc.url}
                                alt={currentDoc.name}
                                className="max-w-[95vw] sm:max-w-[85vw] max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10 select-none"
                                draggable={false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
