#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { v7 as uuidv7 } from "uuid";
import { catalog } from "./catalog-data.mjs";

const args = new Set(process.argv.slice(2));
const scope = args.has("--remote") ? "--remote" : "--local";
const mode = [...args].find((arg) => arg.startsWith("--mode="))?.split("=")[1] ?? "seed";

function runWrangler(command) {
  const output = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", scope, "--json", "--command", command],
    { encoding: "utf8" },
  );
  return JSON.parse(output);
}

function extractRows(payload) {
  const rows = [];

  if (Array.isArray(payload)) {
    for (const item of payload) {
      rows.push(...extractRows(item));
    }
    return rows;
  }

  if (!payload || typeof payload !== "object") return rows;

  if (Array.isArray(payload.results)) rows.push(...payload.results);
  if (Array.isArray(payload.rows)) rows.push(...payload.rows);

  for (const value of Object.values(payload)) {
    rows.push(...extractRows(value));
  }

  return rows;
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function validateCatalogDefinition() {
  for (const category of catalog) {
    if (!category.code || !category.name || !category.color) {
      throw new Error(`Invalid category definition for ${JSON.stringify(category)}`);
    }
    for (const subCategory of category.subCategories) {
      if (!subCategory.code || !subCategory.name) {
        throw new Error(`Invalid subcategory definition for ${category.code}`);
      }
    }
  }
}

function validateSchema() {
  const categoryColumns = new Set(
    extractRows(runWrangler("PRAGMA table_info(category);")).map((row) => row.name),
  );
  for (const required of ["id", "code", "name", "color", "sort_order"]) {
    if (!categoryColumns.has(required)) {
      throw new Error(`Schema validation failed: category is missing "${required}"`);
    }
  }

  const subCategoryColumns = new Set(
    extractRows(runWrangler("PRAGMA table_info(sub_category);")).map((row) => row.name),
  );
  for (const required of ["id", "category_id", "code", "name", "sort_order"]) {
    if (!subCategoryColumns.has(required)) {
      throw new Error(`Schema validation failed: sub_category is missing "${required}"`);
    }
  }

  const schemaSource = readFileSync(join(process.cwd(), "src/db/schema.ts"), "utf8");
  for (const tableName of ["category", "subCategory"]) {
    const tableBlock = schemaSource.match(
      new RegExp(`export const ${tableName} = sqliteTable\\([\\s\\S]*?\\n\\}\\);`, "m"),
    )?.[0];

    if (!tableBlock?.includes('$defaultFn(() => uuidv7())')) {
      throw new Error(`Schema validation failed: ${tableName}.id must use uuidv7() defaults`);
    }
  }
}

function getExistingCategories() {
  const payload = runWrangler(`
    SELECT id, code, name, color, sort_order
    FROM category
    WHERE user_id IS NULL AND deleted_at IS NULL;
  `);
  return extractRows(payload);
}

function getExistingSubCategories() {
  const payload = runWrangler(`
    SELECT sc.id, sc.category_id, c.code AS category_code, sc.code, sc.name, sc.sort_order
    FROM sub_category sc
    JOIN category c ON c.id = sc.category_id
    WHERE sc.user_id IS NULL
      AND sc.deleted_at IS NULL
      AND c.deleted_at IS NULL;
  `);
  return extractRows(payload);
}

function buildResetSql() {
  return `
    DELETE FROM expense_split_participant;
    DELETE FROM expense;
    DELETE FROM sub_category WHERE user_id IS NULL;
    DELETE FROM category WHERE user_id IS NULL;
  `;
}

function buildSeedSql(existingCategories, existingSubCategories) {
  const categoryByCode = new Map(existingCategories.map((row) => [row.code, row]));
  const subCategoryByKey = new Map(existingSubCategories.map((row) => [`${row.category_code}:${row.code}`, row]));

  const statements = [];
  const categoryIds = new Map();

  for (const category of catalog) {
    const existing = categoryByCode.get(category.code);
    const categoryId = existing?.id ?? uuidv7();
    categoryIds.set(category.code, categoryId);

    if (existing) {
      statements.push(`
        UPDATE category
        SET name = ${quote(category.name)},
            color = ${quote(category.color)},
            sort_order = ${category.sortOrder},
            deleted_at = NULL
        WHERE id = ${quote(categoryId)};
      `);
    } else {
      statements.push(`
        INSERT INTO category (id, user_id, code, name, color, sort_order, deleted_at)
        VALUES (${quote(categoryId)}, NULL, ${quote(category.code)}, ${quote(category.name)}, ${quote(category.color)}, ${category.sortOrder}, NULL);
      `);
    }
  }

  for (const category of catalog) {
    const categoryId = categoryIds.get(category.code);
    for (const subCategory of category.subCategories) {
      const key = `${category.code}:${subCategory.code}`;
      const existing = subCategoryByKey.get(key);
      const subCategoryId = existing?.id ?? uuidv7();

      if (existing) {
        statements.push(`
          UPDATE sub_category
          SET category_id = ${quote(categoryId)},
              name = ${quote(subCategory.name)},
              sort_order = ${subCategory.sortOrder},
              deleted_at = NULL
          WHERE id = ${quote(subCategoryId)};
        `);
      } else {
        statements.push(`
          INSERT INTO sub_category (id, category_id, user_id, code, name, sort_order, deleted_at)
          VALUES (${quote(subCategoryId)}, ${quote(categoryId)}, NULL, ${quote(subCategory.code)}, ${quote(subCategory.name)}, ${subCategory.sortOrder}, NULL);
        `);
      }
    }
  }

  return statements.join("\n");
}

function main() {
  validateCatalogDefinition();
  validateSchema();

  if (mode !== "seed" && mode !== "reset-and-seed") {
    throw new Error(`Unsupported mode "${mode}". Use --mode seed or --mode reset-and-seed.`);
  }

  if (mode === "reset-and-seed") {
    runWrangler(buildResetSql());
  }

  const existingCategories = getExistingCategories();
  const existingSubCategories = getExistingSubCategories();
  runWrangler(buildSeedSql(existingCategories, existingSubCategories));
  console.log(`Catalog ${mode === "seed" ? "seeded" : "reset and reseeded"} successfully (${scope.replace("--", "")}).`);
}

main();
