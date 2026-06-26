import { Category, CATEGORY_META, type Expense } from "@/lib/expense-store";
import { useMemo } from "react";
import { totalsByCategory, CATEGORY_FILL } from "@/lib/insights";
import { formatMoney } from "@/lib/utils";

type Props = {
    expenses: Expense[];
    prevExpenses?: Expense[];
};
const CategoryDonut = ({ expenses, prevExpenses = [] }: Props) => {
    const { slices, total, prev } = useMemo(() => {
        const cur = totalsByCategory(expenses);
        const prv = totalsByCategory(prevExpenses);
        const total = [...cur.values()].reduce((s, v) => s + v, 0);
        const slices = [...cur.entries()]
            .map(([cat, amt]) => ({ cat, amt }))
            .sort((a, b) => b.amt - a.amt);
        return { slices, total, prev: prv };
    }, [expenses, prevExpenses]);

    const size = 180;
    const stroke = 36;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    let offset = 0;
    return (
        <div className="brutal-border brutal-shadow-sm bg-paper">
            <div className="px-5 py-3 border-b-2 border-ink font-mono text-xs uppercase tracking-widest">
                Category breakdown
            </div>
            <div className="p-5">
                {total === 0 ? (
                    <Empty />
                ) : (
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="relative shrink-0">
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
                                {slices.map((s) => {
                                    const frac = s.amt / total;
                                    const len = frac * c;
                                    const el = (
                                        <circle
                                            key={s.cat}
                                            cx={size / 2}
                                            cy={size / 2}
                                            r={r}
                                            fill="none"
                                            stroke={CATEGORY_FILL[s.cat]}
                                            strokeWidth={stroke}
                                            strokeDasharray={`${len} ${c - len}`}
                                            strokeDashoffset={-offset}
                                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                                        />
                                    );
                                    offset += len;
                                    return el;
                                })}
                                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink)" strokeWidth={2} />
                                <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
                                <circle cx={size / 2} cy={size / 2} r={r + stroke / 2} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-mute">total</div>
                                <div className="font-mono text-sm font-bold tabular-nums">{formatMoney(total)}</div>
                            </div>
                        </div>

                        <ul className="flex-1 min-w-[180px] space-y-1.5">
                            {slices.map((s) => {
                                const prevAmt = prev.get(s.cat) ?? 0;
                                const delta = s.amt - prevAmt;
                                const pct = ((s.amt / total) * 100).toFixed(0);
                                return (
                                    <li key={s.cat} className="flex items-center gap-2 text-sm">
                                        <span
                                            className="inline-block h-3 w-3 brutal-border shrink-0"
                                            style={{ backgroundColor: CATEGORY_FILL[s.cat] as string }}
                                        />
                                        <span className="font-mono text-xs uppercase tracking-widest flex-1">
                                            #{CATEGORY_META[s.cat as Category].label}
                                        </span>
                                        <span className="font-mono text-[10px] text-mute tabular-nums w-8 text-right">{pct}%</span>
                                        <span className="font-mono text-xs font-bold tabular-nums w-20 text-right">
                                            {formatMoney(s.amt)}
                                        </span>
                                        {prevExpenses.length > 0 && (
                                            <span
                                                className={`font-mono text-[10px] tabular-nums w-16 text-right ${delta > 0 ? "text-pink" : "text-teal"}`}
                                            >
                                                {delta === 0 ? "—" : `${delta > 0 ? "▲" : "▼"} ${formatMoney(Math.abs(delta))}`}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>

    )
}

export default CategoryDonut;

function Empty() {
    return <div className="font-mono text-xs text-mute py-6 text-center">No spend yet this cycle.</div>;
}