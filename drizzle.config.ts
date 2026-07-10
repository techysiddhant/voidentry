
import { defineConfig } from "drizzle-kit";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
// Resolve the local Wrangler D1 SQLite file for drizzle-kit studio.
// Wrangler stores it under .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
// as a hash-named .sqlite file (not metadata.sqlite).
function getLocalD1Path(): string {
    const dir = join(
        process.cwd(),
        ".wrangler/state/v3/d1/miniflare-D1DatabaseObject"
    );
    try {
        const file = readdirSync(dir).find(
            (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite"
        );
        if (file) return join(dir, file);
    } catch {
        // directory doesn't exist yet — fall back to a placeholder path
    }
    return join(dir, "db.sqlite");
}

export default defineConfig({
    dialect: "sqlite",
    schema: "./src/db/schema.ts",
    out: "./migrations",
    dbCredentials: {
        // url: getLocalD1Path(),
        url: pathToFileURL(getLocalD1Path()).href,
    },
});