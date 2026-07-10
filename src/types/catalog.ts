import { Category } from "./category";

export interface CatalogCategory {
    id: string;
    code: string;
    name: string;
    color: string;
    sortOrder: number;
}

export interface CatalogSubCategory {
    id: string;
    categoryId: string;
    categoryCode: string;
    code: string;
    name: string;
    sortOrder: number;
}

export type DayPoint = { day: number; date: string; total: number; byCat: Partial<Record<Category, number>> };
