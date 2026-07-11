"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { QUERY_KEYS } from "@/lib/query-keys";
import { AccountSection } from "@/components/settings/account-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import toast from "react-hot-toast";
import { ContactsSection } from "@/components/settings/contacts-section";
import { PaymentMethodsSection } from "@/components/settings/payment-methods-section";
import { PaymentMethod } from "@/types/payment";

export default function SettingsPage() {
    const queryClient = useQueryClient();

    // 1. Fetch settings payload
    const { data, isLoading, error } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    // 2. Preferences Mutation
    const prefMutation = useMutation({
        mutationFn: settingsApi.updatePreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Preferences updated.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to update preferences.";
            toast.error(msg);
        },
    });

    // 3. Contacts Mutations
    const addContactMutation = useMutation({
        mutationFn: settingsApi.addContact,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Contact added.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to add contact.";
            toast.error(msg);
        },
    });

    const updateContactMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) =>
            settingsApi.updateContact(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Contact updated.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to update contact.";
            toast.error(msg);
        },
    });

    const removeContactMutation = useMutation({
        mutationFn: settingsApi.removeContact,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Contact removed.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to remove contact.";
            toast.error(msg);
        },
    });

    // 4. Payment Method Mutations
    const addPmMutation = useMutation({
        mutationFn: settingsApi.addPaymentMethod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Payment method added.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to add payment method.";
            toast.error(msg);
        },
    });

    const updatePmMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Omit<PaymentMethod, "id"> }) =>
            settingsApi.updatePaymentMethod(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Payment method updated.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to update payment method.";
            toast.error(msg);
        },
    });

    const removePmMutation = useMutation({
        mutationFn: settingsApi.removePaymentMethod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Payment method removed.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to remove payment method.";
            toast.error(msg);
        },
    });

    // Centralized mutation state to prevent race condition clicks
    const isMutating =
        prefMutation.isPending ||
        addContactMutation.isPending ||
        updateContactMutation.isPending ||
        removeContactMutation.isPending ||
        addPmMutation.isPending ||
        updatePmMutation.isPending ||
        removePmMutation.isPending;

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center font-mono text-sm uppercase tracking-widest text-mute">
                Loading settings...
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="px-6 py-4 font-mono text-sm text-red-500 uppercase tracking-widest">
                Failed to load settings. Please try again.
            </div>
        );
    }

    return (
        <div className="px-6 py-4">
            <header className="border-b-2 border-ink pb-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
                    № 004 — settings
                </div>
                <h1 className="mt-1 font-serif text-4xl md:text-5xl leading-[0.95] tracking-tight">
                    Less is <span className="italic">more.</span>
                </h1>
            </header>

            <div className="mt-8 max-w-2xl space-y-6">
                <AccountSection />

                <PreferencesSection
                    defaultCalendar={data.preferences.defaultCalendar}
                    currency={data.preferences.currency}
                    onToggleCalendar={() => {
                        if (isMutating) return;
                        prefMutation.mutate({
                            defaultCalendar: !data.preferences.defaultCalendar,
                            currency: data.preferences.currency,
                        });
                    }}
                />

                <ContactsSection
                    contacts={data.contacts}
                    disabled={isMutating}
                    onAdd={(name) => addContactMutation.mutateAsync(name)}
                    onUpdate={(id, name) => updateContactMutation.mutateAsync({ id, name })}
                    onRemove={(id) => removeContactMutation.mutate(id)}
                />

                <PaymentMethodsSection
                    paymentMethods={data.paymentMethods}
                    paymentMethodTypes={data.paymentMethodTypes}
                    disabled={isMutating}
                    onAdd={(pm) => addPmMutation.mutateAsync(pm)}
                    onUpdate={(id, pm) => updatePmMutation.mutateAsync({ id, data: pm })}
                    onRemove={(id) => removePmMutation.mutate(id)}
                />
            </div>
        </div>
    );
}