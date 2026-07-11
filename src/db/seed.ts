import { paymentMethodType } from "./schema";

/**
 * Seeds the default payment method types if they do not exist,
 * or updates their names if they do.
 * 
 * Supported types: cash, card, upi, netbanking, wallet, paylater.
 * 
 * @param db The Drizzle database client instance
 */
export async function seedPaymentMethodTypes(db: any) {
    const types = [
        { code: "cash", name: "Cash" },
        { code: "card", name: "Card" },
        { code: "upi", name: "UPI" },
        { code: "netbanking", name: "Net Banking" },
        { code: "wallet", name: "Wallet" },
        { code: "paylater", name: "Pay Later" },
    ];

    for (const t of types) {
        await db
            .insert(paymentMethodType)
            .values({
                code: t.code,
                name: t.name,
            })
            .onConflictDoUpdate({
                target: paymentMethodType.code,
                set: {
                    name: t.name,
                    updatedAt: new Date(),
                },
            });
    }
}
