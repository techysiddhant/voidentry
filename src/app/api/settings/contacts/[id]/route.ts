import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { contact } from "@/db/schema";
import { contactSchema } from "@/lib/validations/settings";
import { and, eq } from "drizzle-orm";

/**
 * @api {PUT} /api/settings/contacts/:id Update Contact
 * @api {DELETE} /api/settings/contacts/:id Delete (Soft Delete) Contact
 * @apiDescription 
 * - PUT: Renames an existing active contact belonging to the authenticated user.
 *        Validates name schema, blocks reserved "You" names, and checks for duplicates.
 * - DELETE: Soft-deletes a contact belonging to the user by setting the `deletedAt` timestamp.
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiParam {String} id UUID of the contact to update/delete.
 * @apiBody {String} [name] New name of the contact (PUT only, validated non-empty).
 * 
 * @apiSuccess (PUT) {String} id UUID of the updated contact.
 * @apiSuccess (PUT) {String} name Updated name of the contact.
 * @apiSuccess (DELETE) {Boolean} success True if the deletion succeeded.
 * 
 * @apiError (400) BadRequest Missing payload, invalid schema, reserved "You" name, or duplicate active name.
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (404) NotFound Contact ID not found or belongs to another user.
 * @apiError (500) InternalServerError Database read/write operations failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Relational Queries: Uses Drizzle v1.x native object-based filter formats (`{ isNull: true }`)
 *    for all verification and duplicate check lookups, bypassing raw SQL evaluation overhead.
 * 2. Preflight Limit-1: Employs findFirst queries for checks, ensuring minimal SQLite search times.
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

        // Verify contact belongs to the user and is active using v1.x object filter format
        const existing = await db.query.contact.findFirst({
            where: {
                id: id,
                userId: userId,
                deletedAt: { isNull: true },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Contact not found." },
                { status: 404 }
            );
        }

        // Check duplicate name under the same user (including soft-deleted ones)
        const duplicate = await db.query.contact.findFirst({
            where: {
                userId: userId,
                name: name,
                deletedAt: { isNull: true },
            },
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

        // Verify contact belongs to the user and is not already soft-deleted using v1.x object filter format
        const existing = await db.query.contact.findFirst({
            where: {
                id: id,
                userId: userId,
                deletedAt: { isNull: true },
            },
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