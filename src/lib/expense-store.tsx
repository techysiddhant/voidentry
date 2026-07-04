"use client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-keys";
import { settingsApi } from "./api/settings";
import { cyclesApi } from "./api/cycles";
import { entriesApi } from "./api/entries";
import { getCalendarMonth } from "./utils";

export type Category = "food" | "transport" | "groceries" | "housing" | "utilities" | "subs" | "personal" | "travel" | "misc";

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
    food: { label: "food", color: "bg-pink" },
    transport: { label: "transport", color: "bg-yellow" },
    groceries: { label: "groceries", color: "bg-teal" },
    housing: { label: "housing", color: "bg-ink" },
    utilities: { label: "utilities", color: "bg-teal" },
    subs: { label: "subs", color: "bg-pink" },
    personal: { label: "personal", color: "bg-pink" },
    travel: { label: "travel", color: "bg-yellow" },
    misc: { label: "misc", color: "bg-teal" },
};

export const SUBCATEGORIES: Record<Category, string[]> = {
    food: ["dining out", "coffee & cafes", "fast food / delivery"],
    transport: ["public transit", "rideshare & cabs", "fuel & gas", "parking & tolls", "vehicle maintenance"],
    groceries: ["supermarket", "vegetables", "kirana"],
    housing: ["rent / mortgage", "household goods & maintenance"],
    utilities: ["electricity & gas", "water & trash", "internet & wifi", "mobile & cell phone", "insurance"],
    subs: ["streaming services", "software & cloud subscriptions"],
    personal: ["gym & fitness", "salon & barbershop", "medical & healthcare", "shopping & clothing", "hobbies & sports"],
    travel: ["flights & trains", "lodging & hotels", "activities & sightseeing"],
    misc: ["gifts & donations", "education & books", "cash / ATM", "other / uncategorized"],
};

const CATEGORY_HINTS: Array<[Category, RegExp]> = [
    ["food", /\b(dining|lunch|dinner|breakfast|coffee|ramen|pizza|burger|cafe|restaurant|food|eat|brunch|snack|chai|thali|dosa|biryani)\b/i],
    ["transport", /\b(uber|ola|auto|taxi|cab|bus|train|metro|gas|fuel|petrol|parking|flight|airfare|tram)\b/i],
    ["groceries", /\b(grocer(y|ies)|supermarket|market|kirana|vegetables|sabzi)\b/i],
    ["housing", /\b(rent|mortgage|household|maintenance)\b/i],
    ["utilities", /\b(electric(ity)?|water bill|internet|wifi|utilities|cell|mobile|insurance)\b/i],
    ["subs", /\b(streaming|spotify|netflix|disney|apple|subscription|membership)\b/i],
    ["personal", /\b(gym|fitness|salon|barber|haircut|dentist|doctor|medical|medicine|pharmacy|shopping|clothing|clothes|hobby)\b/i],
    ["travel", /\b(hotel|flight|airfare|lodging|hostel|sightseeing|vacation)\b/i],
];

export type Parsed = {
    amount: number;
    note: string;
    category: Category;
    date: string; // ISO yyyy-mm-dd
};

function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function detectDate(text: string): string {
    if (/\byesterday\b/i.test(text)) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    }
    return todayISO();
}

export type Cycle = {
    id: string;
    label: string;
    start: string; // ISO date
    end: string;   // ISO date
    total?: number;
};

export type PaymentMethod = {
    id: string;
    type: PaymentType;
    label: string;
    hint?: string;
};

export type PaymentType = "cash" | "card" | "upi" | "netbanking" | "wallet";

export const PAYMENT_META: Record<PaymentType, { label: string; short: string }> = {
    cash: { label: "Cash", short: "cash" },
    card: { label: "Card", short: "card" },
    upi: { label: "UPI", short: "upi" },
    netbanking: { label: "Net Banking", short: "netbank" },
    wallet: { label: "Wallet", short: "wallet" },
};

export type SplitMode = "equal" | "exact";

export type SplitParticipant = { contactId: string; share: number };

export type Split = {
    mode: SplitMode;
    participants: SplitParticipant[];
};

export type Expense = {
    id: string;
    amount: number;
    note: string;
    category: Category;
    subCategory?: string;
    date: string;
    cycleId: string;
    payment: { type: PaymentType; cardName?: string; methodId?: string };
    comment?: string;
    split?: Split;
};

export type ExpenseInput = Omit<Expense, "id" | "cycleId">;

export type PaymentMethodInput = Omit<PaymentMethod, "id">;

export function parseMessage(raw: string): Parsed | null {
    const text = raw.trim();
    if (!text) return null;
    const cleaned = text.replace(/₹|\b(rs\.?|inr)\b/gi, " ");
    const amtMatch = cleaned.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!amtMatch) return null;
    const amount = parseFloat(amtMatch[1].replace(",", "."));
    if (!isFinite(amount) || amount <= 0) return null;

    let category: Category = "misc";
    for (const [c, rx] of CATEGORY_HINTS) {
        if (rx.test(text)) {
            category = c;
            break;
        }
    }

    const note = text
        .replace(amtMatch[0], "")
        .replace(/₹|\b(rs\.?|inr)\b/gi, "")
        .replace(/[€$£]/g, "")
        .replace(/\byesterday\b/i, "")
        .replace(/\s+/g, " ")
        .trim() || CATEGORY_META[category].label;

    return { amount, note, category, date: detectDate(text) };
}

export function formatMoney(val: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(val);
}

export function formatDateRange(start: string, end: string): string {
    const format = (dStr: string) => {
        const d = new Date(dStr + "T00:00:00Z");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    };
    return `${format(start)} – ${format(end)}`;
}

// ─── Custom Hook integrating TanStack Query & DB Operations ────────────────────

export function useExpenses() {
    const queryClient = useQueryClient();

    const { data: settings } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    const { data: cycles } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    // 1. Resolve active cycle
    const activeCycleId = settings?.preferences?.activeCycleId;
    const activeCycle = useMemo((): Cycle => {
        if (cycles && activeCycleId) {
            const found = cycles.find((c) => c.id === activeCycleId);
            if (found) return found;
        }
        if (cycles && cycles.length > 0) {
            return cycles[0];
        }
        const cal = getCalendarMonth();
        return {
            id: "active-cycle",
            label: cal.label,
            start: cal.start,
            end: cal.end,
        };
    }, [cycles, activeCycleId]);

    // 2. Fetch expenses from DB
    const { data: expenses = [] } = useQuery({
        queryKey: [QUERY_KEYS.ENTRIES, activeCycle.id],
        queryFn: () => entriesApi.getEntries({ cycleId: activeCycle.id }),
        enabled: !!activeCycle.id,
    });

    // 3. Resolve contacts (prepend "you" for split UI)
    const contacts = useMemo(() => {
        const list = settings?.contacts?.map(c => ({ id: c.id, name: c.name })) || [];
        // Ensure "You" is always prepended
        if (list.length > 0 && list[0].id === "you") return list;
        return [{ id: "you", name: "You" }, ...list];
    }, [settings?.contacts]);

    // 4. Resolve payment methods
    const paymentMethods = useMemo(() => {
        return settings?.paymentMethods || [];
    }, [settings?.paymentMethods]);

    // 5. Build custom subcategories map dynamically from D1 settings results
    const customSubs = useMemo(() => {
        const result: Record<Category, string[]> = {
            food: [],
            transport: [],
            groceries: [],
            housing: [],
            utilities: [],
            subs: [],
            personal: [],
            travel: [],
            misc: [],
        };
        if (!settings) return result;

        for (const sc of settings.subCategories) {
            const cat = settings.categories.find((c) => c.id === sc.categoryId);
            if (cat && cat.name in result) {
                const cName = cat.name as Category;
                const defaultList = SUBCATEGORIES[cName] || [];
                if (!defaultList.includes(sc.name)) {
                    result[cName].push(sc.name);
                }
            }
        }
        return result;
    }, [settings]);

    // Mutations
    const addExpenseMutation = useMutation({
        mutationFn: (input: ExpenseInput) => entriesApi.addEntry(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) => entriesApi.updateEntry(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
        },
    });

    const removeExpenseMutation = useMutation({
        mutationFn: (id: string) => entriesApi.deleteEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
        },
    });

    const addCustomSubMutation = useMutation({
        mutationFn: (data: { categoryName: string; name: string }) => entriesApi.addCustomSubCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        },
    });

    const addExpense = (input: ExpenseInput) => {
        addExpenseMutation.mutate(input);
    };

    const updateExpense = (id: string, input: ExpenseInput) => {
        updateExpenseMutation.mutate({ id, input });
    };

    const removeExpense = (id: string) => {
        removeExpenseMutation.mutate(id);
    };

    const addCustomSub = (category: Category, sub: string) => {
        addCustomSubMutation.mutate({ categoryName: category, name: sub });
    };

    const addPaymentMethod = (method: PaymentMethodInput): PaymentMethod => {
        const tempId = `pm-${Date.now()}`;
        const newPm: PaymentMethod = {
            id: tempId,
            ...method,
        };
        settingsApi.addPaymentMethod({
            type: method.type,
            label: method.label,
            hint: method.hint || undefined,
        }).then(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        }).catch(err => {
            console.error("Failed to save payment method in DB:", err);
        });

        return newPm;
    };

    return {
        expenses,
        activeCycle,
        paymentMethods,
        contacts,
        customSubs,
        addExpense,
        updateExpense,
        removeExpense,
        addCustomSub,
        addPaymentMethod,
    };
}