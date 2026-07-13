import type { CatalogCategory, CatalogSubCategory } from "@/types/catalog";
import type { SplitParticipant } from "@/types/split";
import type { ExpenseWithRelations } from "@/types/expense";

/** Fallback category when an expense references a deleted/missing category. */
const FALLBACK_CATEGORY: CatalogCategory = {
    id: "",
    code: "misc",
    name: "Misc",
    color: "bg-teal",
    sortOrder: 999,
};

/**
 * Transforms a raw expense row (joined with payment method details)
 * into a client-ready `ExpenseWithRelations` object.
 *
 * @param row         - Row with select properties including joined paymentType/Label
 * @param categoryMap - Map<categoryId, CatalogCategory>
 * @param subCatMap   - Map<subCategoryId, CatalogSubCategory>
 * @param splitsMap   - Map<expenseId, SplitParticipant[]>
 */
export function formatExpenseRow(
    row: {
        id: string;
        amount: number;
        note: string;
        categoryId: string;
        subCategoryId: string | null;
        date: string;
        cycleId: string;
        comment: string | null;
        splitMode: string | null;
        paymentMethodId: string;
        paymentType: string;
        paymentMethodLabel: string;
    },
    categoryMap: Map<string, CatalogCategory>,
    subCatMap: Map<string, CatalogSubCategory>,
    splitsMap: Map<string, SplitParticipant[]>,
): ExpenseWithRelations {
    const cat = categoryMap.get(row.categoryId) ?? FALLBACK_CATEGORY;

    const sub = row.subCategoryId
        ? subCatMap.get(row.subCategoryId)
        : undefined;

    const participants = splitsMap.get(row.id);
    const split =
        row.splitMode && participants && participants.length > 0
            ? {
                  mode: row.splitMode as "equal" | "exact",
                  participants,
              }
            : undefined;

    return {
        id: row.id,
        amount: row.amount / 100,
        note: row.note,
        category: cat,
        subCategory: sub,
        date: row.date,
        cycleId: row.cycleId,
        payment: {
            type: row.paymentType as any,
            methodId: row.paymentMethodId,
            cardName: row.paymentType === "card" ? row.paymentMethodLabel : undefined,
        },
        comment: row.comment || undefined,
        split,
    };
}