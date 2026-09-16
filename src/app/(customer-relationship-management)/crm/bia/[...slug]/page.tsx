"use client";

import React from "react";
import { useParams } from "next/navigation";

export default function BiaModuleWrapper() {
    const params = useParams();
    const slugArray = params.slug as string[];
    
    // Build the target route string from the slug array
    const routePath = slugArray ? slugArray.join("/") : "";
    
    // Use an environment variable for the BIA URL, falling back to localhost:3001
    // Usually, if CRM runs on 3000, the next app (BIA) will default to 3001
    const baseUrl = process.env.NEXT_PUBLIC_BIA_URL || "http://localhost:3001";
    const iframeUrl = `${baseUrl}/bia/${routePath}`;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
            {iframeUrl ? (
                <iframe
                    src={iframeUrl}
                    className="flex-1 w-full h-full border-none"
                    title="BIA Module"
                    allowFullScreen
                />
            ) : (
                <div className="flex flex-1 items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
        </div>
    );
}
