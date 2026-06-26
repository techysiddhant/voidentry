
export type Category = "food" | "transport" | "groceries" | "housing" | "subs" | "misc";

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
    food: { label: "food", color: "bg-pink" },
    transport: { label: "transport", color: "bg-yellow" },
    groceries: { label: "groceries", color: "bg-teal" },
    housing: { label: "housing", color: "bg-ink" },
    subs: { label: "subs", color: "bg-pink" },
    misc: { label: "misc", color: "bg-teal" },
};

export const SUBCATEGORIES: Record<Category, string[]> = {
    food: ["dining out", "coffee", "delivery", "snacks"],
    transport: ["uber/ola", "fuel", "metro", "flight", "parking"],
    groceries: ["supermarket", "vegetables", "kirana"],
    housing: ["rent", "electricity", "water", "internet", "maintenance"],
    subs: ["streaming", "software", "cloud", "gym"],
    misc: ["gift", "health", "other"],
};

const CATEGORY_HINTS: Array<[Category, RegExp]> = [
    ["food", /\b(lunch|dinner|breakfast|coffee|ramen|pizza|burger|cafe|restaurant|food|eat|brunch|snack|chai|thali|dosa|biryani)\b/i],
    ["transport", /\b(uber|ola|auto|taxi|cab|bus|train|metro|gas|fuel|petrol|parking|flight|airfare|tram)\b/i],
    ["groceries", /\b(grocer(y|ies)|big\s*bazaar|dmart|reliance|supermarket|market|kirana|vegetables|sabzi)\b/i],
    ["housing", /\b(rent|mortgage|electric(ity)?|water bill|internet|wifi|utilities|maintenance)\b/i],
    ["subs", /\b(spotify|netflix|icloud|hotstar|prime|disney|subscription|membership|gym)\b/i],
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
export function parseMessage(raw: string): Parsed | null {
    const text = raw.trim();
    if (!text) return null;
    // strip currency markers before matching
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