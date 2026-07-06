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
