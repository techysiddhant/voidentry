import { CatalogCategory, CatalogSubCategory } from "./catalog";
import { PaymentType } from "./payment";
import { Split } from "./split";

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
export interface ExpenseWithRelations {
    id: string;
    amount: number;
    note: string;
    category: CatalogCategory;
    subCategory?: CatalogSubCategory;
    payment: {
        type: PaymentType;
        cardName?: string;
        methodId?: string;
    };
    date: string;
    cycleId: string;
    comment?: string;
    split?: Split;
}

export interface ExpenseCreateInput extends ExpenseInput {
    _newPaymentMethod?: { type: PaymentType; label: string } | null;
    _newSubCategoryName?: string | null;
}

/** Generic paginated response envelope for cursor-based infinite scroll. */
export interface PaginatedResponse<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}