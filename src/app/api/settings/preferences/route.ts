import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { updatePreferencesSchema } from "@/lib/validations/settings";

/**
 * @api {PATCH} /api/settings/preferences Update User Preferences
 * @apiDescription Partially updates the user's settings (currency, calendar default, 
 * or active cycle). If preferences do not exist yet for the user, they are atomically
 * initialized/upserted with default fallback values.
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiBody {Boolean} [defaultCalendar] Toggle to default cycles to the calendar month.
 * @apiBody {String} [currency] Currency code (e.g. "INR").
 * @apiBody {String|null} [activeCycleId] UUID of the active cycle (validated for ownership).
 * 
 * @apiSuccess {Boolean} success True if the update succeeded.
 * 
 * @apiError (400) BadRequest Invalid JSON body, empty payload, schema validation failure,
 *                         or invalid/unauthorized activeCycleId.
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (500) InternalServerError Upsert operation or cycle verification query failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Object Filtering: Performs cycle verification query using Drizzle v1.x's
 *    native object-based filter format to avoid raw SQL generation overhead and compilation errors.
 * 2. Atomic Upsert: Combines preferences initialization and partial updates into a single
 *    SQLite ON CONFLICT DO UPDATE statement to minimize DB roundtrips.
 */
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
                // Verify the activeCycleId belongs to the current user and is active using v1.x object filter format
                const existingCycle = await db.query.cycle.findFirst({
                    where: {
                        id: activeCycleId,
                        userId: userId,
                        deletedAt: { isNull: true },
                    },
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

        // Single atomic upsert (insert default preferences if missing, otherwise partial patch)
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