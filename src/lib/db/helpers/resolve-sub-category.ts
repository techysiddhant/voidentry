import { and, eq, isNull, or, sql } from "drizzle-orm";
import { subCategory } from "@/db/schema";
import { slugify } from "@/lib/utils/slugify";
import { getDb } from "@/db/client";

export async function resolveSubCategory(
    db: ReturnType<typeof getDb>,
    userId: string,
    categoryId: string,
    subCategoryCode?: string | null,
    newSubCategoryName?: string | null
) {
    const value = subCategoryCode ?? newSubCategoryName;
    if (!value) {
        return null;
    }

    const slug = slugify(value);
    const codeHyphen = slug.replace(/_/g, "-");
    const codeUnderscore = slug.replace(/-/g, "_");

    // Search by category, not deleted, and either global or owned by this user
    // Matches both code variations (hyphenated and underscore) and case-insensitive/exact name
    const existing = await db
        .select()
        .from(subCategory)
        .where(
            and(
                eq(subCategory.categoryId, categoryId),
                isNull(subCategory.deletedAt),
                or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                or(
                    eq(subCategory.code, codeHyphen),
                    eq(subCategory.code, codeUnderscore),
                    sql`lower(${subCategory.name}) = lower(${value})`
                )
            )
        )
        .limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    // Format clean display name: e.g. "coffee_tea" -> "Coffee Tea"
    const displayName = value
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    try {
        // Auto-create subcategory for this user
        const [created] = await db
            .insert(subCategory)
            .values({
                categoryId,
                userId,
                code: codeUnderscore, // use underscore as standard for catalog codes
                name: displayName,
                sortOrder: 999,
            })
            .returning();

        return created;
    } catch (e) {
        // Fetch concurrently created subcategory
        const existingAgain = await db
            .select()
            .from(subCategory)
            .where(
                and(
                    eq(subCategory.categoryId, categoryId),
                    isNull(subCategory.deletedAt),
                    or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
                    or(
                        eq(subCategory.code, codeHyphen),
                        eq(subCategory.code, codeUnderscore),
                        sql`lower(${subCategory.name}) = lower(${value})`
                    )
                )
            )
            .limit(1);
        if (existingAgain.length > 0) {
            return existingAgain[0];
        }
        throw e;
    }
}
