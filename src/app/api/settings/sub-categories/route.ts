import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { category, subCategory } from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { slugifyCatalogCode } from "@/lib/catalog";

const addSubSchema = z.object({
    categoryCode: z.string().trim().min(1),
    name: z.string().trim().min(1).max(100),
});

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
        const validated = addSubSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: "Invalid custom subcategory input" }, { status: 400 });
        }

        const { categoryCode, name } = validated.data;
        const db = getDb();

        // 1. Look up the matching category (global or user's)
        const parentCategory = await db.query.category.findFirst({
            where: and(
                eq(category.code, categoryCode),
                or(isNull(category.userId), eq(category.userId, userId)),
                isNull(category.deletedAt)
            ),
        });

        if (!parentCategory) {
            return NextResponse.json({ error: `Category '${categoryCode}' not found` }, { status: 404 });
        }

        const code = slugifyCatalogCode(name);

        // 2. Try to insert custom subcategory
        try {
            const [newSub] = await db
                .insert(subCategory)
                .values({
                    categoryId: parentCategory.id,
                    userId,
                    code,
                    name,
                    sortOrder: 999,
                })
                .returning();

            return NextResponse.json({
                id: newSub.id,
                categoryId: newSub.categoryId,
                categoryCode: parentCategory.code,
                code: newSub.code,
                name: newSub.name,
                sortOrder: newSub.sortOrder,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("UNIQUE constraint failed")) {
                // If it already exists, just retrieve the existing one
                const existing = await db.query.subCategory.findFirst({
                    where: and(
                        eq(subCategory.categoryId, parentCategory.id),
                        eq(subCategory.code, code),
                        or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                        isNull(subCategory.deletedAt)
                    ),
                });
                if (existing) {
                    return NextResponse.json({
                        id: existing.id,
                        categoryId: existing.categoryId,
                        categoryCode: parentCategory.code,
                        code: existing.code,
                        name: existing.name,
                        sortOrder: existing.sortOrder,
                    });
                }
            }
            throw err;
        }
    } catch (error) {
        console.error("Error adding subcategory:", error);
        return NextResponse.json({ error: "Failed to add subcategory" }, { status: 500 });
    }
}
