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
    activeCycleId: text("active_cycle_id"), // Remove simple reference to enforce composite foreign key below
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
}, (table) => ({
    userPreferencesCycleFk: foreignKey({
        columns: [table.userId, table.activeCycleId],
        foreignColumns: [cycle.userId, cycle.id],
    }).onDelete("set null"),
}));

export const contact = sqliteTable("contact", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}, (table) => ({
    userContactUnique: uniqueIndex("contact_user_name_unique")
        .on(table.userId, table.name)
        .where(sql`deleted_at IS NULL`),
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

export const category = sqliteTable("category", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // null = global default
    code: text("code").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("bg-teal"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}, (table) => ({
    categoryCodeUnique: uniqueIndex("category_code_unique")
        .on(table.code)
        .where(sql`deleted_at IS NULL`),
    userCategoryUnique: uniqueIndex("category_user_name_unique")
        .on(table.userId, table.name)
        .where(sql`deleted_at IS NULL`),
}));

export const subCategory = sqliteTable("sub_category", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    categoryId: text("category_id").notNull().references(() => category.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // null = global default
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}, (table) => ({
    categorySubCategoryCodeUnique: uniqueIndex("sub_category_category_user_code_unique")
        .on(table.categoryId, table.userId, table.code)
        .where(sql`deleted_at IS NULL`),
    categorySubCategoryUnique: uniqueIndex("sub_category_category_user_name_unique")
        .on(table.categoryId, table.userId, table.name)
        .where(sql`deleted_at IS NULL`),
}));

export const cycle = sqliteTable("cycle", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$onUpdateFn(() => new Date()).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}, (table) => ({
    userCycleUnique: uniqueIndex("cycle_user_id_id_unique").on(table.userId, table.id),
    userCycleLabelUnique: uniqueIndex("cycle_user_label_unique")
        .on(table.userId, table.label)
        .where(sql`deleted_at IS NULL`),
}));