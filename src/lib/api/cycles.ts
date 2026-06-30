import { http } from "../http";
import type { Cycle } from "@/lib/expense-store";

export const cyclesApi = {
    getCycles: (): Promise<Cycle[]> =>
        http.get("/cycles").then((res) => res.data),

    addCycle: (data: Omit<Cycle, "id">): Promise<Cycle> =>
        http.post("/cycles", data).then((res) => res.data),

    updateCycle: (id: string, data: Omit<Cycle, "id">): Promise<Cycle> =>
        http.put(`/cycles/${id}`, data).then((res) => res.data),

    removeCycle: (id: string): Promise<unknown> =>
        http.delete(`/cycles/${id}`).then((res) => res.data),
};
