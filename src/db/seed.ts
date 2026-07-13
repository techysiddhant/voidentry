import { v7 as uuidv7 } from "uuid";
import { and, eq, isNull } from "drizzle-orm";
import { paymentMethodType, category, subCategory } from "./schema";

export const catalog = [
    {
        code: "food",
        name: "Food",
        color: "bg-pink",
        sortOrder: 10,
        subCategories: [
            { code: "restaurants_dining", name: "Restaurants & Dining", sortOrder: 10 },
            { code: "coffee_tea", name: "Coffee & Tea", sortOrder: 20 },
            { code: "delivery_takeout", name: "Delivery & Takeout", sortOrder: 30 },
        ],
    },
    {
        code: "transport",
        name: "Transport",
        color: "bg-yellow",
        sortOrder: 20,
        subCategories: [
            { code: "public_transit", name: "Public Transit", sortOrder: 10 },
            { code: "ride_share_taxis", name: "Ride Share & Taxis", sortOrder: 20 },
            { code: "fuel", name: "Fuel", sortOrder: 30 },
            { code: "parking_tolls", name: "Parking & Tolls", sortOrder: 40 },
            { code: "vehicle_maintenance", name: "Vehicle Maintenance", sortOrder: 50 },
        ],
    },
    {
        code: "groceries",
        name: "Groceries",
        color: "bg-teal",
        sortOrder: 30,
        subCategories: [
            { code: "supermarket", name: "Supermarket", sortOrder: 10 },
            { code: "fruits_vegetables", name: "Fruits & Vegetables", sortOrder: 20 },
            { code: "local_market_kirana", name: "Local Market / Kirana", sortOrder: 30 },
        ],
    },
    {
        code: "housing",
        name: "Housing",
        color: "bg-ink",
        sortOrder: 40,
        subCategories: [
            { code: "rent", name: "Rent", sortOrder: 10 },
            { code: "home_supplies", name: "Home Supplies", sortOrder: 20 },
            { code: "home_maintenance", name: "Home Maintenance", sortOrder: 30 },
        ],
    },
    {
        code: "utilities",
        name: "Utilities",
        color: "bg-teal",
        sortOrder: 50,
        subCategories: [
            { code: "electricity", name: "Electricity", sortOrder: 10 },
            { code: "water", name: "Water", sortOrder: 20 },
            { code: "internet", name: "Internet", sortOrder: 30 },
            { code: "mobile", name: "Mobile", sortOrder: 40 },
            { code: "insurance", name: "Insurance", sortOrder: 50 },
        ],
    },
    {
        code: "subs",
        name: "Subscriptions",
        color: "bg-pink",
        sortOrder: 60,
        subCategories: [
            { code: "streaming", name: "Streaming", sortOrder: 10 },
            { code: "software_apps", name: "Software & Apps", sortOrder: 20 },
            { code: "memberships", name: "Memberships", sortOrder: 30 },
        ],
    },
    {
        code: "personal",
        name: "Personal",
        color: "bg-pink",
        sortOrder: 70,
        subCategories: [
            { code: "health_medical", name: "Health & Medical", sortOrder: 10 },
            { code: "fitness", name: "Fitness", sortOrder: 20 },
            { code: "salon_grooming", name: "Salon & Grooming", sortOrder: 30 },
            { code: "shopping", name: "Shopping", sortOrder: 40 },
            { code: "hobbies", name: "Hobbies", sortOrder: 50 },
        ],
    },
    {
        code: "travel",
        name: "Travel",
        color: "bg-yellow",
        sortOrder: 80,
        subCategories: [
            { code: "flights_trains", name: "Flights & Trains", sortOrder: 10 },
            { code: "hotels_stays", name: "Hotels & Stays", sortOrder: 20 },
            { code: "activities", name: "Activities", sortOrder: 30 },
        ],
    },
    {
        code: "misc",
        name: "Misc",
        color: "bg-teal",
        sortOrder: 90,
        subCategories: [
            { code: "gifts_donations", name: "Gifts & Donations", sortOrder: 10 },
            { code: "education", name: "Education", sortOrder: 20 },
            { code: "cash_withdrawal", name: "Cash Withdrawal", sortOrder: 30 },
            { code: "fees_charges", name: "Fees & Charges", sortOrder: 40 },
            { code: "other", name: "Other", sortOrder: 50 },
        ],
    },
];

/**
 * Seeds the default payment method types if they do not exist,
 * or updates their names if they do.
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

/**
 * Seeds the global default catalog categories and subcategories.
 */
export async function seedCatalog(db: any) {
    for (const c of catalog) {
        // 1. Get or Create Category
        let catRow = null;
        const existingCat = await db
            .select()
            .from(category)
            .where(
                and(
                    eq(category.code, c.code),
                    isNull(category.userId),
                    isNull(category.deletedAt)
                )
            )
            .limit(1);

        if (existingCat.length > 0) {
            catRow = existingCat[0];
            await db
                .update(category)
                .set({
                    name: c.name,
                    color: c.color,
                    sortOrder: c.sortOrder,
                })
                .where(eq(category.id, catRow.id));
        } else {
            const [newCat] = await db
                .insert(category)
                .values({
                    id: uuidv7(),
                    userId: null,
                    code: c.code,
                    name: c.name,
                    color: c.color,
                    sortOrder: c.sortOrder,
                })
                .returning();
            catRow = newCat;
        }

        // 2. Get or Create Subcategories
        for (const sc of c.subCategories) {
            const existingSub = await db
                .select()
                .from(subCategory)
                .where(
                    and(
                        eq(subCategory.code, sc.code),
                        eq(subCategory.categoryId, catRow.id),
                        isNull(subCategory.userId),
                        isNull(subCategory.deletedAt)
                    )
                )
                .limit(1);

            if (existingSub.length > 0) {
                await db
                    .update(subCategory)
                    .set({
                        name: sc.name,
                        sortOrder: sc.sortOrder,
                    })
                    .where(eq(subCategory.id, existingSub[0].id));
            } else {
                await db
                    .insert(subCategory)
                    .values({
                        id: uuidv7(),
                        categoryId: catRow.id,
                        userId: null,
                        code: sc.code,
                        name: sc.name,
                        sortOrder: sc.sortOrder,
                    });
            }
        }
    }
}
