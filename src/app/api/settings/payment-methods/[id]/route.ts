import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { paymentMethod } from "@/db/schema";
import { paymentMethodSchema } from "@/lib/validations/settings";
import { and, eq } from "drizzle-orm";

/**
 * @api {PUT} /api/settings/payment-methods/:id Update Payment Method
 * @api {DELETE} /api/settings/payment-methods/:id Delete (Soft Delete) Payment Method
 * @apiDescription 
 * - PUT: Updates the details (label, typeCode, hint) of an active payment method belonging to the user.
 *        Validates request parameters, checks existence, and verifies payment method type.
 * - DELETE: Soft-deletes a payment method by setting the `deletedAt` timestamp.
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiParam {String} id UUID of the payment method to update/delete.
 * @apiBody {String} [type] Code representing the updated payment method type.
 * @apiBody {String} [label] Updated label of the payment method (validated non-empty).
 * @apiBody {String} [hint] Optional updated hint/description details.
 * 
 * @apiSuccess (PUT) {String} id UUID of the updated payment method.
 * @apiSuccess (PUT) {String} type Code of the updated payment method type.
 * @apiSuccess (PUT) {String} label Updated label.
 * @apiSuccess (PUT) {String} hint Updated hint.
 * @apiSuccess (DELETE) {Boolean} success True if the deletion succeeded.
 * 
 * @apiError (400) BadRequest Invalid JSON payload, validation errors, or invalid payment type.
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (404) NotFound Payment method ID not found or belongs to another user.
 * @apiError (500) InternalServerError Database read/write operations failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Relational Queries: Uses Drizzle v1.x native object-based filter formats (`{ isNull: true }`)
 *    for all verification and validation lookups, bypassing raw SQL evaluation overhead.
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
        const validated = paymentMethodSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { type, label, hint } = validated.data;
        const db = getDb();

        // Verify existing payment method belongs to user and is active using v1.x object filter format
        const existing = await db.query.paymentMethod.findFirst({
            where: {
                id: id,
                userId: userId,
                deletedAt: { isNull: true },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Payment method not found." },
                { status: 404 }
            );
        }

        // Verify type references a valid method type using v1.x object filter format
        const valid = await db.query.paymentMethodType.findFirst({
            where: {
                code: type,
            },
        });

        if (!valid) {
            return NextResponse.json(
                { error: "Invalid payment method type." },
                { status: 400 }
            );
        }

        // Schema handles updatedAt via $onUpdateFn
        const [updatedMethod] = await db
            .update(paymentMethod)
            .set({
                typeCode: type,
                label,
                hint: hint || null,
            })
            .where(and(eq(paymentMethod.id, id), eq(paymentMethod.userId, userId)))
            .returning();

        return NextResponse.json({
            id: updatedMethod.id,
            type: updatedMethod.typeCode, // Map typeCode to type for client
            label: updatedMethod.label,
            hint: updatedMethod.hint,
        });
    } catch (error) {
        console.error("Error updating payment method:", error);
        return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 });
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

        // Verify existing payment method belongs to user and is not already soft-deleted using v1.x object filter format
        const existing = await db.query.paymentMethod.findFirst({
            where: {
                id: id,
                userId: userId,
                deletedAt: { isNull: true },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Payment method not found." },
                { status: 404 }
            );
        }

        // Schema handles updatedAt via $onUpdateFn; set deletedAt manually
        await db
            .update(paymentMethod)
            .set({ deletedAt: new Date() })
            .where(and(eq(paymentMethod.id, id), eq(paymentMethod.userId, userId)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing payment method:", error);
        return NextResponse.json({ error: "Failed to remove payment method" }, { status: 500 });
    }
}