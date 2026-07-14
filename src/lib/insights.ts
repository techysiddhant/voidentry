import { DayPoint } from "@/types/catalog";
import type { Category } from "@/types/category";
import { Cycle } from "@/types/cycle";
import type { Expense } from "@/types/expense";

export function totalsByCategory(expenses: Expense[]) {
    const m = new Map<Category, number>();
    for (const e of expenses) m.set(e.category.code, (m.get(e.category.code) ?? 0) + e.amount);
    return m;
}
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
        pts[idx].byCat[e.category.code] = (pts[idx].byCat[e.category.code] ?? 0) + e.amount;
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