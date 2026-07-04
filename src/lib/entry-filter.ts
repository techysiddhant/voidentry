import type { Category, PaymentType, Expense } from "./expense-store";

export interface EntryFilter {
    q?: string;
    cats?: Category[];
    subs?: string[];
    pms?: string[];
    pts?: PaymentType[];
    min?: number;
    max?: number;
    from?: string;
    to?: string;
    date?: string;
    scope?: "cycle" | "all";
    splitOnly?: boolean;
}

export function parseSearch(search: Record<string, unknown> | URLSearchParams): EntryFilter {
    let obj: Record<string, any> = {};
    if (search instanceof URLSearchParams) {
        for (const [key, value] of search.entries()) {
            obj[key] = value;
        }
    } else {
        obj = search || {};
    }

    const parseArray = (val: any) => {
        if (!val) return undefined;
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed;
            } catch {}
            return val.split(",");
        }
        return undefined;
    };

    return {
        q: typeof obj.q === "string" ? obj.q : undefined,
        cats: parseArray(obj.cats) as Category[] | undefined,
        subs: parseArray(obj.subs),
        pms: parseArray(obj.pms),
        pts: parseArray(obj.pts) as PaymentType[] | undefined,
        min: obj.min != null && !isNaN(Number(obj.min)) ? Number(obj.min) : undefined,
        max: obj.max != null && !isNaN(Number(obj.max)) ? Number(obj.max) : undefined,
        from: typeof obj.from === "string" ? obj.from : undefined,
        to: typeof obj.to === "string" ? obj.to : undefined,
        date: typeof obj.date === "string" ? obj.date : undefined,
        scope: obj.scope === "all" ? "all" : "cycle",
        splitOnly: obj.splitOnly === "true" || obj.splitOnly === true ? true : undefined,
    };
}

export function clearedSearch(): EntryFilter {
    return {
        scope: "cycle",
    };
}

export function activeFilterCount(f: EntryFilter): number {
    let count = 0;
    if (f.cats?.length) count += f.cats.length;
    if (f.subs?.length) count += f.subs.length;
    if (f.pms?.length) count += f.pms.length;
    if (f.pts?.length) count += f.pts.length;
    if (f.min != null || f.max != null) count += 1;
    if (f.from || f.to) count += 1;
    if (f.splitOnly) count += 1;
    return count;
}

export function filterEntries(expenses: Expense[], filter: EntryFilter, activeCycleId: string): Expense[] {
    return expenses.filter((e) => {
        if ((filter.scope ?? "cycle") === "cycle") {
            if (e.cycleId !== activeCycleId) return false;
        }

        if (filter.q) {
            const query = filter.q.toLowerCase();
            const noteMatch = e.note.toLowerCase().includes(query);
            const subMatch = e.subCategory?.toLowerCase().includes(query) ?? false;
            const commentMatch = e.comment?.toLowerCase().includes(query) ?? false;
            if (!noteMatch && !subMatch && !commentMatch) return false;
        }

        if (filter.cats?.length) {
            if (!filter.cats.includes(e.category)) return false;
        }

        if (filter.subs?.length) {
            if (!e.subCategory || !filter.subs.includes(e.subCategory.toLowerCase())) return false;
        }

        if (filter.pms?.length) {
            if (!e.payment.methodId || !filter.pms.includes(e.payment.methodId)) return false;
        }

        if (filter.pts?.length) {
            if (!filter.pts.includes(e.payment.type)) return false;
        }

        if (filter.min != null) {
            if (e.amount < filter.min) return false;
        }
        if (filter.max != null) {
            if (e.amount > filter.max) return false;
        }

        if (filter.from) {
            if (e.date < filter.from) return false;
        }
        if (filter.to) {
            if (e.date > filter.to) return false;
        }

        if (filter.date) {
            if (e.date !== filter.date) return false;
        }

        if (filter.splitOnly) {
            if (!e.split) return false;
        }

        return true;
    });
}
