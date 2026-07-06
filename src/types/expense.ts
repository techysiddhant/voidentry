export type PaymentType = "cash" | "card" | "upi" | "netbanking" | "wallet";

export type Category = string;

import type { CatalogCategory, CatalogSubCategory } from "./catalog";

export interface PaymentMethod {
    id: string;
    type: PaymentType;
    label: string;
    hint?: string;
}

export interface Contact {
    id: string;
    name: string;
}

export interface SplitParticipant {
    contactId: string; // "you" or contact UUID
    share: number;
}

export type SplitMode = "equal" | "exact";

export interface Split {
    mode: SplitMode;
    participants: SplitParticipant[];
}

export interface Expense {
    id: string;
    amount: number;
    note: string;
    category: CatalogCategory;
    subCategory?: CatalogSubCategory;
    date: string;
    cycleId: string;
    payment: {
        type: PaymentType;
        cardName?: string;
        methodId?: string;
    };
    comment?: string;
    split?: Split;
}

export interface ExpenseInput {
    amount: number;
    note: string;
    categoryCode: string;
    subCategoryCode?: string;
    date: string;
    payment: {
        type: PaymentType;
        cardName?: string;
        methodId?: string;
    };
    comment?: string;
    split?: Split;
}

export interface ExpenseCreateInput extends ExpenseInput {
    _newPaymentMethod?: { type: PaymentType; label: string } | null;
    _newSubCategoryName?: string | null;
}

export type PendingDraft = ExpenseCreateInput & {
    _correctedInput?: string | null;
};

export type Msg =
    | { id: string; role: "user"; text: string }
    | { id: string; role: "assistant"; text: string; draft?: PendingDraft; status: "pending" | "confirmed" | "discarded" };
