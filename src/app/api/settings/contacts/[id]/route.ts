import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { contact } from "@/db/schema";
import { contactSchema } from "@/lib/validations/settings";
import { and, eq, isNull } from "drizzle-orm";

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
        const validated = contactSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { name } = validated.data;
        const db = getDb();

        // Block the reserved self-contact name
        if (name.toLowerCase() === "you") {
            return NextResponse.json(
                { error: "Cannot use 'You' as a contact name." },
                { status: 400 }
            );
        }

        // Verify contact belongs to the user and is active
        const existing = await db.query.contact.findFirst({
            where: and(eq(contact.id, id), eq(contact.userId, userId), isNull(contact.deletedAt)),
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Contact not found." },
                { status: 404 }
            );
        }

        // Check duplicate name under the same user (including soft-deleted ones)
        const duplicate = await db.query.contact.findFirst({
            where: and(eq(contact.userId, userId), eq(contact.name, name)),
        });

        if (duplicate && duplicate.id !== id) {
            return NextResponse.json(
                { error: "Contact name already exists." },
                { status: 400 }
            );
        }

        // Schema handles updatedAt via $onUpdateFn
        const [updatedContact] = await db
            .update(contact)
            .set({ name })
            .where(and(eq(contact.id, id), eq(contact.userId, userId)))
            .returning();

        return NextResponse.json({
            id: updatedContact.id,
            name: updatedContact.name,
        });
    } catch (error) {
        console.error("Error updating contact:", error);
        return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
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

        // Verify contact belongs to the user and is not already soft-deleted
        const existing = await db.query.contact.findFirst({
            where: and(eq(contact.id, id), eq(contact.userId, userId), isNull(contact.deletedAt)),
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Contact not found." },
                { status: 404 }
            );
        }

        // Schema handles updatedAt via $onUpdateFn; set deletedAt manually
        await db
            .update(contact)
            .set({ deletedAt: new Date() })
            .where(and(eq(contact.id, id), eq(contact.userId, userId)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing contact:", error);
        return NextResponse.json({ error: "Failed to remove contact" }, { status: 500 });
    }
}
