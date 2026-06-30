import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { cycle, userPreferences } from "@/db/schema";
import { cycleSchema } from "@/lib/validations/settings";
import { and, eq, isNull } from "drizzle-orm";
import { getCalendarMonth } from "@/lib/utils";

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

        // 1. Get user's active (non-deleted) cycles
        let userCycles = await db.query.cycle.findMany({
            where: and(eq(cycle.userId, userId), isNull(cycle.deletedAt)),
        });

        // 2. If no cycles exist, bootstrap the current month as the first cycle atomically
        if (userCycles.length === 0) {
            let createdCycle: typeof cycle.$inferSelect | undefined = undefined;
            await db.transaction(async (tx) => {
                const cal = getCalendarMonth();
                const [newCycle] = await tx
                    .insert(cycle)
                    .values({
                        userId,
                        label: cal.label,
                        start: cal.start,
                        end: cal.end,
                    })
                    .returning();

                // Set this newly created cycle as active in user preferences
                await tx
                    .insert(userPreferences)
                    .values({
                        userId,
                        activeCycleId: newCycle.id,
                    })
                    .onConflictDoUpdate({
                        target: userPreferences.userId,
                        set: { activeCycleId: newCycle.id },
                    });

                createdCycle = newCycle;
            });

            if (createdCycle) {
                userCycles = [createdCycle];
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
            let createdCycle: typeof cycle.$inferSelect | undefined = undefined;
            // Run creation and activeCycleId assignment atomically in a transaction
            await db.transaction(async (tx) => {
                // Insert new cycle — database handles unique constraints on active cycles
                const [newCycle] = await tx
                    .insert(cycle)
                    .values({
                        userId,
                        label,
                        start,
                        end,
                    })
                    .returning();

                // Automatically set as active cycle
                await tx
                    .insert(userPreferences)
                    .values({
                        userId,
                        activeCycleId: newCycle.id,
                    })
                    .onConflictDoUpdate({
                        target: userPreferences.userId,
                        set: { activeCycleId: newCycle.id },
                    });

                createdCycle = newCycle;
            });

            if (!createdCycle) {
                throw new Error("Failed to create cycle");
            }
            return NextResponse.json({ ...(createdCycle as typeof cycle.$inferSelect), total: 0 });
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
