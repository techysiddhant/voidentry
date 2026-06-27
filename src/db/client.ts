import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export function getDb() {
    const { env } = getCloudflareContext();
    if (!env || !env.DB) {
        throw new Error("Cloudflare D1 DB binding is not available in current environment.");
    }
    return drizzle(env.DB, { schema });
}
