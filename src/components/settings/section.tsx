// Shared layout primitives for settings sections.
// These are presentational only — no business logic.

import React from "react";

export function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="brutal-border brutal-shadow-sm bg-paper">
            <div className="border-b-2 border-ink px-5 py-3 font-mono text-xs uppercase tracking-widest">
                {title}
            </div>
            <div className="divide-y-2 divide-ink/10">{children}</div>
        </div>
    );
}

export function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="font-mono text-xs uppercase tracking-widest text-ink/80">{label}</div>
            <div>{children}</div>
        </div>
    );
}