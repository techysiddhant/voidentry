import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { seedPaymentMethodTypes, seedCatalog } from "@/db/seed";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
    const devMode = process.env.NODE_ENV === "development";

    if (!devMode) {
        let seedKey = process.env.SEED_KEY;
        try {
            const ctx = getCloudflareContext();
            if (ctx?.env && (ctx.env as any).SEED_KEY) {
                seedKey = (ctx.env as any).SEED_KEY;
            }
        } catch {
            // Fallback during build compilation
        }

        const url = new URL(request.url);
        const queryKey = url.searchParams.get("key");

        if (!seedKey || queryKey !== seedKey) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
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
