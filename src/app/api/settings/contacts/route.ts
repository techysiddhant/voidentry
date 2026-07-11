import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { contact } from "@/db/schema";
import { contactSchema } from "@/lib/validations/settings";

/**
 * @api {POST} /api/settings/contacts Create New Contact
 * @apiDescription Registers a new contact for the authenticated user to support split expenses.
 * Includes validations to prevent adding a self duplicate ("You") or existing active contacts.
 * Handles database-level unique constraint violations gracefully to cover race conditions.
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiBody {String} name Name of the contact to add (validated to be non-empty, max 100 chars).
 * 
 * @apiSuccess {String} id UUID of the newly created contact.
 * @apiSuccess {String} name Name of the contact.
 * 
 * @apiError (400) BadRequest Missing name, invalid payload schema, virtual "You" conflict,
 *                         or duplicate contact name already exists (preflight or index violation).
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (500) InternalServerError Fetching existing or inserting new contact failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Object Filtering: Performs preflight duplicate check using Drizzle v1.x's
 *    native object-based filter format to avoid raw SQL query builder compilation warnings.
 * 2. Optimized Preflight: Uses findFirst limit-1 query structure to quickly evaluate duplicate existence
 *    prior to execution.
 * 3. Graceful TOCTOU Handling: Catches DB index violations to handle concurrent inserts atomically.
 */
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

        // Preflight duplicate check using v1.x object filter format
        const existing = await db.query.contact.findFirst({
            where: {
                userId: userId,
                name: name,
                deletedAt: { isNull: true },
            },
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