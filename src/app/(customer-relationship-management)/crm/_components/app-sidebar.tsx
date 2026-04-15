"use client";

import {
    Bot,
    ChartNoAxesCombined,
    CircleCheckBig,
    ClipboardList,
    FileXCorner,
    LayoutDashboard,
    ShoppingCart,
    Printer,
    PersonStanding,
    StoreIcon,
    MapPin, PlusIcon, LucideChevronUp,
    WalletCards
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NavMain } from "./nav-main";

const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/crm/",
            icon: LayoutDashboard
        },
        {
            title: "Customer Management",
            url: "#",
            icon: PersonStanding,
            isActive: true, // 🚀 MOVED HERE: This keeps the dropdown open by default
            items: [
                {
                    title: "Customer List",
                    url: "/crm/customer-management/customer",
                    icon: StoreIcon,
                },
                {
                    title: "Customer Map",
                    url: "/crm/customer-hub/customer-map",
                    icon: MapPin,
                }, {
                    title: "Customer Prospect",
                    url: "/crm/customer-management/customer-prospect", // 🚀 FIX: Updated unique URL
                    icon: PlusIcon,
                },
                {
                    title: "Store Type",
                    url: "/crm/customer-management/store-type",
                    icon: StoreIcon,
                },
                {
                    title: "Classification",
                    url: "/crm/customer-management/classification",
                    icon: ClipboardList,
                },
            ]
        },
        {
            title: "Salesman Management",
            url: "/crm/customer-hub/salesman-management",
            icon: LucideChevronUp,
        },
        {
            title: "Customer Hub",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Callsheet Printable",
                    url: "/crm/customer-hub/callsheet-printable",
                    icon: ClipboardList,
                },
                {
                    title: "Callsheet",
                    url: "/crm/customer-hub/callsheet",
                    icon: ClipboardList,
                },
                {
                    title: "Sales Order Report",
                    url: "/crm/customer-hub/sales-order-report",
                    icon: ShoppingCart,
                },
                {
                    title: "Create Sales Order",
                    url: "/crm/customer-hub/create-sales-order",
                    icon: ShoppingCart,
                },
                {
                    title: "Sales Order Draft",
                    url: "/crm/customer-hub/sales-order-draft",
                    icon: WalletCards,
                },
                {
                    title: "Sales Order Approval",
                    url: "/crm/customer-hub/sales-order-approval",
                    icon: ClipboardList,
                },
                {
                    title: "Ops Dashboard",
                    url: "/crm/customer-hub/ops-dashboard",
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            title: "Invoicing",
            icon: ClipboardList,
            url: "/crm/invoicing",
        },
        {
            title: "Defective Invoice Summary",
            icon: ChartNoAxesCombined,
            url: "/crm/invoice-management/invoice-summary-report",
        },
        {
            title: "Invoice Cancellation Requests",
            icon: FileXCorner,
            url: "/crm/invoice-management/invoice-cancellation",
        },
        {
            title: "Invoice Cancellation Approval",
            icon: CircleCheckBig,
            url: "/crm/invoice-management/invoice-cancellation-approval",
        },
        {
            title: "Printables",
            url: "#",
            icon: Printer,
            isActive: true,
            items: [
                {
                    title: "Product Printables",
                    url: "/crm/printables/product-printables",
                    icon: Printer,
                },
            ],
        },
        {
            title: "Structure",
            url: "#",
            icon: Printer,
            isActive: true,
            items: [
                {
                    title: "Task Management",
                    url: "/crm/structure/task-management",
                    icon: Printer,
                },
            ],
        },
        {
            title: "Target Settings",
            url: "/crm/target-settings",
            icon: Printer,
        },
    ],
};

import { useSidebarCounts } from "@/hooks/useSidebarCounts";

export function AppSidebar({
    className,
    ...props
}: React.ComponentProps<typeof Sidebar>) {
    const { counts } = useSidebarCounts(15000); // 15 seconds polling

    const dynamicNavMain = React.useMemo(() => {
        // Map the array to preserve React component icons
        return data.navMain.map((l1) => {
            if (l1.title === "Customer Hub" && l1.items) {
                return {
                    ...l1,
                    items: l1.items.map((l2) => {
                        const newL2 = { ...l2 };
                        if (l2.title === "Sales Order Draft" && counts.draft > 0) {
                            // (newL2 as typeof newL2 & { badge?: number }).badge = counts.draft;
                        }
                        if (l2.title === "Sales Order Approval" && counts.approval > 0) {
                            // (newL2 as typeof newL2 & { badge?: number }).badge = counts.approval;
                        }
                        if (l2.title === "Callsheet" && counts.callsheet > 0) {
                            // (newL2 as typeof newL2 & { badge?: number }).badge = counts.callsheet;
                        }
                        return newL2;
                    })
                };
            }
            return l1;
        });
    }, [counts]);

    return (
        <Sidebar
            {...props}
            className={cn(
                "border-r border-sidebar-border/60 dark:border-white/20",
                "shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_16px_40px_-24px_rgba(0,0,0,0.9)]",
                className,
            )}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/main-dashboard">
                                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden">
                                    <Image
                                        src="/vertex_logo_black.png"
                                        alt="VOS Logo"
                                        width={40}
                                        height={40}
                                        className="h-9 w-10 object-contain"
                                        priority
                                    />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">VOS Web</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Customer Relationship Management
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator />

            <SidebarContent>
                <div className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                    Platform
                </div>

                <ScrollArea
                    className={cn(
                        "min-h-0 flex-1",
                        "[&_[data-radix-scroll-area-viewport]>div]:block",
                        "[&_[data-radix-scroll-area-viewport]>div]:w-full",
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0",
                    )}
                >
                    <div className="w-full min-w-0">
                        <NavMain items={dynamicNavMain} />
                    </div>
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter className="p-0">
                <Separator />
                <div className="py-3 text-center text-xs text-muted-foreground">
                    VOS Web v2.0
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}