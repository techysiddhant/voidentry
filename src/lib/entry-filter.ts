import type { Expense } from "@/types/expense";

export interface EntryFilter {
    scope: string;
    q?: string | null;
    cats?: string[] | null;
    subs?: string[] | null;
    pms?: string[] | null;
    pts?: string[] | null;
    min?: number | null;
    max?: number | null;
    from?: string | null;
    to?: string | null;
    date?: string | null;
    splitOnly?: boolean | null;
}

export function clearedSearch(): any {
    return {
        scope: "cycle",
        q: null,
        cats: null,
        subs: null,
        pms: null,
        pts: null,
        min: null,
        max: null,
        from: null,
        to: null,
        date: null,
        splitOnly: null,
    };
}

export function activeFilterCount(f: Partial<EntryFilter>): number {
    let count = 0;
    if (f.scope === "all") count++;
    if (f.cats?.length) count += f.cats.length;
    if (f.subs?.length) count += f.subs.length;
    if (f.pms?.length) count += f.pms.length;
    if (f.pts?.length) count += f.pts.length;
    if (f.min != null || f.max != null) count++;
    if (f.from || f.to) count++;
    if (f.splitOnly) count++;
    return count;
}

export function filterEntries(
    expenses: Expense[],
    f: Partial<EntryFilter>,
    activeCycleId?: string | null
): Expense[] {
    return expenses.filter((e) => {
        // Scope filter
        if (f.scope !== "all" && activeCycleId && e.cycleId !== activeCycleId) {
            return false;
        }

        // Search query filter
        if (f.q) {
            const query = f.q.toLowerCase().trim();
            const noteMatch = e.note.toLowerCase().includes(query);
            const commentMatch = e.comment?.toLowerCase().includes(query) ?? false;
            const catMatch = e.category.name.toLowerCase().includes(query);
            const subMatch = e.subCategory?.name.toLowerCase().includes(query) ?? false;
            if (!noteMatch && !commentMatch && !catMatch && !subMatch) {
                return false;
            }
        }

        // Category filter
        if (f.cats?.length && !f.cats.includes(e.category.code)) {
            return false;
        }

        // Subcategory filter
        if (f.subs?.length) {
            if (!e.subCategory) return false;
            const matched = f.subs.some((s) => {
                const parts = s.split(":");
                if (parts.length === 2) {
                    return e.category.code === parts[0] && e.subCategory?.code === parts[1];
                }
                return e.subCategory?.code === s;
            });
            if (!matched) return false;
        }

        // Payment Method filter
        if (f.pms?.length && (!e.payment.methodId || !f.pms.includes(e.payment.methodId))) {
            return false;
        }

        // Payment Type filter
        if (f.pts?.length && !f.pts.includes(e.payment.type)) {
            return false;
        }

        // Amount filter
        if (f.min != null && e.amount < f.min) {
            return false;
        }
        if (f.max != null && e.amount > f.max) {
            return false;
        }

        // Date range filter
        if (f.from && e.date < f.from) {
            return false;
        }
        if (f.to && e.date > f.to) {
            return false;
        }

        // Exact date filter
        if (f.date && e.date !== f.date) {
            return false;
        }

        // Split only filter
        if (f.splitOnly && !e.split) {
            return false;
        }

        return true;
    });
}
