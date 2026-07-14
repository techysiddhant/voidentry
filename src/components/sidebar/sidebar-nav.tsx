"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ListOrdered, CalendarRange, Settings, BarChart3 } from "lucide-react";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV: {
    to: "/app" | "/app/entries" | "/app/insights" | "/app/cycles" | "/app/settings";
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    exact?: boolean;
}[] = [
        { to: "/app", label: "Chat", icon: MessageSquare, exact: true },
        { to: "/app/entries", label: "Entries", icon: ListOrdered },
        // { to: "/app/insights", label: "Insights", icon: BarChart3 },
        { to: "/app/cycles", label: "Cycles", icon: CalendarRange },
        { to: "/app/settings", label: "Settings", icon: Settings },
    ];

export function SidebarNav() {
    const pathname = usePathname();
    const { state } = useSidebar(); // "expanded" | "collapsed"
    const isCollapsed = state === "collapsed";

    return (
        <SidebarGroup className="p-3 group-data-[collapsible=icon]:p-2">
            <SidebarMenu className="gap-0.5">
                {NAV.map((item) => {
                    const active = item.exact
                        ? pathname === item.to
                        : pathname === item.to || pathname.startsWith(`${item.to}/`);
                    const Icon = item.icon;

                    const link = (
                        <Link
                            href={item.to}
                            className={[
                                "flex w-full items-center gap-3 transition-colors duration-100 hover:no-underline",
                                "font-mono text-xs uppercase tracking-widest",
                                // ── Expanded: full row with neobrutalist border ──
                                !isCollapsed && "px-3 py-2.5 border-2",
                                !isCollapsed && (
                                    active
                                        ? "border-ink bg-ink text-paper hover:bg-ink hover:text-paper"
                                        : "border-transparent text-ink hover:border-ink hover:bg-secondary hover:text-ink"
                                ),
                                // ── Collapsed: centred icon square ──
                                isCollapsed && "justify-center p-2 rounded-md",
                                isCollapsed && (
                                    active
                                        ? "bg-ink text-paper hover:bg-ink hover:text-paper"
                                        : "bg-transparent text-ink hover:bg-secondary hover:text-ink"
                                ),
                            ].filter(Boolean).join(" ")}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );

                    return (
                        <SidebarMenuItem key={item.to}>
                            {isCollapsed ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                                    <TooltipContent side="right" className="font-mono text-xs uppercase tracking-widest">
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                link
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}