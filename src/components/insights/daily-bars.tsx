"use client";
import { Category, Cycle, Expense } from "@/lib/expense-store";
import { buildDailySeries, CATEGORY_FILL } from "@/lib/insights";
import { formatMoney } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = { cycle: Cycle; expenses: Expense[] };

const CAT_ORDER: Category[] = ["food", "transport", "groceries", "housing", "subs", "misc"];
export function DailyBars({ cycle, expenses }: Props) {
    const router = useRouter();
    const [hover, setHover] = useState<number | null>(null);

    const { pts, max } = useMemo(() => {
        const pts = buildDailySeries(cycle, expenses);
        const max = Math.max(...pts.map((p) => p.total), 1);
        return { pts, max };
    }, [cycle, expenses]);

    const total = pts.reduce((s, p) => s + p.total, 0);

    return (
        <div className="brutal-border brutal-shadow-sm bg-paper">
            <div className="px-5 py-3 border-b-2 border-ink flex items-center justify-between">
                <div className="font-mono text-xs uppercase tracking-widest">Daily spend</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-mute">tap a bar to filter entries</div>
            </div>
            <div className="p-5">
                {total === 0 ? (
                    <div className="font-mono text-xs text-mute py-6 text-center">Nothing logged in this cycle yet.</div>
                ) : (
                    <>
                        <div className="flex items-end gap-[2px] h-40">
                            {pts.map((p) => {
                                const h = (p.total / max) * 100;
                                const stacked = CAT_ORDER.filter((c) => p.byCat[c]);
                                return (
                                    <button
                                        key={p.day}
                                        type="button"
                                        onMouseEnter={() => setHover(p.day)}
                                        onMouseLeave={() => setHover(null)}
                                        // onClick={() =>
                                        //     navigate({ to: "/app/entries", search: p.total > 0 ? { date: p.date } : {} })
                                        // }
                                        onClick={() => {
                                            router.push("/app/entries" + (p.total > 0 ? "?date=" + p.date : ""))
                                        }}
                                        className="flex-1 group relative flex flex-col-reverse justify-start min-w-0"
                                        aria-label={`${p.date} — ${formatMoney(p.total)}`}
                                    >
                                        <div
                                            className="flex flex-col-reverse w-full"
                                            style={{ height: `${Math.max(h, p.total > 0 ? 4 : 0)}%` }}
                                        >
                                            {stacked.map((cat) => {
                                                const partH = (p.byCat[cat]! / p.total) * 100;
                                                return (
                                                    <div
                                                        key={cat}
                                                        style={{
                                                            backgroundColor: CATEGORY_FILL[cat] as string,
                                                            height: `${partH}%`,
                                                        }}
                                                        className="border-l border-r border-ink first:border-t-2 last:border-b-2"
                                                    />
                                                );
                                            })}
                                        </div>
                                        {hover === p.day && p.total > 0 && (
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 brutal-border bg-ink text-paper px-2 py-1 font-mono text-[10px] whitespace-nowrap z-10">
                                                {p.date} · {formatMoney(p.total)}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-mute">
                            <span>{cycle.start.slice(8)}</span>
                            <span>{cycle.end.slice(8)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}