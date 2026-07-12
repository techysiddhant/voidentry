import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { cycle, userPreferences } from "@/db/schema";
import { cycleSchema } from "@/lib/validations/settings";
import { getCalendarMonth } from "@/lib/utils";
import { v7 as uuidv7 } from "uuid";

/**
 * @api {GET} /api/cycles Get User Cycles
 * @apiDescription Fetches all active billing/cycle periods created by the user. 
 * If no cycles exist for the user, bootstrap initialization is triggered to atomically
 * create the current calendar month as the first cycle and set it as active.
 * 
 * @api {POST} /api/cycles Create Cycle
 * @apiDescription Creates a new custom cycle period (defined by label, start, and end dates)
 * and atomically updates the user's activeCycleId preference to point to it.
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiBody (POST only) {String} label Label of the cycle (e.g. "November 2026").
 * @apiBody (POST only) {String} start Starting date in YYYY-MM-DD format.
 * @apiBody (POST only) {String} end Ending date in YYYY-MM-DD format.
 * 
 * @apiSuccess (GET) {Object[]} cycles List of user cycles enriched with total spending.
 * @apiSuccess (POST) {String} id UUID of the newly created cycle.
 * @apiSuccess (POST) {String} label Label of the cycle.
 * @apiSuccess (POST) {String} start Start date.
 * @apiSuccess (POST) {String} end End date.
 * @apiSuccess (POST) {Number} total Initialized spending total (0).
 * 
 * @apiError (400) BadRequest Missing parameters, validation failure, or unique label conflict.
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (500) InternalServerError Batch transaction or database operation failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Relational Queries: Employs Drizzle v1.x native object-based filter formats (`{ isNull: true }`)
 *    for selecting user cycles, avoiding raw SQL builder overhead.
 * 2. SQLite Batch Execution: Uses db.batch() to run insert and preference update operations inside a single
 *    SQLite/D1 database transaction to reduce network overhead.
 * 3. Optimized Limit-1 Queries: Uses findFirst queries for post-creation verification checks.
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

        // 1. Get user's active (non-deleted) cycles using object-based filtering
        let userCycles = await db.query.cycle.findMany({
            where: {
                userId,
                deletedAt: { isNull: true },
            },
        });

        // 2. If no cycles exist, bootstrap the current month as the first cycle atomically
        if (userCycles.length === 0) {
            const cycleId = uuidv7();
            const cal = getCalendarMonth();

            await db.batch([
                db.insert(cycle).values({
                    id: cycleId,
                    userId,
                    label: cal.label,
                    start: cal.start,
                    end: cal.end,
                }),
                db.insert(userPreferences)
                    .values({
                        userId,
                        activeCycleId: cycleId,
                    })
                    .onConflictDoUpdate({
                        target: userPreferences.userId,
                        set: { activeCycleId: cycleId, updatedAt: new Date() },
                    })
            ]);

            // Query using type-safe relational findFirst query
            const newCycle = await db.query.cycle.findFirst({
                where: {
                    id: cycleId,
                    userId,
                },
            });

            if (newCycle) {
                userCycles = [newCycle];
            }
        }

        // Enrich cycles with total spend (for now using mock totals for default cycles)
        const enrichedCycles = userCycles.map((c) => {
            let total = 0;
            if (c.id === "active-cycle") total = 35639;
            else if (c.id === "prev-cycle") total = 38420;
            return {
                ...c,
                total,
            };
        });

        return NextResponse.json(enrichedCycles);
    } catch (error) {
        console.error("Error fetching cycles:", error);
        return NextResponse.json({ error: "Failed to fetch cycles" }, { status: 500 });
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
        const validated = cycleSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { label, start, end } = validated.data;
        const db = getDb();

        try {
            const cycleId = uuidv7();

            await db.batch([
                db.insert(cycle).values({
                    id: cycleId,
                    userId,
                    label,
                    start,
                    end,
                }),
                db.insert(userPreferences)
                    .values({
                        userId,
                        activeCycleId: cycleId,
                    })
                    .onConflictDoUpdate({
                        target: userPreferences.userId,
                        set: { activeCycleId: cycleId, updatedAt: new Date() },
                    })
            ]);

            // Query using type-safe relational findFirst query
            const createdCycle = await db.query.cycle.findFirst({
                where: {
                    id: cycleId,
                    userId,
                },
            });

            if (!createdCycle) {
                throw new Error("Failed to create cycle");
            }
            return NextResponse.json({ ...createdCycle, total: 0 });
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
        console.error("Error creating cycle:", error);
        return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 });
    }
}