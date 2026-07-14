import { and, eq, isNull, or, lt, desc, inArray, like, gte, lte, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { expense, expenseSplitParticipant, category, subCategory, paymentMethod } from "@/db/schema";
import { formatExpenseRow } from "@/lib/db/formatters/expense";
import { ApiError } from "@/lib/utils/api-error";
import type { CatalogCategory, CatalogSubCategory } from "@/types/catalog";
import type { SplitParticipant } from "@/types/split";
import type { PaginatedResponse, ExpenseWithRelations } from "@/types/expense";

// ─── Cursor Helpers ──────────────────────────────────────────────────────────

/**
 * Decodes a plain "date|id" cursor string into its constituent parts.
 * Returns null if the cursor is missing or malformed.
 */
function decodeCursor(cursor?: string | null): { date: string; id: string } | null {
    if (!cursor) return null;
    const parts = cursor.split("|");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { date: parts[0], id: parts[1] };
}

/**
 * Encodes a date + id pair into a cursor string.
 */
function encodeCursor(date: string, id: string): string {
    return `${date}|${id}`;
}

// ─── Lookup Builders ─────────────────────────────────────────────────────────

/**
 * Loads all active categories (global + user-specific) into a Map
 * keyed by category ID for O(1) lookups during row formatting.
 *
 * Uses select().from() builder since Drizzle v1.x relational queries
 * don't accept raw SQL expressions in the `where` filter.
 */
async function buildCategoryMap(
    db: ReturnType<typeof getDb>,
    userId: string,
): Promise<Map<string, CatalogCategory>> {
    const rows = await db
        .select()
        .from(category)
        .where(
            and(
                isNull(category.deletedAt),
                or(isNull(category.userId), eq(category.userId, userId)),
            ),
        );

    const map = new Map<string, CatalogCategory>();
    for (const row of rows) {
        map.set(row.id, {
            id: row.id,
            code: row.code,
            name: row.name,
            color: row.color,
            sortOrder: row.sortOrder,
        });
    }
    return map;
}

/**
 * Loads all active subcategories (global + user-specific) into a Map
 * keyed by subcategory ID for O(1) lookups during row formatting.
 *
 * Uses select().from() builder for same reason as buildCategoryMap.
 */
async function buildSubCategoryMap(
    db: ReturnType<typeof getDb>,
    userId: string,
    categoryMap: Map<string, CatalogCategory>,
): Promise<Map<string, CatalogSubCategory>> {
    const rows = await db
        .select()
        .from(subCategory)
        .where(
            and(
                isNull(subCategory.deletedAt),
                or(isNull(subCategory.userId), eq(subCategory.userId, userId)),
            ),
        );

    const map = new Map<string, CatalogSubCategory>();
    for (const row of rows) {
        const parentCat = categoryMap.get(row.categoryId);
        map.set(row.id, {
            id: row.id,
            categoryId: row.categoryId,
            categoryCode: parentCat?.code ?? "",
            code: row.code,
            name: row.name,
            sortOrder: row.sortOrder,
        });
    }
    return map;
}

/**
 * Fetches split participants for a batch of expense IDs and returns
 * a Map<expenseId, SplitParticipant[]> for O(1) lookups.
 *
 * Uses select().from() builder with inArray for type safety.
 */
async function buildSplitsMap(
    db: ReturnType<typeof getDb>,
    expenseIds: string[],
): Promise<Map<string, SplitParticipant[]>> {
    const map = new Map<string, SplitParticipant[]>();
    if (expenseIds.length === 0) return map;

    const rows = await db
        .select()
        .from(expenseSplitParticipant)
        .where(inArray(expenseSplitParticipant.expenseId, expenseIds));

    for (const row of rows) {
        const list = map.get(row.expenseId) ?? [];
        list.push({
            contactId: row.contactId || "you",
            share: row.share / 100,
        });
        map.set(row.expenseId, list);
    }
    return map;
}

// ─── Main Service ────────────────────────────────────────────────────────────

/**
 * Fetches a paginated page of expenses for a given cycle/filters using
 * cursor-based pagination on (date DESC, id DESC).
 *
 * @param opts.db      - Drizzle D1 database instance
 * @param opts.userId  - Authenticated user ID
 * @param opts.cycleId - The cycle to fetch entries for (optional if scope=all)
 * @param opts.cursor  - Optional "date|id" cursor from a previous page
 * @param opts.limit   - Number of items per page (default 20, max 50)
 *
 * @throws ApiError(400) if the cursor format is invalid
 */
export async function getEntries(opts: {
    db: ReturnType<typeof getDb>;
    userId: string;
    cycleId?: string | null;
    cursor?: string | null;
    limit: number;
    scope?: "cycle" | "all";
    q?: string;
    cats?: string[];
    subs?: string[];
    pms?: string[];
    pts?: string[];
    min?: number;
    max?: number;
    from?: string;
    to?: string;
    date?: string;
    splitOnly?: boolean;
}): Promise<PaginatedResponse<ExpenseWithRelations>> {
    const { db, userId, cycleId, limit } = opts;

    // ── Parse cursor ────────────────────────────────────────────────────────
    const parsed = decodeCursor(opts.cursor);
    if (opts.cursor && !parsed) {
        throw new ApiError(400, "Invalid cursor format");
    }

    // ── Query 1: Fetch one page of expenses ─────────────────────────────────
    // We fetch limit + 1 rows to cheaply determine if there's a next page.
    // Cursor condition: (date < cursorDate) OR (date = cursorDate AND id < cursorId)
    // This implements keyset/seek pagination on the composite (date DESC, id DESC) order.
    const conditions = [
        eq(expense.userId, userId),
        isNull(expense.deletedAt),
    ];

    if (opts.scope !== "all") {
        if (!cycleId) {
            throw new ApiError(400, "Cycle ID is required for cycle scope");
        }
        conditions.push(eq(expense.cycleId, cycleId));
    }

    if (opts.q) {
        const queryPattern = `%${opts.q.toLowerCase().trim()}%`;
        conditions.push(
            or(
                like(expense.note, queryPattern),
                like(expense.comment, queryPattern),
                like(category.name, queryPattern),
                like(subCategory.name, queryPattern),
            )!
        );
    }

    if (opts.cats && opts.cats.length > 0) {
        conditions.push(inArray(category.code, opts.cats));
    }

    if (opts.subs && opts.subs.length > 0) {
        const subConditions = opts.subs.map((s) => {
            const parts = s.split(":");
            if (parts.length === 2) {
                return and(eq(category.code, parts[0]), eq(subCategory.code, parts[1]));
            }
            return eq(subCategory.code, s);
        }).filter(Boolean);

        if (subConditions.length > 0) {
            conditions.push(or(...subConditions)!);
        }
    }

    if (opts.pms && opts.pms.length > 0) {
        conditions.push(inArray(expense.paymentMethodId, opts.pms));
    }

    if (opts.pts && opts.pts.length > 0) {
        conditions.push(inArray(paymentMethod.typeCode, opts.pts));
    }

    if (opts.min != null) {
        conditions.push(gte(expense.amount, opts.min));
    }

    if (opts.max != null) {
        conditions.push(lte(expense.amount, opts.max));
    }

    if (opts.from) {
        conditions.push(gte(expense.date, opts.from));
    }

    if (opts.to) {
        conditions.push(lte(expense.date, opts.to));
    }

    if (opts.date) {
        conditions.push(eq(expense.date, opts.date));
    }

    if (opts.splitOnly) {
        conditions.push(isNotNull(expense.splitMode));
    }

    if (parsed) {
        conditions.push(
            or(
                lt(expense.date, parsed.date),
                and(
                    eq(expense.date, parsed.date),
                    lt(expense.id, parsed.id),
                ),
            )!,
        );
    }

    const rows = await db
        .select({
            id: expense.id,
            amount: expense.amount,
            note: expense.note,
            categoryId: expense.categoryId,
            subCategoryId: expense.subCategoryId,
            date: expense.date,
            cycleId: expense.cycleId,
            comment: expense.comment,
            splitMode: expense.splitMode,
            paymentMethodId: expense.paymentMethodId,
            paymentType: paymentMethod.typeCode,
            paymentMethodLabel: paymentMethod.label,
        })
        .from(expense)
        .innerJoin(paymentMethod, eq(expense.paymentMethodId, paymentMethod.id))
        .leftJoin(category, eq(expense.categoryId, category.id))
        .leftJoin(subCategory, eq(expense.subCategoryId, subCategory.id))
        .where(and(...conditions))
        .orderBy(desc(expense.date), desc(expense.id))
        .limit(limit + 1);

    // ── Determine pagination ────────────────────────────────────────────────
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    if (pageRows.length === 0) {
        return { items: [], nextCursor: null, hasMore: false };
    }

    // ── Build lookup maps (parallel) ────────────────────────────────────────
    const expenseIds = pageRows.map((r) => r.id);
    const [categoryMap, splitsMap] = await Promise.all([
        buildCategoryMap(db, userId),
        buildSplitsMap(db, expenseIds),
    ]);
    const subCatMap = await buildSubCategoryMap(db, userId, categoryMap);

    // ── Format rows ─────────────────────────────────────────────────────────
    const items = pageRows.map((row) =>
        formatExpenseRow(row, categoryMap, subCatMap, splitsMap),
    );

    // ── Encode next cursor from the last item on this page ──────────────────
    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor = hasMore
        ? encodeCursor(lastRow.date, lastRow.id)
        : null;

    return { items, nextCursor, hasMore };
}
