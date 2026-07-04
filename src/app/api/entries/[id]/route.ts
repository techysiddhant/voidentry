import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { expense, expenseSplitParticipant, category, subCategory, paymentMethod } from "@/db/schema";
import { expenseInputSchema } from "@/lib/validations/settings";
import { and, eq, isNull, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const userId = session.user.id;
        const body = await request.json().catch(() => ({}));
        const validated = expenseInputSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
        }

        const input = validated.data;
        const db = getDb();

        // 1. Verify existence & ownership
        const existing = await db.query.expense.findFirst({
            where: and(
                eq(expense.id, id),
                eq(expense.userId, userId),
                isNull(expense.deletedAt)
            ),
        });

        if (!existing) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        // 2. Resolve Category ID (matches global or user custom name)
        const cat = await db.query.category.findFirst({
            where: and(
                eq(category.name, input.category),
                or(isNull(category.userId), eq(category.userId, userId)),
                isNull(category.deletedAt)
            ),
        });

        if (!cat) {
            return NextResponse.json({ error: `Category '${input.category}' not found` }, { status: 404 });
        }

        // 3. Resolve Subcategory ID (if subCategory name is specified)
        let subCatId: string | null = null;
        if (input.subCategory) {
            const subName = input.subCategory.toLowerCase();
            let sub = await db.query.subCategory.findFirst({
                where: and(
                    eq(subCategory.categoryId, cat.id),
                    eq(subCategory.name, subName),
                    or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                    isNull(subCategory.deletedAt)
                ),
            });

            if (!sub) {
                const [newSub] = await db
                    .insert(subCategory)
                    .values({
                        categoryId: cat.id,
                        userId,
                        name: subName,
                    })
                    .returning();
                sub = newSub;
            }
            subCatId = sub.id;
        }

        // 4. Verify Payment Method (if methodId is specified)
        if (input.payment.methodId) {
            const pm = await db.query.paymentMethod.findFirst({
                where: and(
                    eq(paymentMethod.id, input.payment.methodId),
                    eq(paymentMethod.userId, userId),
                    isNull(paymentMethod.deletedAt)
                ),
            });
            if (!pm) {
                return NextResponse.json({ error: "Payment method not found or ownership check failed" }, { status: 404 });
            }
        }

        const updateExpenseQuery = db
            .update(expense)
            .set({
                amount: Math.round(input.amount * 100),
                note: input.note,
                categoryId: cat.id,
                subCategoryId: subCatId,
                date: input.date,
                paymentMethodId: input.payment.methodId || null,
                paymentType: input.payment.type,
                paymentCardName: input.payment.cardName || null,
                comment: input.comment || null,
                splitMode: input.split?.mode || null,
                updatedAt: new Date(),
            })
            .where(eq(expense.id, id));

        const deleteOldSplitsQuery = db
            .delete(expenseSplitParticipant)
            .where(eq(expenseSplitParticipant.expenseId, id));

        const batchQueries: any[] = [updateExpenseQuery, deleteOldSplitsQuery];

        if (input.split && input.split.participants.length > 0) {
            const insertNewSplitsQuery = db.insert(expenseSplitParticipant).values(
                input.split.participants.map((p) => ({
                    expenseId: id,
                    contactId: p.contactId === "you" ? null : p.contactId, // null represents "you"
                    share: Math.round(p.share * 100), // Cents conversion
                }))
            );
            batchQueries.push(insertNewSplitsQuery);
        }

        // Run D1 atomic batch write
        await db.batch(batchQueries as [any, ...any[]]);

        const updatedExpense = {
            id,
            amount: input.amount,
            note: input.note,
            category: input.category,
            subCategory: input.subCategory || undefined,
            date: input.date,
            cycleId: existing.cycleId,
            payment: input.payment,
            comment: input.comment || undefined,
            split: input.split || undefined,
        };

        return NextResponse.json(updatedExpense);
    } catch (error: any) {
        console.error("Error updating entry:", error);
        return NextResponse.json({ error: error.message || "Failed to update entry" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const userId = session.user.id;
        const db = getDb();

        // 1. Verify existence & ownership
        const existing = await db.query.expense.findFirst({
            where: and(
                eq(expense.id, id),
                eq(expense.userId, userId),
                isNull(expense.deletedAt)
            ),
        });

        if (!existing) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        // 2. Perform soft delete by setting deletedAt
        await db
            .update(expense)
            .set({ deletedAt: new Date() })
            .where(eq(expense.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting entry:", error);
        return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }
}
