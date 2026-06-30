import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { userPreferences, cycle } from "@/db/schema";
import { updatePreferencesSchema } from "@/lib/validations/settings";
import { and, eq, isNull } from "drizzle-orm";

export async function PATCH(request: Request) {
    const auth = getAuth();
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        
        // 1. Distinguish invalid/malformed JSON
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
        }

        // 2. Reject empty patch payloads
        if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
            return NextResponse.json({ error: "Empty preferences update is not allowed" }, { status: 400 });
        }

        const validated = updatePreferencesSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { defaultCalendar, currency, activeCycleId } = validated.data;
        const db = getDb();

        const updateSet: Record<string, any> = {};
        if (defaultCalendar !== undefined) updateSet.defaultCalendar = defaultCalendar;
        if (currency !== undefined) updateSet.currency = currency;

        if (activeCycleId !== undefined) {
            if (activeCycleId !== null) {
                // Verify the activeCycleId belongs to the current user and is active
                const existingCycle = await db.query.cycle.findFirst({
                    where: and(
                        eq(cycle.id, activeCycleId),
                        eq(cycle.userId, userId),
                        isNull(cycle.deletedAt)
                    ),
                });
                if (!existingCycle) {
                    return NextResponse.json(
                        { error: "Invalid active cycle ID or ownership check failed." },
                        { status: 400 }
                    );
                }
            }
            updateSet.activeCycleId = activeCycleId;
        }

        // Single atomic upsert
        await db
            .insert(userPreferences)
            .values({
                userId,
                defaultCalendar: defaultCalendar ?? false,
                currency: currency ?? "INR",
                activeCycleId: activeCycleId ?? null,
            })
            .onConflictDoUpdate({
                target: userPreferences.userId,
                set: updateSet,
            });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating preferences:", error);
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
