import { Category, Cycle, Expense, PaymentMethod } from "./expense-store";

export type DayPoint = { day: number; date: string; total: number; byCat: Partial<Record<Category, number>> };

// Inclusive day count between two ISO yyyy-mm-dd strings, UTC-stable.
export function daysBetween(start: string, end: string) {
    const s = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
    const e = Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, +end.slice(8, 10));
    return Math.round((e - s) / 86_400_000) + 1;
}

export function shiftIso(start: string, dayIndex: number) {
    const d = new Date(Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10) + dayIndex));
    return d.toISOString().slice(0, 10);
}

// Build per-day series for a cycle. Day 0 = cycle start.
export function buildDailySeries(cycle: Cycle, expenses: Expense[]): DayPoint[] {
    const n = daysBetween(cycle.start, cycle.end);
    const pts: DayPoint[] = [];
    for (let i = 0; i < n; i++) {
        const date = shiftIso(cycle.start, i);
        pts.push({ day: i, date, total: 0, byCat: {} });
    }
    for (const e of expenses) {
        if (e.cycleId !== cycle.id) continue;
        const idx = pts.findIndex((p) => p.date === e.date);
        if (idx < 0) continue;
        pts[idx].total += e.amount;
        pts[idx].byCat[e.category] = (pts[idx].byCat[e.category] ?? 0) + e.amount;
    }
    return pts;
}

export function cumulative(points: DayPoint[]) {
    let run = 0;
    return points.map((p) => {
        run += p.total;
        return { ...p, cum: run };
    });
}

export function totalsByCategory(expenses: Expense[]) {
    const m = new Map<Category, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return m;
}

export function todayDayIndex(cycle: Cycle) {
    const now = new Date();
    const today = isoFromDate(now);
    if (today < cycle.start) return 0;
    if (today > cycle.end) return daysBetween(cycle.start, cycle.end) - 1;
    return daysBetween(cycle.start, today) - 1;
}

function isoFromDate(d: Date) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export type MethodTotal = { method?: PaymentMethod; type: string; label: string; hint?: string; total: number };

export function totalsByMethod(expenses: Expense[], methods: PaymentMethod[]): MethodTotal[] {
    const m = new Map<string, MethodTotal>();
    for (const e of expenses) {
        const key = e.payment.methodId ?? `~${e.payment.type}${e.payment.cardName ?? ""}`;
        const method = e.payment.methodId ? methods.find((x) => x.id === e.payment.methodId) : undefined;
        const label = method?.label ?? (e.payment.cardName || e.payment.type.toUpperCase());
        const hint = method?.hint;
        const existing = m.get(key);
        if (existing) existing.total += e.amount;
        else m.set(key, { method, type: e.payment.type, label, hint, total: e.amount });
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
}

export function topNotes(expenses: Expense[], limit = 5) {
    const m = new Map<string, { note: string; total: number; count: number }>();
    for (const e of expenses) {
        const key = (e.note || "").trim().toLowerCase();
        if (!key) continue;
        const existing = m.get(key);
        if (existing) {
            existing.total += e.amount;
            existing.count += 1;
        } else {
            m.set(key, { note: e.note.trim(), total: e.amount, count: 1 });
        }
    }
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function splitBalances(expenses: Expense[]) {
    // payer is implicitly "you" in this UI prototype. Others owe their `share`.
    const owed = new Map<string, number>();
    let total = 0;
    for (const e of expenses) {
        if (!e.split) continue;
        for (const p of e.split.participants) {
            if (p.contactId === "you") continue;
            owed.set(p.contactId, (owed.get(p.contactId) ?? 0) + p.share);
            total += p.share;
        }
    }
    return { perContact: owed, total };
}

// SVG-safe color references mirroring CATEGORY_META.
export const CATEGORY_FILL: Record<Category, string> = {
    food: "var(--pink)",
    transport: "var(--yellow)",
    groceries: "var(--teal)",
    housing: "var(--ink)",
    utilities: "var(--teal)",
    subs: "var(--pink)",
    personal: "var(--pink)",
    travel: "var(--yellow)",
    misc: "var(--teal)",
};