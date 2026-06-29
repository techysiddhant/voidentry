import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { paymentMethod, paymentMethodType } from "@/db/schema";
import { paymentMethodSchema } from "@/lib/validations/settings";
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
        const validated = paymentMethodSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.issues[0].message },
                { status: 400 }
            );
        }

        const { type, label, hint } = validated.data;
        const db = getDb();

        // Verify existing payment method belongs to user and is active
        const existing = await db.query.paymentMethod.findFirst({
            where: and(eq(paymentMethod.id, id), eq(paymentMethod.userId, userId), isNull(paymentMethod.deletedAt)),
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Payment method not found." },
                { status: 404 }
            );
        }

        // Verify type references a valid method type
        const valid = await db.query.paymentMethodType.findFirst({
            where: eq(paymentMethodType.code, type),
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

        // Verify existing payment method belongs to user and is active
        const existing = await db.query.paymentMethod.findFirst({
            where: and(eq(paymentMethod.id, id), eq(paymentMethod.userId, userId), isNull(paymentMethod.deletedAt)),
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
