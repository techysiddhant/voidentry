import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { expense, expenseSplitParticipant, category, subCategory, paymentMethod, userPreferences, contact } from "@/db/schema";
import { expenseInputSchema } from "@/lib/validations/settings";
import { and, eq, isNull, or, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { slugifyCatalogCode } from "@/lib/catalog";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
                category: cat ? {
                    id: cat.id,
                    code: cat.code,
                    name: cat.name,
                    color: cat.color,
                    sortOrder: cat.sortOrder,
                } : {
                    id: "",
                    code: "misc",
                    name: "Misc",
                    color: "bg-teal",
                    sortOrder: 999,
                },
                subCategory: sub ? {
                    id: sub.id,
                    categoryId: sub.categoryId,
                    categoryCode: cat?.code || "",
                    code: sub.code,
                    name: sub.name,
                    sortOrder: sub.sortOrder,
                } : undefined,
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

        // 1. Resolve or Auto-Create Category ID
        let cat = await db.query.category.findFirst({
            where: and(
                eq(category.code, input.categoryCode),
                or(isNull(category.userId), eq(category.userId, userId)),
                isNull(category.deletedAt)
            ),
        });

        if (!cat) {
            return NextResponse.json({ error: `Category '${input.categoryCode}' not found` }, { status: 404 });
        }

        // 2. Resolve or Auto-Create Subcategory ID
        let subCatId: string | null = null;
        let resolvedSubCategory:
            | {
                  id: string;
                  categoryId: string;
                  code: string;
                  name: string;
                  sortOrder: number;
              }
            | undefined;
        if (input.subCategoryCode) {
            const sub = await db.query.subCategory.findFirst({
                where: and(
                    eq(subCategory.categoryId, cat.id),
                    eq(subCategory.code, input.subCategoryCode),
                    or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                    isNull(subCategory.deletedAt)
                ),
            });

            if (!sub) {
                return NextResponse.json({ error: `Subcategory '${input.subCategoryCode}' not found` }, { status: 404 });
            }

            subCatId = sub.id;
            resolvedSubCategory = sub;
        } else if (input._newSubCategoryName) {
            const subCode = slugifyCatalogCode(input._newSubCategoryName);
            let sub = await db.query.subCategory.findFirst({
                where: and(
                    eq(subCategory.categoryId, cat.id),
                    eq(subCategory.code, subCode),
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
                        code: subCode,
                        name: input._newSubCategoryName,
                        sortOrder: 999,
                    })
                    .returning();
                sub = newSub;
            }
            subCatId = sub.id;
            resolvedSubCategory = sub;
        }

        // 3. Resolve or Auto-Create Payment Method ID
        let paymentMethodId = input.payment.methodId || null;
        if (input._newPaymentMethod) {
            let pm = await db.query.paymentMethod.findFirst({
                where: and(
                    eq(paymentMethod.userId, userId),
                    eq(paymentMethod.label, input._newPaymentMethod.label),
                    eq(paymentMethod.typeCode, input._newPaymentMethod.type),
                    isNull(paymentMethod.deletedAt)
                ),
            });

            if (!pm) {
                const [newPm] = await db
                    .insert(paymentMethod)
                    .values({
                        userId,
                        typeCode: input._newPaymentMethod.type,
                        label: input._newPaymentMethod.label,
                    })
                    .returning();
                pm = newPm;
            }
            paymentMethodId = pm.id;
        } else if (paymentMethodId) {
            const pm = await db.query.paymentMethod.findFirst({
                where: and(
                    eq(paymentMethod.id, paymentMethodId),
                    eq(paymentMethod.userId, userId),
                    isNull(paymentMethod.deletedAt)
                ),
            });
            if (!pm) {
                return NextResponse.json({ error: "Payment method not found or ownership check failed" }, { status: 404 });
            }
        }

        // 4. Resolve or Auto-Create Split Contacts
        const resolvedParticipants: { contactId: string | null; share: number; name: string }[] = [];
        if (input.split && input.split.participants.length > 0) {
            for (const p of input.split.participants) {
                let resolvedContactId: string | null = null;
                let participantName = p.name || "";
                const contactIdLooksLikeUuid = typeof p.contactId === "string" && UUID_RE.test(p.contactId);

                if (p.contactId === "you" || p.contactId === null || p.contactId === "") {
                    resolvedContactId = null;
                    participantName = "You";
                } else if (contactIdLooksLikeUuid && p.contactId) {
                    const c = await db.query.contact.findFirst({
                        where: and(
                            eq(contact.id, p.contactId),
                            eq(contact.userId, userId),
                            isNull(contact.deletedAt)
                        ),
                    });
                    if (c) {
                        resolvedContactId = c.id;
                        participantName = c.name;
                    }
                }

                const rawSearchName = p.name || (contactIdLooksLikeUuid ? undefined : p.contactId);
                if (!resolvedContactId && contactIdLooksLikeUuid && !rawSearchName?.trim()) {
                    return NextResponse.json({ error: "Split participant contact not found" }, { status: 400 });
                }

                if (!resolvedContactId && rawSearchName && rawSearchName !== "you") {
                    const searchName = rawSearchName.trim();
                    if (searchName) {
                        let c = await db.query.contact.findFirst({
                            where: and(
                                eq(contact.name, searchName),
                                eq(contact.userId, userId),
                                isNull(contact.deletedAt)
                            ),
                        });

                        if (!c) {
                            const [newC] = await db
                                .insert(contact)
                                .values({
                                    userId,
                                    name: searchName,
                                })
                                .returning();
                            c = newC;
                        }
                        resolvedContactId = c.id;
                        participantName = c.name;
                    }
                }

                resolvedParticipants.push({
                    contactId: resolvedContactId,
                    share: p.share,
                    name: participantName,
                });
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
                paymentMethodId: paymentMethodId,
                paymentType: input.payment.type,
                paymentCardName: input.payment.cardName || null,
                comment: input.comment || null,
                splitMode: input.split?.mode || null,
            });

        const batchQueries: any[] = [insertExpenseQuery];

        if (input.split && input.split.participants.length > 0) {
            const insertSplitsQuery = db.insert(expenseSplitParticipant).values(
                resolvedParticipants.map((p) => ({
                    expenseId,
                    contactId: p.contactId,
                    share: Math.round(p.share * 100),
                }))
            );
            batchQueries.push(insertSplitsQuery);
        }

        await db.batch(batchQueries as [any, ...any[]]);

        const createdExpense = {
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
            subCategory: resolvedSubCategory
                ? {
                      id: resolvedSubCategory.id,
                      categoryId: resolvedSubCategory.categoryId,
                      categoryCode: cat.code,
                      code: resolvedSubCategory.code,
                      name: resolvedSubCategory.name,
                      sortOrder: resolvedSubCategory.sortOrder,
                  }
                : undefined,
            date: input.date,
            cycleId: activeCycleId,
            payment: {
                type: input.payment.type,
                methodId: paymentMethodId || undefined,
                cardName: input.payment.cardName || undefined,
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

        return NextResponse.json(createdExpense);
    } catch (error: any) {
        console.error("Error creating entry:", error);
        return NextResponse.json({ error: error.message || "Failed to create entry" }, { status: 500 });
    }
}
