import { sqliteTable, text, integer, uniqueIndex, foreignKey, index } from "drizzle-orm/sqlite-core";
import { sql, defineRelations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

export const user = sqliteTable("user", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
});


export const account = sqliteTable("account", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => ({
    providerAccountUnique: uniqueIndex("account_provider_account_unique").on(
        table.providerId,
        table.accountId,
    ),
}));

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const consentAuditLogs = sqliteTable("consent_audit_logs", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "no action" }),
    termsAccepted: integer("terms_accepted", { mode: "boolean" }).notNull(),
    privacyAccepted: integer("privacy_accepted", { mode: "boolean" }).notNull(),
    artifactVersion: text("artifact_version").notNull(),
    purposeScope: text("purpose_scope", { mode: "json" }).notNull(), // SQLite stores json objects as strings
    ipAddress: text("ip_address").notNull(),
    timestampUtc: integer("timestamp_utc", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const schemaRelations = defineRelations({ user, consentAuditLogs }, (r) => ({
    user: {
        consentLogs: r.many.consentAuditLogs(),
    },
    consentAuditLogs: {
        user: r.one.user({
            from: r.consentAuditLogs.userId,
            to: r.user.id,
        }),
    },
}));
