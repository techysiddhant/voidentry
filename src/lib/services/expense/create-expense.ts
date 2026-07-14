import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db/client";
import { expense, expenseSplitParticipant, userPreferences } from "@/db/schema";
import { resolveCategory } from "@/lib/db/helpers/resolve-category";
import { resolveSubCategory } from "@/lib/db/helpers/resolve-sub-category";
import { resolvePaymentMethod } from "@/lib/db/helpers/resolve-payment-method";
import { resolveContacts } from "@/lib/db/helpers/resolve-contacts";
import { ApiError } from "@/lib/utils/api-error";
import type { ExpenseCreateInput, ExpenseWithRelations } from "@/types/expense";

type DbType = ReturnType<typeof getDb>;

export async function createExpense(opts: {
    db: DbType;
    userId: string;
    input: ExpenseCreateInput;
}): Promise<ExpenseWithRelations> {
    const { db, userId, input } = opts;

    // 1. Retrieve the active cycle of preferences
    const prefs = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

    const activeCycleId = prefs[0]?.activeCycleId;
    if (!activeCycleId) {
        throw new ApiError(400, "No active cycle configured");
    }

    // 2. Resolve or Auto-Create Category
    const cat = await resolveCategory(db, userId, input.categoryCode);

    // 3. Resolve or Auto-Create Subcategory
    const subCat = await resolveSubCategory(
        db,
        userId,
        cat.id,
        input.subCategoryCode,
        input._newSubCategoryName
    );

    // 4. Resolve or Auto-Create Payment Method
    const pm = await resolvePaymentMethod(
        db,
        userId,
        input.payment,
        input._newPaymentMethod
    );

    if (!pm) {
        throw new ApiError(500, "Failed to resolve payment method");
    }

    // 5. Resolve or Auto-Create Split Contacts
    const resolvedParticipants = input.split?.participants
        ? await resolveContacts(db, userId, input.split.participants)
        : [];

    // 6. Generate UUID for the new expense
    const expenseId = uuidv7();

    const insertExpenseQuery = db
        .insert(expense)
        .values({
            id: expenseId,
            userId,
            cycleId: activeCycleId,
            amount: Math.round(input.amount * 100),
            note: input.note,
            categoryId: cat.id,
            subCategoryId: subCat?.id || null,
            date: input.date,
            paymentMethodId: pm.id,
            comment: input.comment || null,
            splitMode: input.split?.mode || null,
        });

    const batchQueries: any[] = [insertExpenseQuery];

    if (input.split && resolvedParticipants.length > 0) {
        const insertSplitsQuery = db.insert(expenseSplitParticipant).values(
            resolvedParticipants.map((p) => ({
                expenseId,
                contactId: p.contactId,
                share: Math.round(p.share * 100),
            }))
        );
        batchQueries.push(insertSplitsQuery);
    }

    // Run atomic batch query
    await db.batch(batchQueries as [any, ...any[]]);

    // 7. Return the formatted created expense object matching ExpenseWithRelations
    return {
        id: expenseId,
        amount: input.amount,
        note: input.note,
        category: {
            id: cat.id,
            code: cat.code,
            name: cat.name,
            color: cat.color,
            sortOrder: cat.sortOrder,
        },
        subCategory: subCat
            ? {
                  id: subCat.id,
                  categoryId: subCat.categoryId,
                  categoryCode: cat.code,
                  code: subCat.code,
                  name: subCat.name,
                  sortOrder: subCat.sortOrder,
              }
            : undefined,
        date: input.date,
        cycleId: activeCycleId,
        payment: {
            type: pm.typeCode as any,
            methodId: pm.id,
            cardName: pm.typeCode === "card" ? pm.label : undefined,
        },
        comment: input.comment || undefined,
        split: input.split
            ? {
                  mode: input.split.mode,
                  participants: resolvedParticipants.map((p) => ({
                      contactId: p.contactId || "you",
                      share: p.share,
                  })),
              }
            : undefined,
    };
}
