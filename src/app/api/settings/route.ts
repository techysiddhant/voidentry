import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { userPreferences, paymentMethodType } from "@/db/schema";

/**
 * @api {GET} /api/settings Get User Settings & Catalog Metadata
 * @apiDescription Fetches the user's preferences (upserting default values if not present),
 * along with their contacts, payment methods, categories, and subcategories (including both
 * global defaults and user-specific customizations).
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * 
 * @apiSuccess {Object} preferences User preferences (currency, activeCycleId, etc.).
 * @apiSuccess {Object[]} contacts List of contacts, prepended with a virtual self-contact ("You").
 * @apiSuccess {Object[]} paymentMethods List of active payment methods.
 * @apiSuccess {Object[]} paymentMethodTypes List of available payment method types.
 * @apiSuccess {Object[]} categories Sorted list of transaction categories.
 * @apiSuccess {Object[]} subCategories Sorted list of transaction subcategories.
 * 
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (500) InternalServerError Fetching settings or writing preferences failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Parallel Execution: All database inserts and select queries run concurrently using Promise.all
 *    to minimize total network/database latency overhead to a single roundtrip.
 * 2. O(1) Lookups: Resolving categoryCode for subcategories is optimized by building a Map of 
 *    category codes prior to rendering, replacing O(N*M) scans with O(N+M) complexity.
 * 3. Database-Level Sorting: Offloads sorting of categories and subcategories to the SQLite database
 *    engine (using asc(sortOrder) and asc(name)) instead of executing sort() operations in JavaScript.
 */
export async function GET() {
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const db = getDb();

        // Concurrently run the preferences upsert and all select queries to optimize D1 network roundtrips
        const [
            prefResult,
            contactsList,
            methodsList,
            categoriesList,
            subCategoriesList,
            methodTypesList,
        ] = await Promise.all([
            // 1. Atomically get-or-create user preferences (upsert — schema sets timestamps)
            db
                .insert(userPreferences)
                .values({
                    userId,
                    currency: "INR",
                    defaultCalendar: false,
                })
                .onConflictDoUpdate({
                    target: userPreferences.userId,
                    set: { updatedAt: userPreferences.updatedAt },
                })
                .returning(),

            // 2. Get contacts
            db.query.contact.findMany({
                where: {
                    userId,
                    deletedAt: { isNull: true },
                },
            }),

            // 3. Get payment methods
            db.query.paymentMethod.findMany({
                where: {
                    userId,
                    deletedAt: { isNull: true },
                },
            }),

            // 4. Get categories (global where userId is null + custom where userId matches user)
            db.query.category.findMany({
                where: {
                    deletedAt: { isNull: true },
                    OR: [
                        { userId: { isNull: true } },
                        { userId },
                    ],
                },
                orderBy: {
                    sortOrder: "asc",
                    name: "asc",
                },
            }),

            // 5. Get subcategories (global where userId is null + custom where userId matches user)
            db.query.subCategory.findMany({
                where: {
                    deletedAt: { isNull: true },
                    OR: [
                        { userId: { isNull: true } },
                        { userId },
                    ],
                },
                orderBy: {
                    sortOrder: "asc",
                    name: "asc",
                },
            }),

            // 6. Get payment method types
            db.query.paymentMethodType.findMany({
                orderBy: {
                    name: "asc",
                },
            }),
        ]);

        let methodTypes = methodTypesList;
        if (methodTypes.length === 0) {
            const { seedPaymentMethodTypes } = await import("@/db/seed");
            await seedPaymentMethodTypes(db);
            methodTypes = await db.query.paymentMethodType.findMany({
                orderBy: {
                    name: "asc",
                },
            });
        }

        const prefs = prefResult[0];

        // Optimize subcategory categoryCode lookup to O(1) via Map indexing
        const categoryCodeMap = new Map<string, string>(
            categoriesList.map((c) => [c.id, c.code])
        );

        return NextResponse.json({
            preferences: {
                currency: prefs.currency,
                defaultCalendar: prefs.defaultCalendar,
                activeCycleId: prefs.activeCycleId,
            },
            contacts: [
                { id: "you", name: "You" }, // Always prepend the virtual self-contact
                ...contactsList.map((c) => ({ id: c.id, name: c.name })),
            ],
            paymentMethods: methodsList.map((m) => ({
                id: m.id,
                type: m.typeCode, // Map typeCode to type
                label: m.label,
                hint: m.hint,
            })),
            paymentMethodTypes: methodTypes.map((t) => ({
                code: t.code,
                name: t.name,
            })),
            categories: categoriesList.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                color: c.color,
                sortOrder: c.sortOrder,
            })),
            subCategories: subCategoriesList.map((sc) => ({
                id: sc.id,
                categoryId: sc.categoryId,
                categoryCode: categoryCodeMap.get(sc.categoryId) || "",
                code: sc.code,
                name: sc.name,
                sortOrder: sc.sortOrder,
            })),
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}