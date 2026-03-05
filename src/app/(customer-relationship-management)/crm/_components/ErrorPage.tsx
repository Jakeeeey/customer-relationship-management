"use client";

import React from "react";
import { RefreshCcw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UniversalErrorProps {
  title?: string;
  message?: string;
  code?: string | number;
  onRefresh?: () => void;
}

export function ErrorPage({
  title = "Something went wrong",
  message = "Oops! An unexpected error occurred. Our team has been notified.",
  code = "Error",
  onRefresh,
}: UniversalErrorProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="relative mb-8">
        <div className="bg-destructive/10 p-6 rounded-full">
          <ServerCrash className="h-24 w-24 text-destructive animate-pulse" />
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight mb-2">{code}</h1>
      <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
        {title}
      </h2>

      <p className="max-w-md text-muted-foreground mb-8">{message}</p>

      <Button
        size="lg"
        onClick={handleRefresh}
        className="gap-2 px-8 font-semibold shadow-lg hover:shadow-destructive/20 transition-all"
      >
        <RefreshCcw className="h-5 w-5" />
        Refresh Page
      </Button>
    </div>
  );
}
