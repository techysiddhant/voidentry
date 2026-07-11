import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { paymentMethod } from "@/db/schema";
import { paymentMethodSchema } from "@/lib/validations/settings";

/**
 * @api {POST} /api/settings/payment-methods Create Payment Method
 * @apiDescription Registers a new user-defined payment method (like a credit card or cash wallet)
 * associated with a valid global payment method type (e.g. "card", "cash", "upi").
 * 
 * @apiHeader {String} Cookie Session cookies required for Better Auth.
 * @apiBody {String} type Code representing the payment method type (validated against database).
 * @apiBody {String} label Label of the payment method (validated non-empty).
 * @apiBody {String} [hint] Optional description or card ending numbers (validated max 100 chars).
 * 
 * @apiSuccess {String} id UUID of the newly registered payment method.
 * @apiSuccess {String} type Code of the payment method type.
 * @apiSuccess {String} label Label of the payment method.
 * @apiSuccess {String} hint Hint detail of the payment method.
 * 
 * @apiError (400) BadRequest Invalid JSON payload, schema validation failure, or invalid type code.
 * @apiError (401) Unauthorized Session is invalid or missing.
 * @apiError (500) InternalServerError Fetching type reference or inserting payment method failed.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Type-Safe Object Filtering: Performs type validation check using Drizzle v1.x's
 *    native object-based filter format to avoid raw SQL query compilation overhead.
 * 2. Preflight Limit-1: Employs findFirst queries for preflight validations, ensuring minimal SQLite lookup time.
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
        const validated = paymentMethodSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { type, label, hint } = validated.data;
        const db = getDb();

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

        // Schema handles createdAt/updatedAt via $defaultFn/$onUpdateFn
        const [newMethod] = await db
            .insert(paymentMethod)
            .values({
                userId,
                typeCode: type,
                label,
                hint: hint || null,
            })
            .returning();

        return NextResponse.json({
            id: newMethod.id,
            type: newMethod.typeCode, // Map back to 'type' for the frontend
            label: newMethod.label,
            hint: newMethod.hint,
        });
    } catch (error) {
        console.error("Error adding payment method:", error);
        return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 });
    }
}