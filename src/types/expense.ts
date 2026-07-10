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