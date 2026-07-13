import { http } from "./http";
import { Expense, ExpenseCreateInput, PaginatedResponse } from "@/types/expense";

export const entriesApi = {
    getEntries: (params: Record<string, any>): Promise<PaginatedResponse<Expense>> => {
        // Clean up arrays by joining them with commas, and remove nullish values
        const cleanedParams: Record<string, any> = {};
        for (const [key, val] of Object.entries(params)) {
            if (val == null) continue;
            if (Array.isArray(val)) {
                if (val.length > 0) {
                    cleanedParams[key] = val.join(",");
                }
            } else {
                cleanedParams[key] = val;
            }
        }
        return http.get(`/entries`, { params: cleanedParams }).then((res) => res.data);
    },

    addEntry: (data: ExpenseCreateInput): Promise<Expense> =>
        http.post("/entries", data).then((res) => res.data),

    updateEntry: (id: string, data: ExpenseCreateInput): Promise<Expense> =>
        http.put(`/entries/${id}`, data).then((res) => res.data),

    removeEntry: (id: string): Promise<unknown> =>
        http.delete(`/entries/${id}`).then((res) => res.data),
};
