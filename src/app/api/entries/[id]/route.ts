import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { expense, expenseSplitParticipant } from "@/db/schema";
import { expenseInputSchema } from "@/lib/validations/settings";
import { resolveCategory } from "@/lib/db/helpers/resolve-category";
import { resolveSubCategory } from "@/lib/db/helpers/resolve-sub-category";
import { resolvePaymentMethod } from "@/lib/db/helpers/resolve-payment-method";
import { resolveContacts } from "@/lib/db/helpers/resolve-contacts";
import { apiHandler } from "@/lib/utils/api-handler";
import { ok } from "@/lib/utils/api-response";
import { requireSession } from "@/lib/services/auth/require-session";
import { validateRequest } from "@/lib/utils/validate-request";
import { ApiError } from "@/lib/utils/api-error";

/**
 * @api {PUT} /api/entries/:id Update Entry
 * @apiDescription Updates an existing expense entry. Automatically resolves and inserts custom categories,
 *                subcategories, payment methods, and split participants on-the-fly if new names/values are supplied.
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return apiHandler(async () => {
        const { id } = await params;
        const session = await requireSession();
        const userId = session.user.id;

        const input = await validateRequest(request, expenseInputSchema);
        const db = getDb();

        // 1. Verify existence & ownership using select builder
        const existingList = await db
            .select()
            .from(expense)
            .where(
                and(
                    eq(expense.id, id),
                    eq(expense.userId, userId),
                    isNull(expense.deletedAt)
                )
            )
            .limit(1);

        const existing = existingList[0];
        if (!existing) {
            throw new ApiError(404, "Entry not found");
        }

        // 2. Resolve Category
        const cat = await resolveCategory(db, userId, input.categoryCode);

        // 3. Resolve Subcategory
        const subCat = await resolveSubCategory(
            db,
            userId,
            cat.id,
            input.subCategoryCode,
            input._newSubCategoryName
        );

        // 4. Resolve Payment Method
        const pm = await resolvePaymentMethod(
            db,
            userId,
            input.payment,
            input._newPaymentMethod
        );

        if (!pm) {
            throw new ApiError(500, "Failed to resolve payment method");
        }

        // 5. Resolve Split Contacts
        const resolvedParticipants = input.split?.participants
            ? await resolveContacts(db, userId, input.split.participants)
            : [];

        // 6. Update expense record (normalized: no paymentType or paymentCardName columns)
        const updatedRows = await db
            .update(expense)
            .set({
                amount: Math.round(input.amount * 100),
                note: input.note,
                categoryId: cat.id,
                subCategoryId: subCat?.id || null,
                date: input.date,
                paymentMethodId: pm.id,
                comment: input.comment || null,
                splitMode: input.split?.mode || null,
                updatedAt: new Date(),
            })
            .where(and(eq(expense.id, id), eq(expense.userId, userId), isNull(expense.deletedAt)))
            .returning();

        if (updatedRows.length === 0) {
            throw new ApiError(404, "Entry not found or concurrently updated");
        }

        const batchQueries: any[] = [
            db.delete(expenseSplitParticipant).where(eq(expenseSplitParticipant.expenseId, id))
        ];

        if (input.split && resolvedParticipants.length > 0) {
            const insertNewSplitsQuery = db.insert(expenseSplitParticipant).values(
                resolvedParticipants.map((p) => ({
                    expenseId: id,
                    contactId: p.contactId,
                    share: Math.round(p.share * 100),
                }))
            );
            batchQueries.push(insertNewSplitsQuery);
        }

        // Run D1 atomic batch write
        await db.batch(batchQueries as [any, ...any[]]);

        return ok({
            id,
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
            cycleId: existing.cycleId,
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
        });
    });
}

/**
 * @api {DELETE} /api/entries/:id Delete Entry
 * @apiDescription Soft-deletes an expense entry by setting its deletedAt timestamp.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return apiHandler(async () => {
        const { id } = await params;
        const session = await requireSession();
        const userId = session.user.id;
        const db = getDb();

        // Verify existence & ownership using select builder
        const existingList = await db
            .select()
            .from(expense)
            .where(
                and(
                    eq(expense.id, id),
                    eq(expense.userId, userId),
                    isNull(expense.deletedAt)
                )
            )
            .limit(1);

        if (existingList.length === 0) {
            throw new ApiError(404, "Entry not found");
        }

        // Perform soft delete
        const result = await db
            .update(expense)
            .set({ deletedAt: new Date() })
            .where(
                and(
                    eq(expense.id, id),
                    eq(expense.userId, userId),
                    isNull(expense.deletedAt)
                )
            )
            .returning();

        if (result.length === 0) {
            throw new ApiError(404, "Entry not found or already deleted");
        }

        return ok({ success: true });
    });
}