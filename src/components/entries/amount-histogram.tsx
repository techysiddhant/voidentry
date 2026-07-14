import type { Expense } from "@/types/expense";

export function AmountHistogram({ expenses, min, max }: { expenses: Expense[]; min?: number; max?: number }) {
    if (expenses.length === 0) return null;
    const amounts = expenses.map((e) => e.amount);
    const lo = Math.min(...amounts);
    const hi = Math.max(...amounts);
    if (hi <= lo) return null;
    const N = 10;
    const buckets = new Array(N).fill(0) as number[];
    for (const a of amounts) {
        const idx = Math.min(N - 1, Math.floor(((a - lo) / (hi - lo)) * N));
        buckets[idx]++;
    }
    const peak = Math.max(...buckets, 1);
    const W = 240, H = 36, bw = W / N;
    const inRange = (i: number) => {
        const bLo = lo + ((hi - lo) * i) / N;
        const bHi = lo + ((hi - lo) * (i + 1)) / N;
        if (min != null && bHi < min) return false;
        if (max != null && bLo > max) return false;
        return true;
    };
    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="brutal-border bg-paper">
            {buckets.map((c, i) => {
                const h = (c / peak) * (H - 4);
                return (
                    <rect
                        key={i}
                        x={i * bw + 1}
                        y={H - h - 2}
                        width={bw - 2}
                        height={h}
                        fill="var(--ink)"
                        opacity={inRange(i) ? 1 : 0.2}
                    />
                );
            })}
        </svg>
    );
}