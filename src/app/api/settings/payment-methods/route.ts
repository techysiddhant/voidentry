import { NextResponse } from "next/server";
import { headers } from "next/headers";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { paymentMethod, paymentMethodType } from "@/db/schema";
import { paymentMethodSchema } from "@/lib/validations/settings";
import { eq } from "drizzle-orm";

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
