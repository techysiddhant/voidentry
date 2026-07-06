import { http } from "../http";
import type { Expense, ExpenseInput, ExpenseCreateInput } from "@/types/expense";

export const entriesApi = {
    getEntries: (params: { cycleId: string }): Promise<Expense[]> =>
        http.get("/entries", { params }).then((res) => res.data),

    addEntry: (input: ExpenseCreateInput): Promise<Expense> =>
        http.post("/entries", input).then((res) => res.data),

    updateEntry: (id: string, input: ExpenseCreateInput): Promise<Expense> =>
        http.put(`/entries/${id}`, input).then((res) => res.data),

    deleteEntry: (id: string): Promise<{ success: boolean }> =>
        http.delete(`/entries/${id}`).then((res) => res.data),

    addCustomSubCategory: (data: { categoryCode: string; name: string }): Promise<{ id: string; categoryCode: string; code: string; name: string; sortOrder: number }> =>
        http.post("/settings/sub-categories", data).then((res) => res.data),
};
