"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { formatDateRange } from "@/lib/utils";
import { settingsApi } from "@/lib/api/settings";
import { cyclesApi } from "@/lib/api/cycles";
import { QUERY_KEYS } from "@/lib/query-keys";
import { Skeleton } from "@/components/ui/skeleton";

export function ActiveCycleWidget() {
    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    const { data: cycles, isLoading: isCyclesLoading } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    const isLoading = isSettingsLoading || isCyclesLoading;
    const activeCycleId = settings?.preferences?.activeCycleId;
    const activeCycle = cycles?.find((c) => c.id === activeCycleId);

    if (isLoading) {
        return (
            <SidebarGroup className="px-5 py-4 border-b-2 border-ink group-data-[collapsible=icon]:hidden">
                <SidebarGroupContent className="space-y-2">
                    <Skeleton className="h-3 w-16 bg-ink/10 rounded-none" />
                    <Skeleton className="h-7 w-32 bg-ink/10 rounded-none" />
                    <Skeleton className="h-4 w-24 bg-ink/10 rounded-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        );
    }

    if (!activeCycle) {
        return null;
    }

    return (
        <SidebarGroup className="px-5 py-4 border-b-2 border-ink group-data-[collapsible=icon]:hidden">
            <SidebarGroupContent>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                    active cycle
                </div>
                <div className="mt-1 font-serif text-2xl leading-tight text-ink">
                    {activeCycle.label}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-mute">
                    {formatDateRange(activeCycle.start, activeCycle.end)}
                </div>
                <Link
                    href="/app/cycles"
                    className="brutal-border brutal-shadow-sm brutal-press mt-3 inline-flex w-full items-center justify-center bg-yellow px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink hover:no-underline"
                >
                    New cycle
                </Link>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}