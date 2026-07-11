import { Contact } from "@/types/split";
import { http } from "./http";
import type { CatalogCategory, CatalogSubCategory } from "@/types/catalog";
import { PaymentMethod } from "@/types/payment";

export interface SettingsPayload {
    preferences: {
        currency: string;
        defaultCalendar: boolean;
        activeCycleId?: string | null;
    };
    contacts: Contact[];
    paymentMethods: PaymentMethod[];
    paymentMethodTypes: { code: string; name: string }[];
    categories: CatalogCategory[];
    subCategories: CatalogSubCategory[];
}

export const settingsApi = {
    getSettings: (): Promise<SettingsPayload> =>
        http.get("/settings").then((res) => res.data),

    updatePreferences: (data: { defaultCalendar?: boolean; currency?: string; activeCycleId?: string | null }) =>
        http.patch("/settings/preferences", data).then((res) => res.data),

    addContact: (name: string): Promise<Contact> =>
        http.post("/settings/contacts", { name }).then((res) => res.data),

    updateContact: (id: string, name: string): Promise<Contact> =>
        http.put(`/settings/contacts/${id}`, { name }).then((res) => res.data),

    removeContact: (id: string) =>
        http.delete(`/settings/contacts/${id}`).then((res) => res.data),

    addPaymentMethod: (data: Omit<PaymentMethod, "id">): Promise<PaymentMethod> =>
        http.post("/settings/payment-methods", data).then((res) => res.data),

    updatePaymentMethod: (id: string, data: Omit<PaymentMethod, "id">): Promise<PaymentMethod> =>
        http.put(`/settings/payment-methods/${id}`, data).then((res) => res.data),

    removePaymentMethod: (id: string) =>
        http.delete(`/settings/payment-methods/${id}`).then((res) => res.data),
};