import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { contact } from "@/db/schema";
import { contactSchema } from "@/lib/validations/settings";
import { and, eq, isNull } from "drizzle-orm";

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
        const validated = contactSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { name } = validated.data;
        const db = getDb();

        // Prevent adding self duplicate or duplicate contacts
        if (name.toLowerCase() === "you") {
            return NextResponse.json(
                { error: "Cannot add 'You' as a contact." },
                { status: 400 }
            );
        }

        const existing = await db.query.contact.findFirst({
            where: and(eq(contact.userId, userId), eq(contact.name, name), isNull(contact.deletedAt)),
        });

        if (existing) {
            return NextResponse.json(
                { error: "Contact name already exists." },
                { status: 400 }
            );
        }

        // Insert new contact — schema handles createdAt/updatedAt
        const [newContact] = await db
            .insert(contact)
            .values({ userId, name })
            .returning();

        return NextResponse.json({
            id: newContact.id,
            name: newContact.name,
        });
    } catch (err: unknown) {
        // SQLite UNIQUE constraint violation (race between preflight and insert)
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("UNIQUE constraint failed")) {
            return NextResponse.json(
                { error: "Contact name already exists." },
                { status: 400 }
            );
        }
        console.error("Error adding contact:", err);
        return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
    }
}
