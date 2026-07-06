"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import {
    useExpenses,
    type ExpenseInput,
    type PaymentType,
} from "@/lib/expense-store";
import { ExpenseDialog } from "@/components/entries/expense-dialog";
import { UserBubble } from "@/components/chat/user-bubble";
import { AssistantBubble } from "@/components/chat/assistant-bubble";
import type { Msg, PendingDraft } from "@/types/expense";

export default function ChatPage() {
    const { addExpense, activeCycle, paymentMethods, contacts, categories, subCategories } = useExpenses();

    const [messages, setMessages] = useState<Msg[]>([
        {
            id: crypto.randomUUID(),
            role: "assistant",
            status: "confirmed",
            text: `You're logging to ${activeCycle.label}. Just type what you spent — amount, what for. I'll handle the rest.`,
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMsgId, setEditorMsgId] = useState<string | null>(null);
    const [editorInitial, setEditorInitial] = useState<PendingDraft | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesRef = useRef(messages);

    /**
     * Race-condition guard: tracks message IDs that have already been confirmed.
     * Prevents the 10s auto-save timer and a simultaneous manual Confirm click
     * from both calling addExpense() for the same draft.
     */
    const confirmedIds = useRef<Set<string>>(new Set());
    const confirmingIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    /** Save a draft. The confirmedIds guard ensures this is a strict no-op on second call. */
    const confirm = useCallback(
        async (msgId: string) => {
            if (confirmedIds.current.has(msgId) || confirmingIds.current.has(msgId)) return;
            const msg = messagesRef.current.find(
                (m): m is Extract<Msg, { role: "assistant" }> & { draft: PendingDraft } =>
                    m.id === msgId && m.role === "assistant" && !!m.draft,
            );
            if (!msg?.draft) return;

            confirmingIds.current.add(msgId);
            try {
                await addExpense(msg.draft as ExpenseInput);
                confirmedIds.current.add(msgId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId && m.role === "assistant" && m.draft
                            ? { ...m, status: "confirmed" as const }
                            : m,
                    ),
                );
            } catch (error) {
                confirmedIds.current.delete(msgId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId && m.role === "assistant" && m.draft
                            ? { ...m, status: "pending" as const }
                            : m,
                    ),
                );
                console.error("Failed to save draft:", error);
            } finally {
                confirmingIds.current.delete(msgId);
            }
        },
        [addExpense],
    );

    const discard = (msgId: string) => {
        setMessages((prev) =>
            prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, status: "discarded" as const } : m)),
        );
    };

    const openEditor = (msgId: string, draft: PendingDraft) => {
        setEditorMsgId(msgId);
        setEditorInitial(draft);
        setEditorOpen(true);
    };

    /**
     * Called when the ExpenseDialog closes.
     * The dialog's own Save button already called addExpense() internally —
     * so we ONLY update the message display status here. Never call addExpense() again.
     */
    const onEditorClose = () => {
        setEditorOpen(false);
        if (editorMsgId) {
            const id = editorMsgId;
            // Mark as confirmed for display — the dialog already saved the entry.
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === id && m.role === "assistant" && m.status === "pending"
                        ? { ...m, status: "confirmed" as const }
                        : m,
                ),
            );
            // Also register in the guard so the auto-timer doesn't double-save.
            confirmedIds.current.add(id);
        }
        setEditorMsgId(null);
        setEditorInitial(null);
    };

    const send = async (raw: string) => {
        const text = raw.trim();
        if (!text || loading) return;
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    currentDate: todayStr,
                    cycleStart: activeCycle.start,
                    cycleEnd: activeCycle.end,
                    categories: categories.map((category) => ({
                        code: category.code,
                        name: category.name,
                        color: category.color,
                    })),
                    subCategories: subCategories.map((subCategory) => ({
                        code: subCategory.code,
                        name: subCategory.name,
                        categoryCode: subCategory.categoryCode,
                    })),
                    paymentMethods: paymentMethods.map((m) => ({ id: m.id, type: m.type, label: m.label })),
                    contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to contact parsing server.");
            }

            const data = (await response.json()) as any;
            const result = data.result;

            if (result.clarification) {
                setMessages((m) => [
                    ...m,
                    { id: crypto.randomUUID(), role: "assistant", status: "confirmed", text: result.clarification },
                ]);
            } else {
                const extractedType: PaymentType = result.payment?.type || "upi";
                let matchedMethodId = result.payment?.methodId || undefined;
                // If it's a new payment method, DO NOT fallback to an existing method of this type.
                if (!matchedMethodId && !result.newPaymentMethod) {
                    matchedMethodId = paymentMethods.find((m) => m.type === extractedType)?.id;
                }

                const draft: PendingDraft = {
                    amount: result.amount || 0,
                    note: result.note || text,
                    categoryCode: result.categoryCode || categories[0]?.code || "misc",
                    subCategoryCode: result.subCategoryCode || undefined,
                    date: result.date || todayStr,
                    payment: {
                        type: extractedType,
                        methodId: matchedMethodId,
                        cardName: result.payment?.cardName || undefined,
                    },
                    comment: result.comment || undefined,
                    split: result.split || undefined,
                    // UI-only enrichment metadata
                    _newPaymentMethod: result.newPaymentMethod || null,
                    _newSubCategoryName: result.newSubCategoryName || null,
                    _correctedInput: result.correctedInput || null,
                };

                setMessages((m) => [
                    ...m,
                    { id: crypto.randomUUID(), role: "assistant", status: "pending", text: "Got it — is this right?", draft },
                ]);
            }
        } catch (err) {
            console.error(err);
            setMessages((m) => [
                ...m,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    status: "confirmed",
                    text: "Sorry, I ran into an error trying to process that entry. Please try again or log manually.",
                },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        send(input);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
            <header className="border-b-2 border-ink px-6 md:px-10 py-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">№ 001 — capture</div>
                <h1 className="mt-1 font-serif text-4xl md:text-5xl leading-[0.95] tracking-tight">
                    What did you <span className="italic">spend?</span>
                </h1>
            </header>

            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
                <div className="mx-auto max-w-2xl space-y-6">
                    {messages.map((m) =>
                        m.role === "user" ? (
                            <UserBubble key={m.id} text={m.text} />
                        ) : (
                            <AssistantBubble
                                key={m.id}
                                msg={m}
                                isEditing={editorOpen && editorMsgId === m.id}
                                onConfirm={() => confirm(m.id)}
                                onDiscard={() => discard(m.id)}
                                onEdit={() => m.draft && openEditor(m.id, m.draft)}
                            />
                        ),
                    )}
                    {loading && (
                        <div className="max-w-[90%] animate-pulse">
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute mb-1.5">
                                Voidentry
                            </div>
                            <div className="text-ink/60 text-sm font-mono italic">Thinking...</div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            <div className="border-t-2 border-ink bg-paper px-4 md:px-10 py-4">
                <div className="mx-auto max-w-2xl">
                    <form onSubmit={onSubmit} className="relative brutal-border brutal-shadow-sm bg-paper">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send(input);
                                }
                            }}
                            rows={1}
                            placeholder="type what you spent…"
                            className="block w-full resize-none bg-transparent px-4 py-3 pr-14 font-mono text-sm focus:outline-none min-h-[48px] max-h-40 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            aria-label="Send"
                            disabled={!input.trim() || loading}
                            className="absolute right-2 bottom-2 brutal-border bg-pink h-9 w-9 flex items-center justify-center disabled:opacity-40"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>

            <ExpenseDialog open={editorOpen} onClose={onEditorClose} initial={editorInitial} />
        </div>
    );
}
