export interface ChatParseResult {
    amount?: number;
    note?: string;
    categoryCode?: string;
    subCategoryCode?: string | null;
    date?: string;
    payment?: {
        type: string;
        methodId?: string | null;
    };
    newPaymentMethod?: { type: string; label: string } | null;
    newSubCategoryName?: string | null;
    comment?: string | null;
    split?: {
        mode: "equal" | "exact";
        participants: Array<{
            contactId?: string | null;
            name?: string | null;
            share: number;
        }>;
    } | null;
    correctedInput?: string | null;
    clarification?: string | null;
}

export interface ChatResponse {
    result: ChatParseResult;
    provider: "gateway" | "gemini" | "unavailable";
}

import { Split } from "./split";

/** A draft expense parsed by the AI, pending user confirmation. */
export interface PendingDraft {
    amount: number;
    note: string;
    categoryCode: string;
    subCategoryCode?: string;
    date: string;
    payment: {
        type: string;
        methodId?: string;
        cardName?: string;
    };
    comment?: string;
    split?: Split;

    /** UI-only: new payment method detected by AI */
    _newPaymentMethod?: { type: string; label: string } | null;
    /** UI-only: new subcategory name suggested by AI */
    _newSubCategoryName?: string | null;
    /** UI-only: typo-corrected input from AI */
    _correctedInput?: string | null;
}

/** Chat message union — either a user message or an assistant message with optional draft. */
export type Msg =
    | { id: string; role: "user"; text: string }
    | {
          id: string;
          role: "assistant";
          status: "pending" | "confirmed" | "discarded";
          text: string;
          draft?: PendingDraft;
      };
