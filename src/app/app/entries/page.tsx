"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryStates, parseAsString, parseAsArrayOf, parseAsInteger, parseAsBoolean } from "nuqs";
import { ArrowRight, MessageSquare, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { ExpenseDialog } from "@/components/entries/expense-dialog";
import { buildDailySeries, cumulative, daysBetween, todayDayIndex, totalsByCategory } from "@/lib/insights";
import { chartColorFromClass } from "@/lib/catalog";
import { Expense } from "@/types/expense";
import { settingsApi } from "@/lib/api/settings";
import { cyclesApi } from "@/lib/api/cycles";
import { entriesApi } from "@/lib/api/entries";
import { QUERY_KEYS } from "@/lib/query-keys";
import { clearedSearch } from "@/lib/entry-filter";
import { FilterBar } from "@/components/entries/filter-bar";
import { formatMoney, formatDateRange } from "@/lib/utils";
import toast from "react-hot-toast";

const filterParser = {
    scope: parseAsString.withDefault("cycle"),
    q: parseAsString.withDefault(""),
    cats: parseAsArrayOf(parseAsString),
    subs: parseAsArrayOf(parseAsString),
    pms: parseAsArrayOf(parseAsString),
    pts: parseAsArrayOf(parseAsString),
    min: parseAsInteger,
    max: parseAsInteger,
    from: parseAsString,
    to: parseAsString,
    date: parseAsString,
    splitOnly: parseAsBoolean,
};

export default function EntriesPage() {
    const queryClient = useQueryClient();

    // 1. URL Query States via Nuqs
    const [search, setFilter] = useQueryStates(filterParser);

    // 2. Fetch Settings
    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    // 3. Fetch Cycles
    const { data: cycles, isLoading: isCyclesLoading } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    const activeCycleId = settings?.preferences?.activeCycleId;
    const activeCycle = useMemo(() => {
        return cycles?.find((c) => c.id === activeCycleId);
    }, [cycles, activeCycleId]);

    // 4. Fetch Entries (Infinite Query with server-side filters)
    const {
        data: entriesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isEntriesLoading,
    } = useInfiniteQuery({
        queryKey: [QUERY_KEYS.ENTRIES, activeCycleId, search],
        queryFn: ({ pageParam }) =>
            entriesApi.getEntries({
                ...search,
                cycleId: activeCycleId,
                cursor: pageParam,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!activeCycleId,
    });

    // 5. Invalidate and Mutations
    const deleteMutation = useMutation({
        mutationFn: entriesApi.removeEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            toast.success("Entry deleted.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to delete entry.";
            toast.error(msg);
        },
    });

    const expenses = useMemo(() => {
        return entriesData?.pages.flatMap((page) => page.items) ?? [];
    }, [entriesData]);

    const categoryByCode = useMemo(() => {
        const record: Record<string, any> = {};
        settings?.categories?.forEach((c) => {
            record[c.code] = c;
        });
        return record;
    }, [settings?.categories]);

    const paymentMethods = useMemo(() => settings?.paymentMethods ?? [], [settings]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const dateRefs = useRef<Map<string, HTMLElement>>(new Map());

    const cycleExpenses = useMemo(() => {
        if (!activeCycleId) return [];
        return expenses.filter((e) => e.cycleId === activeCycleId);
    }, [expenses, activeCycleId]);

    const scopeExpenses = useMemo(() => {
        return search.scope === "all" ? expenses : cycleExpenses;
    }, [expenses, cycleExpenses, search.scope]);

    const filtered = expenses;

    const grouped = useMemo(() => {
        const map = new Map<string, Expense[]>();
        for (const e of filtered) {
            const arr = map.get(e.date) ?? [];
            arr.push(e);
            map.set(e.date, arr);
        }
        return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [filtered]);

    const total = useMemo(() => cycleExpenses.reduce((s, e) => s + e.amount, 0), [cycleExpenses]);
    const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

    const openNew = () => {
        setEditing(null);
        setDialogOpen(true);
    };

    const openEdit = (e: Expense) => {
        setEditing(e);
        setDialogOpen(true);
    };

    const clearDate = () => setFilter({ date: null });
    const reset = () => setFilter(clearedSearch());

    // Summary calculations
    const today = activeCycle ? todayDayIndex(activeCycle) : 0;
    const cycleDays = activeCycle ? daysBetween(activeCycle.start, activeCycle.end) : 0;
    const daysSoFar = today + 1;
    const pace = total / Math.max(daysSoFar, 1);
    const daysLeft = Math.max(cycleDays - daysSoFar, 0);

    const sparkPath = useMemo(() => {
        if (!activeCycle) return "";
        const pts = cumulative(buildDailySeries(activeCycle, expenses));
        const max = Math.max(...pts.map((p) => p.cum), 1);
        const W = 100, H = 24;
        return pts
            .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / Math.max(pts.length - 1, 1)) * W} ${H - (p.cum / max) * H}`)
            .join(" ");
    }, [activeCycle, expenses]);

    const topCats = useMemo(() => {
        return Object.entries(totalsByCategory(expenses))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    }, [expenses]);

    // Scroll selected date into view
    useEffect(() => {
        if (search.date) {
            const el = dateRefs.current.get(search.date);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [search.date]);

    const isLoading = isSettingsLoading || isCyclesLoading || isEntriesLoading;

    if (isLoading) {
        return (
            <div className="px-6 md:px-10 py-8 space-y-8 font-mono text-xs uppercase tracking-widest text-mute">
                Loading entries...
            </div>
        );
    }

    if (!activeCycle) {
        return (
            <div className="px-6 md:px-10 py-8 text-center">
                <div className="font-serif text-3xl italic">No Active Cycle</div>
                <div className="mt-2 font-mono text-xs uppercase tracking-widest text-mute mb-4">
                    Create or select an active cycle in settings to view entries.
                </div>
                <Link
                    href="/app/cycles"
                    className="brutal-border brutal-shadow brutal-press bg-yellow px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink"
                >
                    Setup Cycle
                </Link>
            </div>
        );
    }

    return (
        <div className="px-6 md:px-10 py-8">
            <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-6">
                <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">№ 002 — entries</div>
                    <h1 className="mt-1 font-serif text-4xl md:text-5xl leading-[0.95] tracking-tight">
                        {activeCycle.label}
                    </h1>
                    <div className="mt-2 font-mono text-xs text-mute">{formatDateRange(activeCycle.start, activeCycle.end)}</div>
                </div>
                <div className="flex items-end gap-4">
                    <div className="text-right">
                        <div className="font-mono text-[11px] uppercase tracking-widest text-mute">cycle total</div>
                        <div className="font-mono text-4xl md:text-5xl font-bold tabular-nums">{formatMoney(total)}</div>
                    </div>
                    <button
                        onClick={openNew}
                        className="brutal-border brutal-shadow brutal-press bg-pink px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> New entry
                    </button>
                </div>
            </header>

            {cycleExpenses.length > 0 && (
                <div className="mt-6 brutal-border bg-paper p-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="brutal-border bg-secondary px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                            {formatMoney(Math.round(pace))}/day · {daysLeft}d left
                        </span>
                        <svg width="100" height="24" viewBox="0 0 100 24" className="shrink-0">
                            <path d={sparkPath} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
                        </svg>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                        {topCats.map(([cat, amt]) => (
                            <span key={cat} className="inline-flex items-center gap-1.5 brutal-border bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-widest">
                                <span className="inline-block h-2.5 w-2.5 brutal-border" style={{ backgroundColor: chartColorFromClass(categoryByCode[cat]?.color ?? "bg-teal") }} />
                                #{categoryByCode[cat]?.name ?? cat}
                                <span className="font-bold tabular-nums normal-case">{formatMoney(amt)}</span>
                            </span>
                        ))}
                    </div>
                    <Link
                        href="/app/insights"
                        className="brutal-border brutal-press bg-yellow px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shrink-0"
                    >
                        See insights <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            )}

            <FilterBar
                filter={search as any}
                setFilter={setFilter as any}
                reset={reset}
                scopeExpenses={scopeExpenses}
                filteredCount={filtered.length}
                totalCount={scopeExpenses.length}
                filteredTotal={filteredTotal}
            />

            {grouped.length === 0 ? (
                <div className="mt-8 text-center border-2 border-dashed border-ink/30 py-16 bg-paper/50">
                    <div className="font-serif text-2xl italic">No entries found</div>
                    <div className="mt-1.5 font-mono text-xs uppercase tracking-widest text-mute">
                        Try clearing some search filters
                    </div>
                </div>
            ) : (
                <div className="mt-8 space-y-8">
                    {grouped.map(([date, items]) => {
                        const dayTotal = items.reduce((s, e) => s + e.amount, 0);
                        return (
                            <section key={date} ref={(el) => { if (el) dateRefs.current.set(date, el); else dateRefs.current.delete(date); }}>
                                <div className="flex items-baseline justify-between border-b-2 border-dashed border-ink pb-2 mb-3">
                                    <div className="font-mono text-xs uppercase tracking-widest">
                                        {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                                    </div>
                                    <div className="font-mono text-xs tabular-nums text-mute">{formatMoney(dayTotal)}</div>
                                </div>
                                <ul className="divide-y-2 divide-ink/10">
                                    {items.map((e) => {
                                        const pmType = settings?.paymentMethodTypes?.find((t) => t.code === e.payment.type);
                                        const defaultLabels: Record<string, string> = {
                                            netbanking: "Net",
                                            wallet: "Wal",
                                            paylater: "Later",
                                        };
                                        const fallbackLabel = pmType ? (defaultLabels[pmType.code] ?? pmType.name) : e.payment.type;
                                        const savedMethod = e.payment.methodId ? paymentMethods.find((m) => m.id === e.payment.methodId) : undefined;
                                        const payLabel = savedMethod
                                            ? savedMethod.label
                                            : `${fallbackLabel}${e.payment.cardName ? ` · ${e.payment.cardName}` : ""}`;
                                        return (
                                            <li key={e.id} className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-secondary/40 border-b border-ink/5 last:border-0">
                                                <div
                                                    onClick={() => openEdit(e)}
                                                    className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
                                                >
                                                    <span className={`brutal-border inline-block h-4 w-4 shrink-0 ${e.category.color}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-mono text-sm truncate">{e.note}</div>
                                                        <div className="font-mono text-[10px] uppercase tracking-widest text-mute truncate flex items-center gap-1.5 mt-0.5">
                                                            <span>#{e.subCategory?.name ?? e.category.name}</span>
                                                            <span>·</span>
                                                            <span>{payLabel}</span>
                                                            {e.split && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span className="inline-flex items-center gap-0.5">
                                                                        <Users className="h-2.5 w-2.5" /> split
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono text-sm font-bold tabular-nums">{formatMoney(e.amount)}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => openEdit(e)}
                                                            className="brutal-border brutal-press p-1 hover:bg-yellow"
                                                            aria-label="Edit entry"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                         <button
                                                             onClick={() => {
                                                                 if (window.confirm("Are you sure you want to delete this entry?")) {
                                                                     deleteMutation.mutate(e.id);
                                                                 }
                                                             }}
                                                             className="brutal-border brutal-press p-1 hover:bg-pink"
                                                             aria-label="Delete entry"
                                                         >
                                                             <Trash2 className="h-3 w-3" />
                                                         </button>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}

                    {hasNextPage && (
                        <div className="pt-4 flex justify-center">
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="brutal-border brutal-shadow brutal-press bg-yellow px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                            >
                                {isFetchingNextPage ? "Loading more..." : "Load older ▸"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <ExpenseDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditing(null); }}
                editing={editing}
            />
        </div>
    );
}