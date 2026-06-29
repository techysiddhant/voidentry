import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { updatePreferencesSchema } from "@/lib/validations/settings";

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
        const body = await request.json().catch(() => ({}));
        const validated = updatePreferencesSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { defaultCalendar, currency } = validated.data;
        const db = getDb();
        const now = new Date();

        // Single atomic upsert — no separate read needed
        await db
            .insert(userPreferences)
            .values({
                userId,
                defaultCalendar,
                currency,
            })
            .onConflictDoUpdate({
                target: userPreferences.userId,
                set: {
                    defaultCalendar,
                    currency,
                },
            });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating preferences:", error);
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
