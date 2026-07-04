import { http } from "../http";
import type { Expense, ExpenseInput } from "../expense-store";

export const entriesApi = {
    getEntries: (params: { cycleId: string }): Promise<Expense[]> =>
        http.get("/entries", { params }).then((res) => res.data),

    addEntry: (input: ExpenseInput): Promise<Expense> =>
        http.post("/entries", input).then((res) => res.data),

    updateEntry: (id: string, input: ExpenseInput): Promise<Expense> =>
        http.put(`/entries/${id}`, input).then((res) => res.data),

    deleteEntry: (id: string): Promise<{ success: boolean }> =>
        http.delete(`/entries/${id}`).then((res) => res.data),

    addCustomSubCategory: (data: { categoryName: string; name: string }): Promise<{ id: string; name: string }> =>
        http.post("/settings/sub-categories", data).then((res) => res.data),
};
