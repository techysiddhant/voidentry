import type { CatalogCategory, CatalogSubCategory } from "@/types/catalog";

export function groupSubCategoriesByCategoryCode(subCategories: CatalogSubCategory[]) {
    return subCategories.reduce<Record<string, CatalogSubCategory[]>>((acc, subCategory) => {
        (acc[subCategory.categoryCode] ??= []).push(subCategory);
        return acc;
    }, {});
}

export function mapCategoriesByCode(categories: CatalogCategory[]) {
    return categories.reduce<Record<string, CatalogCategory>>((acc, category) => {
        acc[category.code] = category;
        return acc;
    }, {});
}

export function mapSubCategoriesByCode(subCategories: CatalogSubCategory[]) {
    return subCategories.reduce<Record<string, CatalogSubCategory>>((acc, subCategory) => {
        acc[subCategory.code] = subCategory;
        return acc;
    }, {});
}

export function slugifyCatalogCode(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/_+/g, "_");
}

export function chartColorFromClass(color: string) {
    switch (color) {
        case "bg-pink":
            return "var(--pink)";
        case "bg-yellow":
            return "var(--yellow)";
        case "bg-ink":
            return "var(--ink)";
        case "bg-teal":
        default:
            return "var(--teal)";
    }
}

function tokenize(input: string) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

export function inferSubCategoryCode(
    text: string,
    subCategories: CatalogSubCategory[],
) {
    const tokens = new Set(tokenize(text));
    let best: { code: string; score: number } | null = null;

    for (const subCategory of subCategories) {
        const labelTokens = tokenize(subCategory.name);
        const score = labelTokens.reduce((sum, token) => sum + (tokens.has(token) ? 1 : 0), 0);
        if (score <= 0) continue;
        if (!best || score > best.score) {
            best = { code: subCategory.code, score };
        }
    }

    return best?.code ?? null;
}
