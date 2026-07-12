import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { cycle, userPreferences } from "@/db/schema";
import { cycleSchema } from "@/lib/validations/settings";
import { and, eq } from "drizzle-orm";
import { getCalendarMonth } from "@/lib/utils";
import { v7 as uuidv7 } from "uuid";

/**
 * @api {PUT} /api/cycles/:id Update Cycle
 * @api {DELETE} /api/cycles/:id Delete Cycle
 * @apiDescription 
 * - PUT: Updates cycle attributes (label, start, end dates) for a given cycle.
 *        Includes validations to prevent duplicate active cycle labels under the same user.
 * - DELETE: Soft-deletes a cycle and coordinates active cycle re-assignment. If the deleted cycle
 *           is active, it assigns another active cycle, or creates a new calendar cycle dynamically
 *           if no others remain, applying the batch update atomically.
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiParam {String} id UUID of the cycle to update/delete.
 * @apiBody (PUT only) {String} label Updated cycle label.
 * @apiBody (PUT only) {String} start Updated start date (YYYY-MM-DD).
 * @apiBody (PUT only) {String} end Updated end date (YYYY-MM-DD).
 * 
 * @apiSuccess (PUT) {String} id UUID of the updated cycle.
 * @apiSuccess (PUT) {String} label Updated label.
 * @apiSuccess (PUT) {String} start Updated start date.
 * @apiSuccess (PUT) {String} end Updated end date.
 * @apiSuccess (PUT) {Number} total Zero initialized total spend context.
 * @apiSuccess (DELETE) {Boolean} success True if the cycle was successfully deleted and settings updated.
 * 
 * @apiError (400) BadRequest Validation errors or label duplicate conflict.
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (404) NotFound Cycle ID not found or belongs to another user.
 * @apiError (500) InternalServerError Database transaction or query operation failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Relational Queries: Employs Drizzle v1.x native object-based filter formats
 *    (including { isNull: true } and { ne: id }) for verification lookups, bypassing raw SQL evaluation.
 * 2. SQLite Batch Writes: Bundles soft-deletion updates and active cycle fallbacks into a single D1
 *    batch transaction to ensure database integrity and minimize Edge roundtrips.
 */
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
        const validated = cycleSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { label, start, end } = validated.data;
        const db = getDb();

        // Verify the cycle exists and belongs to the user using object filter syntax
        const existing = await db.query.cycle.findFirst({
            where: {
                id: id,
                userId: userId,
                deletedAt: { isNull: true },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Cycle not found." },
                { status: 404 }
            );
        }

        // Friendly early duplicate label check using object filter syntax
        const duplicate = await db.query.cycle.findFirst({
            where: {
                userId: userId,
                label: label,
                deletedAt: { isNull: true },
            },
        });

        if (duplicate && duplicate.id !== id) {
            return NextResponse.json(
                { error: "A cycle with this label already exists." },
                { status: 400 }
            );
        }

        try {
            const [updatedCycle] = await db
                .update(cycle)
                .set({
                    label,
                    start,
                    end,
                })
                .where(and(eq(cycle.id, id), eq(cycle.userId, userId)))
                .returning();

            return NextResponse.json({ ...updatedCycle, total: 0 });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("UNIQUE constraint failed")) {
                return NextResponse.json(
                    { error: "A cycle with this label already exists." },
                    { status: 400 }
                );
            }
            throw err;
        }
    } catch (error) {
        console.error("Error updating cycle:", error);
        return NextResponse.json({ error: "Failed to update cycle" }, { status: 500 });
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

        // Verify cycle exists, belongs to the user, and is not already soft-deleted using object filter syntax
        const existing = await db.query.cycle.findFirst({
            where: {
                id: id,
                userId: userId,
                deletedAt: { isNull: true },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Cycle not found." },
                { status: 404 }
            );
        }

        // Fetch user preferences using object filter syntax
        const prefs = await db.query.userPreferences.findFirst({
            where: {
                userId: userId,
            },
        });

        const isActiveCycle = prefs?.activeCycleId === id;

        const batchQueries: any[] = [
            db.update(cycle)
                .set({ deletedAt: new Date() })
                .where(and(eq(cycle.id, id), eq(cycle.userId, userId)))
        ];

        if (isActiveCycle) {
            // Find another active cycle that is not the one being deleted using object filter syntax with `ne`
            const remaining = await db.query.cycle.findFirst({
                where: {
                    userId: userId,
                    id: { ne: id },
                    deletedAt: { isNull: true },
                },
            });

            let newActiveId = remaining?.id || null;

            if (!newActiveId) {
                const newCycleId = uuidv7();
                const cal = getCalendarMonth();
                batchQueries.push(
                    db.insert(cycle).values({
                        id: newCycleId,
                        userId,
                        label: cal.label,
                        start: cal.start,
                        end: cal.end,
                    })
                );
                newActiveId = newCycleId;
            }

            batchQueries.push(
                db.update(userPreferences)
                    .set({ activeCycleId: newActiveId })
                    .where(eq(userPreferences.userId, userId))
            );
        }

        // Run D1 atomic batch write
        await db.batch(batchQueries as [any, ...any[]]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting cycle:", error);
        return NextResponse.json({ error: "Failed to delete cycle" }, { status: 500 });
    }
}