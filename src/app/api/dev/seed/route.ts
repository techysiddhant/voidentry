import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { seedPaymentMethodTypes, seedCatalog } from "@/db/seed";

export async function GET() {
    // Safely restrict execution to development mode only
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const db = getDb();
        await seedPaymentMethodTypes(db);
        await seedCatalog(db);
        return NextResponse.json({
            success: true,
            message: "Database seeded successfully with catalog categories and payment method types",
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to seed database" }, { status: 500 });
    }
}
