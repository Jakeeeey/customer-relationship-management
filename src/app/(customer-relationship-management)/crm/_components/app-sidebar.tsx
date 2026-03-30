"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard,
    Users,
    Bot,
    ClipboardList,
    ShoppingCart,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
    navMain: [
        { title: "Dashboard", url: "/crm/", icon: LayoutDashboard },
        { title: "Customer", url: "/crm/customer/", icon: Users },
        {
            title: "Salesman Management",
            url: "/crm/customer-hub/salesman-management",
            icon: Users,
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
                    icon: ShoppingCart,
                },
                {
                    title: "Sales Order Approval",
                    url: "/crm/customer-hub/sales-order-approval",
                    icon: ClipboardList,
                },
                // { title: "Disbursement", url: "/fm/treasury/disbursement" },
                // { title: "Remittances", url: "/fm/treasury/remittances" },
            ],
        },
    ],
};

export function AppSidebar({
    className,
    ...props
}: React.ComponentProps<typeof Sidebar>) {
    const [counts, setCounts] = React.useState({ draft: 0, approval: 0, callsheet: 0 });

    const fetchCounts = React.useCallback(async () => {
        try {
            const res = await fetch("/api/crm/sidebar-counts");
            if (res.ok) {
                const data = await res.json();
                setCounts(data);
            }
        } catch (e) {
            console.error("Failed to fetch sidebar counts:", e);
        }
    }, []);

    React.useEffect(() => {
        fetchCounts();
        
        // Listen for standard refresh events if any, or just interval
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, [fetchCounts]);

    const navMainWithCounts = React.useMemo(() => {
        return data.navMain.map(group => {
            if (group.title === "Customer Hub" && group.items) {
                return {
                    ...group,
                    items: group.items.map(item => {
                        if (item.title === "Sales Order Draft") return { ...item, badge: counts.draft || undefined };
                        if (item.title === "Sales Order Approval") return { ...item, badge: counts.approval || undefined };
                        if (item.title === "Callsheet") return { ...item, badge: counts.callsheet || undefined };
                        return item;
                    })
                };
            }
            return group;
        });
    }, [counts]);

    return (
        <Sidebar
            {...props}
            className={cn(
                "border-r border-sidebar-border/60 dark:border-white/20",
                "shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_16px_40px_-24px_rgba(0,0,0,0.9)]",
                className
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
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0"
                    )}
                >
                    <div className="w-full min-w-0">
                        <NavMain items={navMainWithCounts} />
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
