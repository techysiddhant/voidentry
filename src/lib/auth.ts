import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { v7 as uuidv7 } from "uuid";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { signupSchema, signinSchema } from "@/lib/validations/auth";

const getAuth = () => {
    let env: any = {};
    try {
        const ctx = getCloudflareContext();
        env = ctx.env || {};
    } catch {
        env = process.env || {};
    }

    const secret = env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
    const url = env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL;

    if (!secret) {
        throw new Error("BETTER_AUTH_SECRET environment variable is missing.");
    }
    if (!url) {
        throw new Error("BETTER_AUTH_URL environment variable is missing.");
    }

    const db = getDb();

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "sqlite",
            schema: schema,
        }),
        advanced: {
            database: {
                generateId: () => uuidv7(),
            },
        },
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
        },
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        hooks: {
            before: createAuthMiddleware(async (ctx) => {
                if (ctx.path === "/sign-up/email") {
                    const result = signupSchema.safeParse(ctx.body);
                    if (!result.success) {
                        throw new APIError("BAD_REQUEST", {
                            message: result.error.issues[0].message,
                        });
                    }
                }
                if (ctx.path === "/sign-in/email") {
                    const result = signinSchema.safeParse(ctx.body);
                    if (!result.success) {
                        throw new APIError("BAD_REQUEST", {
                            message: result.error.issues[0].message,
                        });
                    }
                }
            }),
        },
    });
};

export default getAuth;