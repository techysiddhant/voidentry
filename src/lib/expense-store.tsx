"use client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-keys";
import { settingsApi } from "./api/settings";
import { cyclesApi } from "./api/cycles";
import { entriesApi } from "./api/entries";
import { getCalendarMonth } from "./utils";
import {
    groupSubCategoriesByCategoryCode,
    mapCategoriesByCode,
    mapSubCategoriesByCode,
} from "./catalog";
import type { CatalogCategory, CatalogSubCategory } from "@/types/catalog";

export type Category = string;

import type {
    PaymentType,
    PaymentMethod,
    Split,
    SplitMode,
    SplitParticipant,
    Expense,
    ExpenseInput,
    ExpenseCreateInput,
    Contact,
} from "@/types/expense";

export type { PaymentType, PaymentMethod, Split, SplitMode, SplitParticipant, Expense, ExpenseInput, ExpenseCreateInput, Contact };

export type Cycle = {
    id: string;
    label: string;
    start: string; // ISO date
    end: string;   // ISO date
    total?: number;
};

export type PaymentMethodInput = Omit<PaymentMethod, "id">;

export const PAYMENT_META: Record<PaymentType, { label: string; short: string }> = {
    cash: { label: "Cash", short: "cash" },
    card: { label: "Card", short: "card" },
    upi: { label: "UPI", short: "upi" },
    netbanking: { label: "Net Banking", short: "netbank" },
    wallet: { label: "Wallet", short: "wallet" },
};

export function formatMoney(val: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(val);
}

export function formatDateRange(start: string, end: string): string {
    const format = (dStr: string) => {
        const d = new Date(dStr + "T00:00:00Z");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    };
    return `${format(start)} – ${format(end)}`;
}

// ─── Custom Hook integrating TanStack Query & DB Operations ────────────────────

export function useExpenses() {
    const queryClient = useQueryClient();

    const { data: settings } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    const { data: cycles } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    // 1. Resolve active cycle
    const activeCycleId = settings?.preferences?.activeCycleId;
    const activeCycle = useMemo((): Cycle => {
        if (cycles && activeCycleId) {
            const found = cycles.find((c) => c.id === activeCycleId);
            if (found) return found;
        }
        if (cycles && cycles.length > 0) {
            return cycles[0];
        }
        const cal = getCalendarMonth();
        return {
            id: "active-cycle",
            label: cal.label,
            start: cal.start,
            end: cal.end,
        };
    }, [cycles, activeCycleId]);

    // 2. Fetch expenses from DB
    const { data: expenses = [] } = useQuery({
        queryKey: [QUERY_KEYS.ENTRIES, activeCycle.id],
        queryFn: () => entriesApi.getEntries({ cycleId: activeCycle.id }),
        enabled: !!activeCycle.id,
    });

    // 3. Resolve contacts (prepend "you" for split UI)
    const contacts = useMemo(() => {
        const list = settings?.contacts?.map(c => ({ id: c.id, name: c.name })) || [];
        // Ensure "You" is always prepended
        if (list.length > 0 && list[0].id === "you") return list;
        return [{ id: "you", name: "You" }, ...list];
    }, [settings?.contacts]);

    // 4. Resolve payment methods
    const paymentMethods = useMemo(() => {
        return settings?.paymentMethods || [];
    }, [settings?.paymentMethods]);

    const categories = useMemo<CatalogCategory[]>(() => {
        return [...(settings?.categories || [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }, [settings?.categories]);

    const subCategories = useMemo<CatalogSubCategory[]>(() => {
        return [...(settings?.subCategories || [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }, [settings?.subCategories]);

    const categoryByCode = useMemo(() => mapCategoriesByCode(categories), [categories]);
    const subCategoryByCode = useMemo(() => mapSubCategoriesByCode(subCategories), [subCategories]);
    const subCategoriesByCategoryCode = useMemo(
        () => groupSubCategoriesByCategoryCode(subCategories),
        [subCategories],
    );

    // Mutations
    const addExpenseMutation = useMutation({
        mutationFn: (input: ExpenseInput) => entriesApi.addEntry(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            // Invalidate settings in case backend auto-created categories/payment methods/subcategories
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) => entriesApi.updateEntry(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        },
    });

    const removeExpenseMutation = useMutation({
        mutationFn: (id: string) => entriesApi.deleteEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
        },
    });

    const addCustomSubMutation = useMutation({
        mutationFn: (data: { categoryCode: string; name: string }) => entriesApi.addCustomSubCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        },
    });

    const addExpense = (input: ExpenseInput) => {
        return addExpenseMutation.mutateAsync(input);
    };

    const updateExpense = (id: string, input: ExpenseInput) => {
        updateExpenseMutation.mutate({ id, input });
    };

    const removeExpense = (id: string) => {
        removeExpenseMutation.mutate(id);
    };

    const addCustomSub = (categoryCode: string, sub: string) => {
        addCustomSubMutation.mutate({ categoryCode, name: sub });
    };

    const addPaymentMethod = async (method: PaymentMethodInput): Promise<PaymentMethod> => {
        const savedMethod = await settingsApi.addPaymentMethod({
            type: method.type,
            label: method.label,
            hint: method.hint || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        return savedMethod;
    };

    return {
        expenses,
        activeCycle,
        categories,
        subCategories,
        categoryByCode,
        subCategoryByCode,
        subCategoriesByCategoryCode,
        paymentMethods,
        contacts,
        addExpense,
        updateExpense,
        removeExpense,
        addCustomSub,
        addPaymentMethod,
    };
}
