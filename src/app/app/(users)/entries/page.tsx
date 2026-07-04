"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useExpenses, formatMoney, formatDateRange, PAYMENT_META, type Expense } from "@/lib/expense-store";
import { CATEGORY_META } from "@/lib/mock-parse";
import { ArrowRight, MessageSquare, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { ExpenseDialog } from "@/components/entries/expense-dialog";
import { CATEGORY_FILL, buildDailySeries, cumulative, daysBetween, todayDayIndex, totalsByCategory } from "@/lib/insights";
import { clearedSearch, filterEntries, parseSearch, type EntryFilter } from "@/lib/entry-filter";
import { FilterBar } from "@/components/entries/filter-bar";

export default function EntriesPage() {
    const { expenses, activeCycle, removeExpense, paymentMethods } = useExpenses();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const dateRefs = useRef<Map<string, HTMLElement>>(new Map());

    // Parse filters from Next.js URL query params
    const search = useMemo(() => {
        return parseSearch(searchParams);
    }, [searchParams]);

    const setFilter = (f: EntryFilter) => {
        const params = new URLSearchParams();
        if (f.scope) params.set("scope", f.scope);
        if (f.q) params.set("q", f.q);
        if (f.cats?.length) params.set("cats", f.cats.join(","));
        if (f.subs?.length) params.set("subs", f.subs.join(","));
        if (f.pms?.length) params.set("pms", f.pms.join(","));
        if (f.pts?.length) params.set("pts", f.pts.join(","));
        if (f.min != null) params.set("min", String(f.min));
        if (f.max != null) params.set("max", String(f.max));
        if (f.from) params.set("from", f.from);
        if (f.to) params.set("to", f.to);
        if (f.date) params.set("date", f.date);
        if (f.splitOnly) params.set("splitOnly", "true");

        router.push(`${pathname}?${params.toString()}`);
    };

    const cycleExpenses = useMemo(
        () => expenses.filter((e) => e.cycleId === activeCycle.id),
        [expenses, activeCycle.id],
    );

    const scopeExpenses = useMemo(
        () => (search.scope === "all" ? expenses : cycleExpenses),
        [expenses, cycleExpenses, search.scope],
    );

    const filtered = useMemo(
        () => filterEntries(expenses, search, activeCycle.id),
        [expenses, search, activeCycle.id],
    );

    const grouped = useMemo(() => {
        const map = new Map<string, typeof filtered>();
        for (const e of filtered) {
            const arr = map.get(e.date) ?? [];
            arr.push(e);
            map.set(e.date, arr);
        }
        return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [filtered]);

    const total = cycleExpenses.reduce((s, e) => s + e.amount, 0);
    const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

    const openNew = () => { setEditing(null); setDialogOpen(true); };
    const openEdit = (e: Expense) => { setEditing(e); setDialogOpen(true); };
    const clearDate = () => setFilter({ ...search, date: undefined });
    const reset = () => setFilter(clearedSearch());

    // Slim summary derivations
    const today = todayDayIndex(activeCycle);
    const cycleDays = daysBetween(activeCycle.start, activeCycle.end);
    const daysSoFar = today + 1;
    const pace = total / Math.max(daysSoFar, 1);
    const daysLeft = Math.max(cycleDays - daysSoFar, 0);
    const sparkPath = useMemo(() => {
        const pts = cumulative(buildDailySeries(activeCycle, expenses));
        const max = Math.max(...pts.map((p) => p.cum), 1);
        const W = 100, H = 24;
        return pts
            .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / Math.max(pts.length - 1, 1)) * W} ${H - (p.cum / max) * H}`)
            .join(" ");
    }, [activeCycle, expenses]);
    const topCats = useMemo(() => {
        const m = totalsByCategory(cycleExpenses);
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [cycleExpenses]);

    useEffect(() => {
        if (search.date) {
            const el = dateRefs.current.get(search.date);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [search.date]);

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
                                <span className="inline-block h-2.5 w-2.5 brutal-border" style={{ backgroundColor: CATEGORY_FILL[cat] as string }} />
                                #{CATEGORY_META[cat].label}
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
                filter={search}
                setFilter={setFilter}
                reset={reset}
                scopeExpenses={scopeExpenses}
                filteredCount={filtered.length}
                totalCount={scopeExpenses.length}
                filteredTotal={filteredTotal}
            />

            {search.date && (
                <div className="mt-3 inline-flex items-center gap-2 brutal-border bg-yellow px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
                    filtering to {search.date}
                    <button onClick={clearDate} aria-label="Clear date filter" className="brutal-border bg-paper h-5 w-5 flex items-center justify-center">
                        <X className="h-2.5 w-2.5" />
                    </button>
                </div>
            )}

            {grouped.length === 0 ? (
                <div className="mt-16 text-center">
                    <div className="font-serif text-3xl italic">Nothing here yet.</div>
                    <div className="mt-2 font-mono text-xs uppercase tracking-widest text-mute">tap “new entry” or log one in chat</div>
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
                                        const meta = CATEGORY_META[e.category];
                                        const pay = PAYMENT_META[e.payment.type];
                                        const savedMethod = e.payment.methodId ? paymentMethods.find((m) => m.id === e.payment.methodId) : undefined;
                                        const payLabel = savedMethod
                                            ? savedMethod.label
                                            : `${pay.short}${e.payment.cardName ? ` · ${e.payment.cardName}` : ""}`;
                                        return (
                                            <li key={e.id} className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-secondary/40 border-b border-ink/5 last:border-0">
                                                <div
                                                    onClick={() => openEdit(e)}
                                                    className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
                                                >
                                                    <span className={`brutal-border inline-block h-4 w-4 shrink-0 ${meta.color}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-mono text-sm truncate">{e.note}</div>
                                                        <div className="font-mono text-[10px] uppercase tracking-widest text-mute truncate flex items-center gap-1.5 mt-0.5">
                                                            <span>#{e.subCategory ?? meta.label}</span>
                                                            <span>·</span>
                                                            <span>{payLabel}</span>
                                                            {e.split && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> split · {e.split.participants.length}</span>
                                                                </>
                                                            )}
                                                            {e.comment && (
                                                                <>
                                                                    <span>·</span>
                                                                    <MessageSquare className="h-3 w-3" />
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-sm font-bold tabular-nums pr-4 text-right">{formatMoney(e.amount)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => openEdit(e)}
                                                        aria-label="Edit entry"
                                                        className="brutal-border brutal-press bg-paper hover:bg-yellow h-7 px-2.5 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        <Pencil className="h-3 w-3" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => removeExpense(e.id)}
                                                        aria-label="Delete entry"
                                                        className="brutal-border brutal-press bg-paper hover:bg-pink h-7 w-7 flex items-center justify-center"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}

            <ExpenseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />
        </div>
    );
}
