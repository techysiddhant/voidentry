"use client";

import Link from "next/link";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { formatDateRange } from "@/lib/utils";
import { Cycle } from "@/lib/expense-store";

// Mocking active cycle until backend is wired
export const mockCycle: Cycle = {
    id: "active-cycle",
    label: "June 2026",
    start: "2026-06-01",
    end: "2026-06-30",
};

export function ActiveCycleWidget() {
    return (
        <SidebarGroup className="px-5 py-4 border-b-2 border-ink group-data-[collapsible=icon]:hidden">
            <SidebarGroupContent>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
                    active cycle
                </div>
                <div className="mt-1 font-serif text-2xl leading-tight text-ink">
                    {mockCycle.label}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-mute">
                    {formatDateRange(mockCycle.start, mockCycle.end)}
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
