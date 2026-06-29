import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
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

export const paymentMethodType = sqliteTable("payment_method_type", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
});

export const userPreferences = sqliteTable("user_preferences", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("INR"),
    defaultCalendar: integer("default_calendar", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
});

export const contact = sqliteTable("contact", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}, (table) => ({
    userContactUnique: uniqueIndex("contact_user_name_unique").on(table.userId, table.name),
}));

export const paymentMethod = sqliteTable("payment_method", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    typeCode: text("type_code").notNull().references(() => paymentMethodType.code),
    label: text("label").notNull(),
    hint: text("hint"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});
