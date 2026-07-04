import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { expense, expenseSplitParticipant, category, subCategory, paymentMethod, userPreferences } from "@/db/schema";
import { expenseInputSchema } from "@/lib/validations/settings";
import { and, eq, isNull, or, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

export async function GET(request: Request) {
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const cycleId = searchParams.get("cycleId");

        if (!cycleId) {
            return NextResponse.json({ error: "cycleId query parameter is required" }, { status: 400 });
        }

        const db = getDb();

        // 1. Fetch expenses
        const expensesList = await db.query.expense.findMany({
            where: and(
                eq(expense.userId, userId),
                eq(expense.cycleId, cycleId),
                isNull(expense.deletedAt)
            ),
        });

        if (expensesList.length === 0) {
            return NextResponse.json([]);
        }

        const expenseIds = expensesList.map((e) => e.id);

        // 2. Fetch splits
        const splitsList = await db.query.expenseSplitParticipant.findMany({
            where: inArray(expenseSplitParticipant.expenseId, expenseIds),
        });

        // 3. Fetch all categories
        const categoriesList = await db.query.category.findMany({
            where: and(
                or(isNull(category.userId), eq(category.userId, userId)),
                isNull(category.deletedAt)
            ),
        });

        // 4. Fetch all subcategories
        const subCategoriesList = await db.query.subCategory.findMany({
            where: and(
                or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                isNull(subCategory.deletedAt)
            ),
        });

        // 5. In-memory mapping
        const result = expensesList.map((e) => {
            const cat = categoriesList.find((c) => c.id === e.categoryId);
            const sub = e.subCategoryId ? subCategoriesList.find((sc) => sc.id === e.subCategoryId) : undefined;
            const expSplits = splitsList.filter((s) => s.expenseId === e.id);

            let splitObj = undefined;
            if (e.splitMode && expSplits.length > 0) {
                splitObj = {
                    mode: e.splitMode as "equal" | "exact",
                    participants: expSplits.map((sp) => ({
                        contactId: sp.contactId || "you", // Null represents "you"
                        share: sp.share / 100, // Cents to decimal
                    })),
                };
            }

            return {
                id: e.id,
                amount: e.amount / 100, // Cents to decimal
                note: e.note,
                category: cat ? cat.name : "misc",
                subCategory: sub ? sub.name : undefined,
                date: e.date,
                cycleId: e.cycleId,
                payment: {
                    type: e.paymentType,
                    cardName: e.paymentCardName || undefined,
                    methodId: e.paymentMethodId || undefined,
                },
                comment: e.comment || undefined,
                split: splitObj,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching entries:", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const body = await request.json().catch(() => ({}));
        const validated = expenseInputSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
        }

        const input = validated.data;
        const db = getDb();

        // Retrieve the active cycle of preferences
        const prefs = await db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, userId),
        });

        const activeCycleId = prefs?.activeCycleId;
        if (!activeCycleId) {
            return NextResponse.json({ error: "No active cycle configured" }, { status: 400 });
        }

        // 1. Resolve Category ID (matches global or user custom name)
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

        // 2. Resolve Subcategory ID (if subCategory name is specified)
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
                // Create custom subcategory automatically on the fly
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

        // 3. Verify Payment Method (if methodId is specified)
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
                subCategoryId: subCatId,
                date: input.date,
                paymentMethodId: input.payment.methodId || null,
                paymentType: input.payment.type,
                paymentCardName: input.payment.cardName || null,
                comment: input.comment || null,
                splitMode: input.split?.mode || null,
            });

        const batchQueries: any[] = [insertExpenseQuery];

        if (input.split && input.split.participants.length > 0) {
            const insertSplitsQuery = db.insert(expenseSplitParticipant).values(
                input.split.participants.map((p) => ({
                    expenseId,
                    contactId: p.contactId === "you" ? null : p.contactId, // null represents "you"
                    share: Math.round(p.share * 100), // Cents conversion
                }))
            );
            batchQueries.push(insertSplitsQuery);
        }

        // Run atomic D1 batch query
        await db.batch(batchQueries as [any, ...any[]]);

        const createdExpense = {
            id: expenseId,
            amount: input.amount,
            note: input.note,
            category: input.category,
            subCategory: input.subCategory || undefined,
            date: input.date,
            cycleId: activeCycleId,
            payment: input.payment,
            comment: input.comment || undefined,
            split: input.split || undefined,
        };

        return NextResponse.json(createdExpense);
    } catch (error: any) {
        console.error("Error creating entry:", error);
        return NextResponse.json({ error: error.message || "Failed to create entry" }, { status: 500 });
    }
}
