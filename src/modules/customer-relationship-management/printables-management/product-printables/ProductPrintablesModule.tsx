// src/modules/financial-management/printables-management/product-printables/ProductPrintablesModule.tsx
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductPrintablesView from "./components/ProductPrintablesView";

export default function ProductPrintablesModule() {
    return (
        <Card className="rounded-2xl shadow-sm border-none bg-background/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-xl font-semibold tracking-tight">Product Printables</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <ProductPrintablesView />
            </CardContent>
        </Card>
    );
}
