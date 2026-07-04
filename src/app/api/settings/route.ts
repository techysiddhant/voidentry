import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { userPreferences, contact, paymentMethod, category, subCategory } from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";

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

        // 1. Atomically get-or-create user preferences (upsert — schema sets timestamps)
        const [prefs] = await db
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
            .returning();

        // 2. Get contacts
        const contactsList = await db.query.contact.findMany({
            where: and(eq(contact.userId, userId), isNull(contact.deletedAt)),
        });

        // 3. Get payment methods
        const methodsList = await db.query.paymentMethod.findMany({
            where: and(eq(paymentMethod.userId, userId), isNull(paymentMethod.deletedAt)),
        });

        // 4. Get categories (global where userId is null + custom where userId matches user)
        const categoriesList = await db.query.category.findMany({
            where: and(
                or(isNull(category.userId), eq(category.userId, userId)),
                isNull(category.deletedAt)
            ),
        });

        // 5. Get subcategories (global where userId is null + custom where userId matches user)
        const subCategoriesList = await db.query.subCategory.findMany({
            where: and(
                or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                isNull(subCategory.deletedAt)
            ),
        });

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
            categories: categoriesList.map((c) => ({
                id: c.id,
                name: c.name,
                color: c.color,
            })),
            subCategories: subCategoriesList.map((sc) => ({
                id: sc.id,
                categoryId: sc.categoryId,
                name: sc.name,
            })),
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}
