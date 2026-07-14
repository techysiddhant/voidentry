import { useMemo } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { cyclesApi } from "@/lib/api/cycles";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Expense } from "@/types/expense";
import { activeFilterCount, type EntryFilter } from "@/lib/entry-filter";
import { AmountHistogram } from "./amount-histogram";

function getPaymentTypeShortLabel(code: string, name: string) {
    if (code === "netbanking") return "Net";
    if (code === "wallet") return "Wal";
    if (code === "paylater") return "Later";
    return name;
}

function toggle<T>(arr: T[] | undefined | null, v: T): T[] | undefined {
    const set = new Set(arr ?? []);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    const out = [...set];
    return out.length ? out : undefined;
}

export function FilterPanel({
    filter,
    setFilter,
    reset,
    scopeExpenses,
    onClose,
}: {
    filter: EntryFilter;
    setFilter: (next: EntryFilter) => void;
    reset: () => void;
    scopeExpenses: Expense[];
    onClose: () => void;
}) {
    const { data: settings } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    const { data: cycles } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    const activeCycleId = settings?.preferences?.activeCycleId;
    const activeCycle = useMemo(() => {
        return cycles?.find((c) => c.id === activeCycleId);
    }, [cycles, activeCycleId]);

    const categories = useMemo(() => settings?.categories ?? [], [settings]);
    const paymentMethods = useMemo(() => settings?.paymentMethods ?? [], [settings]);
    const paymentMethodTypes = useMemo(() => settings?.paymentMethodTypes ?? [], [settings]);

    const subCategoriesByCategoryCode = useMemo(() => {
        const record: Record<string, any[]> = {};
        settings?.subCategories?.forEach((s) => {
            const arr = record[s.categoryCode] ?? [];
            arr.push(s);
            record[s.categoryCode] = arr;
        });
        return record;
    }, [settings?.subCategories]);

    const availableSubs = useMemo(() => {
        const catCodes = filter.cats?.length ? filter.cats : categories.map((category) => category.code);
        const seen = new Map<string, { categoryCode: string; code: string; name: string }>();
        for (const categoryCode of catCodes) {
            for (const subCategory of subCategoriesByCategoryCode[categoryCode] || []) {
                const key = `${categoryCode}:${subCategory.code}`;
                seen.set(key, { categoryCode, code: subCategory.code, name: subCategory.name });
            }
        }
        for (const expense of scopeExpenses) {
            if (expense.subCategory && catCodes.includes(expense.category.code)) {
                const key = `${expense.category.code}:${expense.subCategory.code}`;
                seen.set(key, { categoryCode: expense.category.code, code: expense.subCategory.code, name: expense.subCategory.name });
            }
        }
        return [...seen.entries()]
            .map(([key, item]) => ({ key, ...item }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [categories, filter.cats, scopeExpenses, subCategoriesByCategoryCode]);

    const setPreset = (preset: "cycle" | "7d" | "30d" | "all") => {
        if (preset === "cycle") {
            setFilter({ ...filter, scope: "cycle", from: null, to: null });
        } else if (preset === "all") {
            setFilter({ ...filter, scope: "all", from: null, to: null });
        } else {
            const days = preset === "7d" ? 7 : 30;
            const formatLocalDate = (date: Date) =>
                [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    String(date.getDate()).padStart(2, "0"),
                ].join("-");
            const today = new Date();
            const to = formatLocalDate(today);
            const fromD = new Date(today);
            fromD.setDate(today.getDate() - days + 1);
            const from = formatLocalDate(fromD);
            setFilter({ ...filter, scope: "all", from, to });
        }
    };

    return (
        <div className="flex h-full flex-col bg-paper">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">№ 002 ·</div>
                    <h2 className="font-serif text-2xl leading-none">Filters</h2>
                    {activeFilterCount(filter) > 0 && (
                        <span className="brutal-border bg-pink px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none">{activeFilterCount(filter)}</span>
                    )}
                </div>
                <button onClick={onClose} aria-label="Close" className="brutal-border brutal-press bg-paper h-7 w-7 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <Section title="scope">
                    <div className="flex gap-1.5">
                        <Chip on={(filter.scope ?? "cycle") === "cycle"} onClick={() => setFilter({ ...filter, scope: "cycle" })}>active cycle</Chip>
                        <Chip on={filter.scope === "all"} onClick={() => setFilter({ ...filter, scope: "all" })}>all cycles</Chip>
                    </div>
                </Section>

                <Section title="date range">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <Chip on={filter.scope !== "all" && !filter.from && !filter.to} onClick={() => setPreset("cycle")}>this cycle</Chip>
                        <Chip on={false} onClick={() => setPreset("7d")}>last 7d</Chip>
                        <Chip on={false} onClick={() => setPreset("30d")}>last 30d</Chip>
                        <Chip on={filter.scope === "all" && !filter.from && !filter.to} onClick={() => setPreset("all")}>all cycles</Chip>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filter.from ?? ""}
                            min={filter.scope === "cycle" && activeCycle ? activeCycle.start : undefined}
                            max={filter.scope === "cycle" && activeCycle ? activeCycle.end : undefined}
                            onChange={(e) => setFilter({ ...filter, from: e.target.value || null, scope: "all" })}
                            className="brutal-border bg-paper px-2 py-1 font-mono text-xs flex-1 min-w-0"
                        />
                        <span className="font-mono text-xs text-mute">→</span>
                        <input
                            type="date"
                            value={filter.to ?? ""}
                            onChange={(e) => setFilter({ ...filter, to: e.target.value || null, scope: "all" })}
                            className="brutal-border bg-paper px-2 py-1 font-mono text-xs flex-1 min-w-0"
                        />
                    </div>
                </Section>

                <Section title="category">
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((category) => {
                            const on = filter.cats?.includes(category.code);
                            return (
                                <Chip key={category.code} on={!!on} onClick={() => setFilter({ ...filter, cats: toggle(filter.cats, category.code) })}>
                                    #{category.name}
                                </Chip>
                            );
                        })}
                    </div>
                </Section>

                <Section title="sub-category">
                    {availableSubs.length === 0 ? (
                        <Empty>no sub-categories</Empty>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {availableSubs.map((subCategory) => {
                                const on = filter.subs?.includes(subCategory.key);
                                return (
                                    <Chip key={subCategory.key} on={!!on} onClick={() => setFilter({ ...filter, subs: toggle(filter.subs, subCategory.key) })}>
                                        {subCategory.name}
                                    </Chip>
                                );
                            })}
                        </div>
                    )}
                </Section>

                <Section title="payment method">
                    {paymentMethods.length === 0 ? (
                        <Empty>no methods saved</Empty>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {paymentMethods.map((m) => {
                                const on = filter.pms?.includes(m.id);
                                return (
                                    <Chip key={m.id} on={!!on} onClick={() => setFilter({ ...filter, pms: toggle(filter.pms, m.id) })}>
                                        {m.label}
                                        {m.hint && <span className="ml-1 text-mute normal-case">· {m.hint}</span>}
                                    </Chip>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-mute">type:</span>
                        {paymentMethodTypes.map((pmType) => {
                            const on = filter.pts?.includes(pmType.code);
                            return (
                                <Chip key={pmType.code} on={!!on} onClick={() => setFilter({ ...filter, pts: toggle(filter.pts, pmType.code) })}>
                                    {getPaymentTypeShortLabel(pmType.code, pmType.name)}
                                </Chip>
                            );
                        })}
                    </div>
                </Section>

                <Section title="amount range (₹)">
                    <AmountHistogram expenses={scopeExpenses} min={filter.min ?? undefined} max={filter.max ?? undefined} />
                    <div className="mt-2 flex items-center gap-2">
                        <NumInput placeholder="min" value={filter.min ?? undefined} onChange={(v) => setFilter({ ...filter, min: v ?? null })} />
                        <span className="font-mono text-xs text-mute">to</span>
                        <NumInput placeholder="max" value={filter.max ?? undefined} onChange={(v) => setFilter({ ...filter, max: v ?? null })} />
                    </div>
                </Section>

                <Section title="other">
                    <Chip on={!!filter.splitOnly} onClick={() => setFilter({ ...filter, splitOnly: filter.splitOnly ? null : true })}>
                        splits only
                    </Chip>
                </Section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t-2 border-ink bg-paper px-5 py-3 shrink-0">
                <button
                    onClick={reset}
                    className="brutal-border brutal-press bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest"
                >
                    reset all
                </button>
                <button
                    onClick={onClose}
                    className="brutal-border brutal-shadow brutal-press bg-pink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest"
                >
                    apply ▸
                </button>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="pb-5 border-b border-dashed border-ink/30 last:border-0 last:pb-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-mute mb-2.5">{title}</div>
            {children}
        </div>
    );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={[
                "brutal-border brutal-press px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest",
                on ? "bg-ink text-paper" : "bg-paper",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <div className="font-mono text-[10px] uppercase tracking-widest text-mute">{children}</div>;
}

function NumInput({ value, onChange, placeholder }: { value?: number; onChange: (v: number | undefined) => void; placeholder: string }) {
    return (
        <input
            type="number"
            inputMode="numeric"
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange(undefined);
                else {
                    const n = parseFloat(v);
                    onChange(Number.isFinite(n) && n > 0 ? n : undefined);
                }
            }}
            className="brutal-border bg-paper px-2 py-1 font-mono text-xs flex-1 min-w-0"
        />
    );
}