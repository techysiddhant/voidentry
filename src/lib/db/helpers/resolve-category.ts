import { and, eq, isNull, or } from "drizzle-orm";
import { category } from "@/db/schema";
import { slugify } from "@/lib/utils/slugify";
import { getDb } from "@/db/client";

export async function resolveCategory(
    db: ReturnType<typeof getDb>,
    userId: string,
    categoryCode: string
) {
    const code = slugify(categoryCode);

    // Search global defaults (userId IS NULL) or user's custom active categories
    const existing = await db
        .select()
        .from(category)
        .where(
            and(
                eq(category.code, code),
                isNull(category.deletedAt),
                or(isNull(category.userId), eq(category.userId, userId))
            )
        )
        .limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    try {
        // Auto-create category for this user if it doesn't exist
        const [created] = await db
            .insert(category)
            .values({
                userId,
                code,
                name: categoryCode.trim().replace(/^./, (c) => c.toUpperCase()),
                color: "bg-teal",
                sortOrder: 999,
            })
            .returning();

        return created;
    } catch (e) {
        // Fetch concurrently created category
        const existingAgain = await db
            .select()
            .from(category)
            .where(
                and(
                    eq(category.code, code),
                    eq(category.userId, userId),
                    isNull(category.deletedAt)
                )
            )
            .limit(1);
        if (existingAgain.length > 0) {
            return existingAgain[0];
        }
        throw e;
    }
}
