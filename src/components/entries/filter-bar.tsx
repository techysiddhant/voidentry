import { useEffect, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PAYMENT_META, formatMoney, useExpenses, type Expense } from "@/lib/expense-store";
import type { EntryFilter } from "@/lib/entry-filter";
import { activeFilterCount } from "@/lib/entry-filter";
import { FilterPanel } from "./filter-pannel";

export function FilterBar({
    filter,
    setFilter,
    reset,
    scopeExpenses,
    filteredCount,
    totalCount,
    filteredTotal,
}: {
    filter: EntryFilter;
    setFilter: (f: EntryFilter) => void;
    reset: () => void;
    scopeExpenses: Expense[];
    filteredCount: number;
    totalCount: number;
    filteredTotal: number;
}) {
    const { paymentMethods, categoryByCode, subCategoryByCode } = useExpenses();
    const [q, setQ] = useState(filter.q ?? "");
    const [open, setOpen] = useState(false);

    // debounce search → URL
    useEffect(() => {
        const t = setTimeout(() => {
            if ((filter.q ?? "") !== q) setFilter({ ...filter, q: q || undefined });
        }, 150);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    // keep input in sync if URL changes externally (e.g. reset)
    useEffect(() => {
        if ((filter.q ?? "") !== q) setQ(filter.q ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter.q]);

    const count = activeFilterCount(filter);
    const chips = buildChips(filter, paymentMethods, categoryByCode, subCategoryByCode);

    return (
        <div className="mt-4 brutal-border bg-paper">
            <div className="flex flex-wrap items-stretch gap-0">
                <label className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 border-r-2 border-ink">
                    <Search className="h-3.5 w-3.5 text-mute" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="search note, sub, comment…"
                        className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-mute"
                    />
                    {q && (
                        <button onClick={() => setQ("")} aria-label="Clear search" className="text-mute hover:text-ink">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </label>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <button className="brutal-press bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-2 border-r-2 border-ink">
                            <Filter className="h-3.5 w-3.5" /> filters
                            {count > 0 && (
                                <span className="brutal-border bg-pink px-1.5 py-0.5 text-[10px] leading-none">{count}</span>
                            )}
                        </button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 bg-paper border-l-2 border-ink [&>button]:hidden">
                        <FilterPanel
                            filter={filter}
                            setFilter={setFilter}
                            reset={reset}
                            scopeExpenses={scopeExpenses}
                            onClose={() => setOpen(false)}
                        />
                    </SheetContent>
                </Sheet>
                <button
                    onClick={reset}
                    disabled={count === 0 && !filter.q && !filter.date}
                    className="brutal-press bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest disabled:opacity-40"
                >
                    reset
                </button>
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-ink px-3 py-2">
                    {chips.map((c) => (
                        <span key={c.key} className="inline-flex items-center gap-1.5 brutal-border bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                            {c.label}
                            <button onClick={() => setFilter(c.remove(filter))} aria-label={`Remove ${c.label}`} className="hover:bg-pink">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="border-t-2 border-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-mute">
                showing {filteredCount} of {totalCount} entries · <span className="tabular-nums normal-case font-bold text-ink">{formatMoney(filteredTotal)}</span>
            </div>
        </div>
    );
}

type Chip = { key: string; label: string; remove: (f: EntryFilter) => EntryFilter };

function buildChips(
    f: EntryFilter,
    pms: { id: string; label: string }[],
    categoryByCode: Record<string, { name: string }>,
    subCategoryByCode: Record<string, { name: string }>,
): Chip[] {
    const chips: Chip[] = [];
    if (f.q) chips.push({ key: "q", label: `“${f.q}”`, remove: (x) => ({ ...x, q: undefined }) });
    for (const c of f.cats ?? []) chips.push({
        key: `c-${c}`,
        label: `#${categoryByCode[c]?.name ?? c}`,
        remove: (x) => ({ ...x, cats: (x.cats ?? []).filter((y) => y !== c).length ? (x.cats ?? []).filter((y) => y !== c) : undefined }),
    });
    for (const s of f.subs ?? []) chips.push({
        key: `s-${s}`,
        label: subCategoryByCode[s]?.name ?? s,
        remove: (x) => ({ ...x, subs: (x.subs ?? []).filter((y) => y !== s).length ? (x.subs ?? []).filter((y) => y !== s) : undefined }),
    });
    for (const id of f.pms ?? []) {
        const pm = pms.find((m) => m.id === id);
        chips.push({
            key: `pm-${id}`,
            label: pm?.label ?? "pm",
            remove: (x) => ({ ...x, pms: (x.pms ?? []).filter((y) => y !== id).length ? (x.pms ?? []).filter((y) => y !== id) : undefined }),
        });
    }
    for (const p of f.pts ?? []) chips.push({
        key: `pt-${p}`,
        label: PAYMENT_META[p].short,
        remove: (x) => ({ ...x, pts: (x.pts ?? []).filter((y) => y !== p).length ? (x.pts ?? []).filter((y) => y !== p) : undefined }),
    });
    if (f.min != null || f.max != null) chips.push({
        key: "amt",
        label: `₹${f.min ?? "0"}–${f.max ?? "∞"}`,
        remove: (x) => ({ ...x, min: undefined, max: undefined }),
    });
    if (f.from || f.to) chips.push({
        key: "range",
        label: `${f.from ?? "…"} → ${f.to ?? "…"}`,
        remove: (x) => ({ ...x, from: undefined, to: undefined }),
    });
    if (f.date) chips.push({
        key: "date",
        label: `on ${f.date}`,
        remove: (x) => ({ ...x, date: undefined }),
    });
    if (f.scope === "all") chips.push({
        key: "scope",
        label: "all cycles",
        remove: (x) => ({ ...x, scope: "cycle" }),
    });
    if (f.splitOnly) chips.push({
        key: "split",
        label: "splits only",
        remove: (x) => ({ ...x, splitOnly: undefined }),
    });
    return chips;
}
