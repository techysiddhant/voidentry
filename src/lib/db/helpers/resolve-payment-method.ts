import { and, eq, isNull } from "drizzle-orm";
import { paymentMethod } from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { getDb } from "@/db/client";

const DEFAULT_LABELS: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    upi: "UPI",
    netbanking: "Net Banking",
    wallet: "Wallet",
    paylater: "Pay Later",
};

export async function resolvePaymentMethod(
    db: ReturnType<typeof getDb>,
    userId: string,
    payment?: {
        type?: string | null;
        methodId?: string | null;
    } | null,
    newPaymentMethod?: {
        type: string;
        label: string;
    } | null
) {
    // 1. If methodId is a valid UUID, find it
    if (payment?.methodId && isUuid(payment.methodId)) {
        const existing = await db
            .select()
            .from(paymentMethod)
            .where(
                and(
                    eq(paymentMethod.id, payment.methodId),
                    eq(paymentMethod.userId, userId),
                    isNull(paymentMethod.deletedAt)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return existing[0];
        }
    }

    // 2. Determine payment type (fallback to cash)
    const targetType = newPaymentMethod?.type ?? payment?.type ?? "cash";

    // 3. Determine payment label
    // If payment.methodId is not a UUID, treat it as the label. Otherwise, fallback to the type's default label.
    let targetLabel = newPaymentMethod?.label;
    if (!targetLabel && payment?.methodId && !isUuid(payment.methodId)) {
        targetLabel = payment.methodId;
    }
    if (!targetLabel) {
        targetLabel = DEFAULT_LABELS[targetType] ?? "Cash";
    }
    targetLabel = targetLabel.trim();

    // 4. Lookup existing method by type and label
    const existing = await db
        .select()
        .from(paymentMethod)
        .where(
            and(
                eq(paymentMethod.userId, userId),
                eq(paymentMethod.typeCode, targetType),
                eq(paymentMethod.label, targetLabel),
                isNull(paymentMethod.deletedAt)
            )
        )
        .limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    try {
        // Create new payment method if not found
        const [created] = await db
            .insert(paymentMethod)
            .values({
                userId,
                typeCode: targetType,
                label: targetLabel,
            })
            .returning();

        return created;
    } catch (e) {
        // Fetch concurrently created payment method
        const existingAgain = await db
            .select()
            .from(paymentMethod)
            .where(
                and(
                    eq(paymentMethod.userId, userId),
                    eq(paymentMethod.typeCode, targetType),
                    eq(paymentMethod.label, targetLabel),
                    isNull(paymentMethod.deletedAt)
                )
            )
            .limit(1);
        if (existingAgain.length > 0) {
            return existingAgain[0];
        }
        throw e;
    }
}
