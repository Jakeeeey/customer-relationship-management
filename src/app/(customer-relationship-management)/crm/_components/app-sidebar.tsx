"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard,
    BookOpen,
    Receipt,
    HandCoins,
    Landmark,
    Wallet,
    PiggyBank,
    Scale,
    ShieldCheck,
    PlugZap,
    Bot,
    SquareTerminal,
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
        { title: "Customer Database", url: "/crm/customer-database/", icon: LayoutDashboard },
        /*{
            title: "Treasury",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Budgeting Budgeting Budgeting",
                    url: "#",
                    // ✅ optional: you can give icon here later; if omitted, NavMain will default L2 icons
                    items: [
                        { title: "Dashboard", url: "/fm/treasury/budgeting/dashboard" },
                        { title: "Budget Records Records R", url: "/fm/treasury/budgeting/customer-database" },
                        { title: "Reports", url: "/fm/treasury/budgeting/reports" },
                    ],
                },
                { title: "Disbursement", url: "/fm/treasury/disbursement" },
                { title: "Remittances", url: "/fm/treasury/remittances" },
            ],
        },*/
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
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
                                    <span className="truncate text-xs text-muted-foreground">Financial Management</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator />

            <SidebarContent>
                <div className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">Platform</div>

                <ScrollArea
                    className={cn(
                        "min-h-0 flex-1",
                        "[&_[data-radix-scroll-area-viewport]>div]:block",
                        "[&_[data-radix-scroll-area-viewport]>div]:w-full",
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0"
                    )}
                >
                    <div className="w-full min-w-0">
                        <NavMain items={data.navMain} />
                    </div>
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter className="p-0">
                <Separator />
                <div className="py-3 text-center text-xs text-muted-foreground">VOS Web v2.0</div>
            </SidebarFooter>
        </Sidebar>
    );
}
