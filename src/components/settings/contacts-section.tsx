"use client";

// ContactsSection — manages the list of people you split expenses with.
// Fully integrated with TanStack Form and Zod client-side validation.

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { contactSchema } from "@/lib/validations/settings";
import type { Contact } from "./types";
import { Section } from "./section";

interface Props {
    contacts: Contact[];
    onAdd: (name: string) => Promise<unknown>;
    onUpdate: (id: string, name: string) => Promise<unknown>;
    onRemove: (id: string) => void;
}

function validateName(value: string): string | undefined {
    const res = contactSchema.shape.name.safeParse(value);
    if (!res.success) return res.error.issues[0].message;
}

export function ContactsSection({ contacts, onAdd, onUpdate, onRemove }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm({
        defaultValues: {
            name: "",
        },
        onSubmit: async ({ value }) => {
            try {
                if (editingId) {
                    await onUpdate(editingId, value.name.trim());
                } else {
                    await onAdd(value.name.trim());
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

    const startEdit = (c: Contact) => {
        setEditingId(c.id);
        form.setFieldValue("name", c.name);
    };

    return (
        <Section title="People you split with">
            <div className="px-5 py-4 space-y-3">
                {/* ── List of Contacts ── */}
                <ul className="space-y-2" aria-label="Contacts">
                    {contacts.map((c) => (
                        <li
                            key={c.id}
                            className="flex items-center justify-between gap-3 brutal-border bg-paper px-3 py-2"
                        >
                            <span className="font-mono text-sm text-ink">
                                {c.name}
                                {c.id === "you" && (
                                    <span className="ml-2 text-mute text-[10px] uppercase tracking-widest">
                                        that&apos;s you
                                    </span>
                                )}
                            </span>
                            {c.id !== "you" && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => startEdit(c)}
                                        aria-label={`Edit ${c.name}`}
                                        className="brutal-border h-7 w-7 flex items-center justify-center bg-paper hover:bg-yellow transition-colors"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (editingId === c.id) resetForm();
                                            onRemove(c.id);
                                        }}
                                        aria-label={`Remove ${c.name}`}
                                        className="brutal-border h-7 w-7 flex items-center justify-center bg-paper hover:bg-pink transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                {/* ── Add / Edit Form ── */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                    className="brutal-border bg-secondary p-3 space-y-2"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-mute">
                            {editingId ? "Editing person" : "Add a person"}
                        </div>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                aria-label="Cancel edit"
                                className="brutal-border bg-paper h-6 w-6 flex items-center justify-center"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <form.Field
                        name="name"
                        validators={{
                            onChange: ({ value }) => validateName(value),
                        }}
                    >
                        {(field) => (
                            <div>
                                <div className="flex items-center gap-2">
                                    <input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        onBlur={field.handleBlur}
                                        placeholder="add a person…"
                                        aria-label="Contact name"
                                        aria-invalid={field.state.meta.errors.length > 0}
                                        aria-describedby={
                                            field.state.meta.errors.length > 0
                                                ? `${field.name}-error`
                                                : undefined
                                        }
                                        className="flex-1 brutal-border bg-paper px-3 py-2 font-mono text-sm focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        className="brutal-border brutal-press bg-yellow px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shrink-0"
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
                </form>
            </div>
        </Section>
    );
}
