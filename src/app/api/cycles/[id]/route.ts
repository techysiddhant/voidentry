import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { cycle, userPreferences } from "@/db/schema";
import { cycleSchema } from "@/lib/validations/settings";
import { and, eq, isNull } from "drizzle-orm";
import { getCalendarMonth } from "@/lib/utils";

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

        // Verify the cycle exists and belongs to the user
        const existing = await db.query.cycle.findFirst({
            where: and(eq(cycle.id, id), eq(cycle.userId, userId), isNull(cycle.deletedAt)),
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Cycle not found." },
                { status: 404 }
            );
        }

        // Friendly early duplicate label check
        const duplicate = await db.query.cycle.findFirst({
            where: and(
                eq(cycle.userId, userId),
                eq(cycle.label, label),
                isNull(cycle.deletedAt)
            ),
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

        // Verify cycle exists, belongs to the user, and is not already soft-deleted
        const existing = await db.query.cycle.findFirst({
            where: and(eq(cycle.id, id), eq(cycle.userId, userId), isNull(cycle.deletedAt)),
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Cycle not found." },
                { status: 404 }
            );
        }

        // Run full delete-and-reassign logic atomically inside a transaction
        await db.transaction(async (tx) => {
            // Soft delete the cycle
            await tx
                .update(cycle)
                .set({ deletedAt: new Date() })
                .where(and(eq(cycle.id, id), eq(cycle.userId, userId)));

            // Check if this was the active cycle. If so, select another one or bootstrap a new one.
            const prefs = await tx.query.userPreferences.findFirst({
                where: eq(userPreferences.userId, userId),
            });

            if (prefs?.activeCycleId === id) {
                const remaining = await tx.query.cycle.findFirst({
                    where: and(eq(cycle.userId, userId), isNull(cycle.deletedAt)),
                });

                let newActiveId = remaining?.id || null;

                if (!newActiveId) {
                    // If no cycles are left, bootstrap a default calendar month cycle
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
                    newActiveId = newCycle.id;
                }

                await tx
                    .update(userPreferences)
                    .set({ activeCycleId: newActiveId })
                    .where(eq(userPreferences.userId, userId));
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting cycle:", error);
        return NextResponse.json({ error: "Failed to delete cycle" }, { status: 500 });
    }
}
