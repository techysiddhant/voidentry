"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { paymentMethodSchema } from "@/lib/validations/settings";
import { Section } from "./section";
import { PaymentMethod, PaymentType } from "@/types/payment";

interface Props {
    paymentMethods: PaymentMethod[];
    paymentMethodTypes: { code: string; name: string }[];
    onAdd: (method: Omit<PaymentMethod, "id">) => Promise<unknown>;
    onUpdate: (id: string, method: Omit<PaymentMethod, "id">) => Promise<unknown>;
    onRemove: (id: string) => void;
    disabled?: boolean;
}

function validateLabel(value: string): string | undefined {
    const res = paymentMethodSchema.shape.label.safeParse(value);
    if (!res.success) return res.error.issues[0].message;
}

function validateHint(value: string): string | undefined {
    const res = paymentMethodSchema.shape.hint.safeParse(value || null);
    if (!res.success) return res.error.issues[0].message;
}

export function PaymentMethodsSection({ paymentMethods, paymentMethodTypes, onAdd, onUpdate, onRemove, disabled = false }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const getPaymentTypeName = (typeCode: string) => {
        return paymentMethodTypes.find((t) => t.code === typeCode)?.name ?? typeCode;
    };

    const form = useForm({
        defaultValues: {
            type: (paymentMethodTypes[0]?.code || "card") as PaymentType,
            label: "",
            hint: "",
        },
        onSubmit: async ({ value }) => {
            const payload = {
                type: value.type,
                label: value.label.trim(),
                hint: value.hint.trim() || undefined,
            };
            try {
                if (editingId) {
                    await onUpdate(editingId, payload);
                } else {
                    await onAdd(payload);
                }
                resetForm();
            } catch {
                // mutation error is handled by the parent's onError toast
            }
        },
    });

    const resetForm = () => {
        setEditingId(null);
        form.reset();
    };

    const startEdit = (pm: PaymentMethod) => {
        setEditingId(pm.id);
        form.setFieldValue("type", pm.type);
        form.setFieldValue("label", pm.label);
        form.setFieldValue("hint", pm.hint ?? "");
    };

    return (
        <Section title="Payment methods">
            <div className="px-5 py-4 space-y-3">
                {/* ── List of Methods ── */}
                {paymentMethods.length === 0 ? (
                    <p className="font-mono text-xs text-mute">
                        No saved methods yet — add one below.
                    </p>
                ) : (
                    <ul className="space-y-2" aria-label="Payment methods">
                        {paymentMethods.map((pm) => (
                            <li
                                key={pm.id}
                                className="flex items-center justify-between gap-3 brutal-border bg-paper px-3 py-2"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="brutal-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest shrink-0">
                                        {getPaymentTypeName(pm.type)}
                                    </span>
                                    <span className="font-mono text-sm text-ink truncate">
                                        {pm.label}
                                    </span>
                                    {pm.hint && (
                                        <span className="font-mono text-[11px] text-mute truncate">
                                            {pm.hint}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => startEdit(pm)}
                                        disabled={disabled}
                                        aria-label={`Edit ${pm.label}`}
                                        className="brutal-border h-7 w-7 flex items-center justify-center bg-paper hover:bg-yellow transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (editingId === pm.id) resetForm();
                                            onRemove(pm.id);
                                        }}
                                        disabled={disabled}
                                        aria-label={`Remove ${pm.label}`}
                                        className="brutal-border h-7 w-7 flex items-center justify-center bg-paper hover:bg-pink transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* ── Add / Edit Form ── */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                    className="brutal-border bg-secondary p-3 space-y-2"
                    aria-label={editingId ? "Edit payment method" : "Add payment method"}
                >
                    {/* Form Header */}
                    <div className="flex items-center justify-between">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-mute">
                            {editingId ? "Editing method" : "Add a method"}
                        </div>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={disabled}
                                aria-label="Cancel edit"
                                className="brutal-border bg-paper h-6 w-6 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Type Picker */}
                    <form.Field name="type">
                        {(field) => (
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="group"
                                aria-label="Payment type"
                            >
                                {paymentMethodTypes.map((t) => (
                                    <button
                                        key={t.code}
                                        type="button"
                                        onClick={() => field.handleChange(t.code)}
                                        disabled={disabled}
                                        aria-pressed={field.state.value === t.code}
                                        className={[
                                            "brutal-border brutal-press px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:pointer-events-none",
                                            field.state.value === t.code
                                                ? "bg-teal text-paper"
                                                : "bg-paper text-ink",
                                        ].join(" ")}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </form.Field>

                    {/* Label Input */}
                    <form.Subscribe selector={(s) => s.values.type}>
                        {(pmType) => (
                            <form.Field
                                name="label"
                                validators={{
                                    onChange: ({ value }) => validateLabel(value),
                                }}
                            >
                                {(field) => (
                                    <div>
                                        <input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            onBlur={field.handleBlur}
                                            placeholder={
                                                pmType === "card"
                                                    ? "card name (e.g. HDFC Millennia)"
                                                    : `name (e.g. Personal ${getPaymentTypeName(pmType)})`
                                            }
                                            aria-label="Method name"
                                            disabled={disabled}
                                            aria-invalid={field.state.meta.errors.length > 0}
                                            aria-describedby={
                                                field.state.meta.errors.length > 0
                                                    ? `${field.name}-error`
                                                    : undefined
                                            }
                                            className="w-full brutal-border bg-paper px-3 py-2 font-mono text-sm focus:outline-none disabled:bg-secondary disabled:text-mute"
                                        />
                                        {field.state.meta.errors.length > 0 && (
                                            <p
                                                id={`${field.name}-error`}
                                                role="alert"
                                                className="mt-1 font-mono text-[10px] uppercase tracking-widest text-red-500"
                                            >
                                                {field.state.meta.errors[0]}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </form.Field>
                        )}
                    </form.Subscribe>

                    {/* Hint Input */}
                    <form.Field
                        name="hint"
                        validators={{
                            onChange: ({ value }) => validateHint(value),
                        }}
                    >
                        {(field) => (
                            <div>
                                <input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    placeholder="optional hint (e.g. ··1234 or upi handle)"
                                    aria-label="Optional hint"
                                    disabled={disabled}
                                    aria-invalid={field.state.meta.errors.length > 0}
                                    aria-describedby={
                                        field.state.meta.errors.length > 0
                                            ? `${field.name}-error`
                                            : undefined
                                    }
                                    className="w-full brutal-border bg-paper px-3 py-2 font-mono text-sm focus:outline-none disabled:bg-secondary disabled:text-mute"
                                />
                                {field.state.meta.errors.length > 0 && (
                                    <p
                                        id={`${field.name}-error`}
                                        role="alert"
                                        className="mt-1 font-mono text-[10px] uppercase tracking-widest text-red-500"
                                    >
                                        {field.state.meta.errors[0]}
                                    </p>
                                )}
                            </div>
                        )}
                    </form.Field>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={disabled}
                            className="brutal-border brutal-press bg-yellow px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {editingId ? (
                                <>
                                    <Check className="h-3.5 w-3.5" /> Save
                                </>
                            ) : (
                                <>
                                    <Plus className="h-3.5 w-3.5" /> Add
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Section>
    );
}