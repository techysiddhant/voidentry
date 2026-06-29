// ─── Settings domain types ────────────────────────────────────────────────────
// When the backend is ready, swap these with server-fetched data by passing
// the same shape via props or a server action — the components stay identical.

import type { PaymentMethod, PaymentType } from "@/lib/expense-store";

export type { PaymentMethod, PaymentType };

export interface Contact {
    id: string;
    name: string;
}

export interface SettingsState {
    preferences: {
        currency: string;
        defaultCalendar: boolean;
    };
    contacts: Contact[];
    paymentMethods: PaymentMethod[];
}

// ─── Default local state ──────────────────────────────────────────────────────
// Replace with a useQuery / server action call when the API is ready.

export const DEFAULT_PREFERENCES: SettingsState["preferences"] = {
    currency: "INR",
    defaultCalendar: false,
};

export const DEFAULT_CONTACTS: Contact[] = [
    { id: "you", name: "You" },
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [];
