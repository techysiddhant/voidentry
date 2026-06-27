"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { ActiveCycleWidget } from "./active-cycle-widget";
import { SidebarNav } from "./sidebar-nav";
import { NavUser } from "./sidebar-footer";

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" className="border-r-2 border-ink">
            {/* ── Header: Ledger branding ── */}
            <SidebarHeader className="border-b-2 border-ink bg-paper px-5 py-3 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-4">
                {/* Full logo — visible when expanded */}
                <Link
                    href="/app"
                    className="font-serif text-3xl leading-none text-ink hover:no-underline group-data-[collapsible=icon]:hidden"
                >
                    Ledger<span className="text-pink">.</span>
                </Link>
                {/* Icon-mode logo — just the 'L.' monogram, centred */}
                <Link
                    href="/app"
                    className="hidden font-serif text-[22px] leading-none text-ink hover:no-underline group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
                >
                    L<span className="text-pink">.</span>
                </Link>
            </SidebarHeader>

            {/* ── Content: Active cycle + nav ── */}
            <SidebarContent className="gap-0 bg-paper">
                <ActiveCycleWidget />
                <SidebarNav />
            </SidebarContent>

            {/* ── Footer: User avatar + sign-out dropdown ── */}
            <SidebarFooter className="border-t-2 border-ink bg-paper p-0">
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
